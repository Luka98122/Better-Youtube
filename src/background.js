// Background Service Worker for Better YouTube
// Handles cross-origin fetches for channel resolution and RSS feed parsing

const FEED_CACHE_KEY = 'feedCache';
const FEED_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CONCURRENT_FETCHES = 5;

// --- Channel Resolution ---
// Given a handle like "@mrbeast", fetches the channel page and extracts the channel ID.
async function resolveChannelHandle(handle) {
  // Clean up the input
  handle = handle.trim();
  if (!handle) return null;

  // Already a channel ID
  if (handle.startsWith('UC') && handle.length === 24) return handle;

  // Ensure it starts with @
  if (!handle.startsWith('@') && !handle.startsWith('http')) {
    handle = '@' + handle;
  }

  // Build the URL
  let url;
  if (handle.startsWith('http')) {
    url = handle;
  } else if (handle.startsWith('UC') && handle.length === 24) {
    url = `https://www.youtube.com/channel/${handle}`;
  } else {
    url = `https://www.youtube.com/${handle}`;
  }

  try {
    const resp = await fetch(url, { credentials: 'omit' });
    if (!resp.ok) return null;
    const html = await resp.text();

    let match = html.match(/<meta\s+property="og:url"\s+content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (!match) match = html.match(/<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (!match) match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
    if (!match) match = html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);

    if (!match) return null;
    const id = match[1];

    const avatarMatch = html.match(/<meta property="og:image"\s+content="([^"]+)"/);
    const avatar = avatarMatch ? avatarMatch[1] : '';

    const verified = html.includes('"iconType":"CHECK_CIRCLE_THICK"');

    return { id, avatar, verified };
  } catch (e) {
    console.warn('[BetterYT] Failed to resolve channel:', handle, e);
    return null;
  }
}

// Resolve multiple handles, returning a map of handle -> channelId
async function resolveChannels(handles) {
  const results = {};
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < handles.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = handles.slice(i, i + MAX_CONCURRENT_FETCHES);
    const promises = batch.map(async (handle) => {
      const data = await resolveChannelHandle(handle);
      if (data) results[handle.trim()] = data;
    });
    await Promise.all(promises);
  }
  return results;
}

// --- RSS Feed Fetching ---
// Fetches and parses a single channel's RSS feed
async function fetchChannelFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const resp = await fetch(url, { credentials: 'omit' });
    if (!resp.ok) return [];
    const xml = await resp.text();
    return parseRSSFeed(xml, channelId);
  } catch (e) {
    console.warn('[BetterYT] Failed to fetch feed for:', channelId, e);
    return [];
  }
}

// Parse YouTube RSS XML into video entries
function parseRSSFeed(xml, channelId) {
  const entries = [];

  // Extract channel name
  const channelNameMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/);
  const channelName = channelNameMatch ? channelNameMatch[1] : 'Unknown';

  // Extract each entry
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entry = entryMatch[1];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const thumbMatch = entry.match(/<media:thumbnail\s+url="([^"]+)"/);
    const viewsMatch = entry.match(/<media:statistics\s+views="(\d+)"/);
    const linkMatch = entry.match(/<link\s+rel="alternate"\s+href="([^"]+)"/);

    // Skip Shorts
    if (linkMatch && linkMatch[1].includes('/shorts/')) continue;

    if (videoIdMatch && titleMatch) {
      entries.push({
        videoId: videoIdMatch[1],
        title: decodeXMLEntities(titleMatch[1]),
        channelName: decodeXMLEntities(channelName),
        channelId: channelId,
        published: publishedMatch ? publishedMatch[1] : '',
        thumbnail: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
        views: viewsMatch ? parseInt(viewsMatch[1], 10) : 0
      });
    }
  }

  return entries;
}

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function decodeXMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Fetch feeds for multiple channels with caching
async function fetchFeeds(channelIds, blacklistIds) {
  // Check cache first
  const now = Date.now();
  let cached = null;
  try {
    const storage = await chrome.storage.local.get(FEED_CACHE_KEY);
    cached = storage[FEED_CACHE_KEY];
  } catch (e) { /* no cache */ }

  // Build a cache key from the sorted channel IDs
  const cacheKey = channelIds.sort().join(',');

  if (cached && cached.key === cacheKey && (now - cached.timestamp) < FEED_CACHE_TTL) {
    // Filter out blacklisted channels from cached results
    let videos = cached.videos;
    if (blacklistIds && blacklistIds.length > 0) {
      const blackSet = new Set(blacklistIds);
      videos = videos.filter(v => !blackSet.has(v.channelId));
    }
    return shuffleArray(videos);
  }

  // Fetch all feeds in batches
  const allVideos = [];
  for (let i = 0; i < channelIds.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = channelIds.slice(i, i + MAX_CONCURRENT_FETCHES);
    const results = await Promise.all(batch.map(id => fetchChannelFeed(id)));
    results.forEach(videos => allVideos.push(...videos));
  }

  // Sort by published date (newest first)
  allVideos.sort((a, b) => new Date(b.published) - new Date(a.published));

  // Cache the results (before blacklist filtering, so cache is reusable)
  try {
    await chrome.storage.local.set({
      [FEED_CACHE_KEY]: {
        key: cacheKey,
        timestamp: now,
        videos: allVideos
      }
    });
  } catch (e) { /* cache write failed, that's ok */ }

  // Filter out blacklisted channels
  let filtered = allVideos;
  if (blacklistIds && blacklistIds.length > 0) {
    const blackSet = new Set(blacklistIds);
    filtered = allVideos.filter(v => !blackSet.has(v.channelId));
  }

  return shuffleArray(filtered);
}

// --- Message Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'resolveChannels') {
    resolveChannels(message.handles)
      .then(result => sendResponse({ success: true, channels: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'fetchFeed') {
    fetchFeeds(message.channelIds, message.blacklistIds)
      .then(videos => sendResponse({ success: true, videos }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'clearFeedCache') {
    chrome.storage.local.remove(FEED_CACHE_KEY)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
