const Features = {
  updateBlur: (settings) => {
    const video = document.querySelector('video');
    const captions = document.querySelector('.ytp-caption-window-container');
    if (!video) return;

    const isHidden = document.hidden || !document.hasFocus();
    const shouldBlur = isHidden && settings.isBlurActive && settings.blurRange > 0;

    let filters = [];
    if (shouldBlur) filters.push(`blur(${settings.blurRange}px)`);
    if (settings.blackAndWhite) filters.push('grayscale(100%)');
    const filterVal = filters.length > 0 ? filters.join(' ') : 'none';

    if (video.style.filter !== filterVal) {
      video.style.transition = 'filter 0.1s linear';
      video.style.filter = filterVal;
    }

    if (captions) {
      let capFilters = [];
      if (shouldBlur && settings.blurCaptions) capFilters.push(`blur(${settings.blurRange}px)`);
      if (settings.blackAndWhite && settings.blurCaptions) capFilters.push('grayscale(100%)');
      const capFilterVal = capFilters.length > 0 ? capFilters.join(' ') : 'none';
      if (captions.style.filter !== capFilterVal) {
        captions.style.transition = 'filter 0.1s linear';
        captions.style.filter = capFilterVal;
      }
    }
  },

  updateHomeBlocker: (settings, isOverrideActive, onOverrideClick) => {
    document.body.classList.toggle('hide-home-active', !!settings.hideHome && !isOverrideActive);

    const homeBrowse = document.querySelector('ytd-browse[page-subtype="home"]');
    const messageId = 'custom-focus-message';

    if (settings.hideHome && !isOverrideActive) {
      if (homeBrowse && !document.getElementById(messageId)) {
        let messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.innerHTML = `
          <h1>Do you really need to be on here?</h1>
          <p>Focus on what matters. Your home feed is disabled.</p>
        `;
        homeBrowse.prepend(messageDiv);
      }
      const existingMsg = document.getElementById(messageId);
      if (existingMsg) {
        existingMsg.style.display = 'flex';
        // Live-update the override button based on current setting
        const existingBtn = existingMsg.querySelector('#temp-show-feed');
        if (settings.disableHomeOverride && existingBtn) {
          existingBtn.remove();
        } else if (!settings.disableHomeOverride && !existingBtn) {
          const btn = document.createElement('button');
          btn.id = 'temp-show-feed';
          btn.textContent = 'Show feed anyway (1 minute)';
          btn.onclick = onOverrideClick;
          existingMsg.appendChild(btn);
        }
      }
    } else {
      const existingMsg = document.getElementById(messageId);
      if (existingMsg) existingMsg.style.display = 'none';
    }
  },

  updateShorts: (settings) => {
    // 1. Hide shorts 
    const isHideShorts = !!settings.hideShorts;
    if (document.body.classList.contains('hide-shorts-active') !== isHideShorts) {
      document.body.classList.toggle('hide-shorts-active', isHideShorts);
      window.dispatchEvent(new Event('resize'));
    }

    // 2. Redirect shorts
    if (settings.redirectShorts && window.location.pathname.startsWith('/shorts/')) {
      const parts = window.location.pathname.split('/shorts/');
      if (parts.length > 1) {
        const videoId = parts[1];
        if (videoId) {
          window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
        }
      }
    }
  },

  updateLayout: (settings) => {
    let layoutChanged = false;

    // Determine visibility safely via CSS classes
    const actualHideSidebar = settings.hideSidebar && !settings.swapComments;

    if (document.body.classList.contains('hide-sidebar-active') !== !!actualHideSidebar) {
      document.body.classList.toggle('hide-sidebar-active', !!actualHideSidebar);
      layoutChanged = true;
    }
    if (document.body.classList.contains('hide-recs') !== !!settings.hideSidebar) {
      document.body.classList.toggle('hide-recs', !!settings.hideSidebar);
      layoutChanged = true;
    }
    if (document.body.classList.contains('yt-custom-layout') !== !!settings.swapComments) {
      document.body.classList.toggle('yt-custom-layout', !!settings.swapComments);
      layoutChanged = true;
    }

    const isWatchPage = window.location.href.includes('watch');
    const shouldHideRecsShorts = isWatchPage && !!settings.swapComments;
    if (document.body.classList.contains('hide-recs-shorts') !== shouldHideRecsShorts) {
      document.body.classList.toggle('hide-recs-shorts', shouldHideRecsShorts);
    }

    if (isWatchPage) {
      const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
      const secondaryInner = document.querySelector('#secondary-inner');
      const comments = document.querySelector('#comments');
      const primaryInner = document.querySelector('#primary-inner');

      if (settings.swapComments) {
        if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
          let placeholder = document.getElementById('comments-placeholder');
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'comments-placeholder';
            placeholder.style.display = 'none';
            // Only insert placeholder if not already there, to avoid duplicates
            if (comments.parentNode) comments.parentNode.insertBefore(placeholder, comments);
          }
          secondaryInner.prepend(comments);
          comments.style.display = 'block';
          layoutChanged = true;
        }
        if (!settings.hideSidebar && sidebarRecs && primaryInner && sidebarRecs.parentNode !== primaryInner) {
          let placeholder = document.getElementById('sidebar-recs-placeholder');
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'sidebar-recs-placeholder';
            placeholder.style.display = 'none';
            if (sidebarRecs.parentNode) sidebarRecs.parentNode.insertBefore(placeholder, sidebarRecs);
          }
          primaryInner.appendChild(sidebarRecs);
          layoutChanged = true;
        }
      } else {
        if (comments && primaryInner && comments.parentNode === secondaryInner) {
          const placeholder = document.getElementById('comments-placeholder');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(comments, placeholder);
            // Don't remove the placeholder, keep it in DOM for the next time!
          } else {
            const below = document.querySelector('#below');
            if (below) {
              below.appendChild(comments);
            } else {
              primaryInner.appendChild(comments);
            }
          }
          layoutChanged = true;
        }
        if (sidebarRecs && secondaryInner && sidebarRecs.parentNode === primaryInner) {
          const placeholder = document.getElementById('sidebar-recs-placeholder');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(sidebarRecs, placeholder);
            // Don't remove the placeholder, keep it in DOM for the next time!
          } else {
            secondaryInner.appendChild(sidebarRecs);
          }
          layoutChanged = true;
        }
      }

      // Force YouTube's app to recalculate player size since we changed the physical layout containers
      if (layoutChanged) {
        window.dispatchEvent(new Event('resize'));
        // Sometimes YouTube's internal debouncing needs a slight delay
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      }
    }
  },

  injectToggleButton: (settings, onToggle) => {
    const btnId = 'custom-autoblur-btn';
    const activeBg = '#e95420';
    const inactiveBg = 'rgba(255, 255, 255, 0.1)';

    const existingBtn = document.getElementById('autoblur-toggle-btn');
    if (existingBtn) {
      existingBtn.style.backgroundColor = settings.isBlurActive ? activeBg : inactiveBg;
      existingBtn.innerText = `Blur: ${settings.isBlurActive ? 'ON' : 'OFF'}`;
      return;
    }

    const targetMenu = document.getElementById('top-level-buttons-computed');
    if (!targetMenu) return;

    const btnContainer = document.createElement('div');
    btnContainer.id = btnId;
    btnContainer.style.marginRight = '8px';
    btnContainer.innerHTML = `
      <button id="autoblur-toggle-btn" class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal" 
        style="border-radius: 18px; padding: 0 16px; height: 36px; border: none; cursor: pointer; color: #fff; font-family: 'Roboto', sans-serif; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease;">
        Blur: ${settings.isBlurActive ? 'ON' : 'OFF'}
      </button>
    `;
    btnContainer.querySelector('#autoblur-toggle-btn').onclick = onToggle;
    targetMenu.prepend(btnContainer);
  },

  // --- Custom Home Feed ---
  _customFeedState: {
    isLoading: false,
    lastFetchKey: null,
    renderedKey: null
  },

  updateCustomFeed: (settings) => {
    const homeBrowse = document.querySelector('ytd-browse[page-subtype="home"]');
    const feedContainerId = 'custom-feed-container';
    const existingContainer = document.getElementById(feedContainerId);

    // Should the custom feed be active?
    const shouldBeActive = !settings.hideHome && !!settings.customFeed && homeBrowse;

    // Manage default grid display
    if (homeBrowse) {
      const defaultGrid = homeBrowse.querySelector('ytd-rich-grid-renderer');
      if (defaultGrid) {
        if (!shouldBeActive) {
          defaultGrid.style.display = '';
          defaultGrid.style.marginTop = '';
          defaultGrid.style.borderTop = '';
          defaultGrid.style.paddingTop = '';
        } else {
          defaultGrid.style.display = settings.showNormalFeed ? '' : 'none';
          if (settings.showNormalFeed) {
            defaultGrid.style.marginTop = '40px';
            defaultGrid.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
            defaultGrid.style.paddingTop = '40px';
          } else {
            defaultGrid.style.marginTop = '';
            defaultGrid.style.borderTop = '';
            defaultGrid.style.paddingTop = '';
          }
        }
      }
    }

    // If not active, clean up and bail
    if (!shouldBeActive) {
      if (existingContainer) existingContainer.remove();
      Features._customFeedState.renderedKey = null;
      return;
    }

    // We need channels to show
    const channels = settings.customFeedChannels;
    if (!channels || Object.keys(channels).length === 0) {
      // Show empty state
      if (!existingContainer) {
        const container = document.createElement('div');
        container.id = feedContainerId;
        container.innerHTML = `
          <div class="custom-feed-empty">
            <div class="custom-feed-empty-icon">📺</div>
            <h2>Your Curated Feed</h2>
            <p style="margin-bottom: 24px;">Your feed is currently empty. Add channel handles below to start seeing their latest videos.</p>
            
            <div class="custom-feed-inline-form">
              <label>Channels (one per line, e.g. @3blue1brown)</label>
              <textarea id="in-page-channel-input" rows="4" placeholder="@3blue1brown&#10;@veritasium"></textarea>
              <div class="form-actions">
                <span id="in-page-status"></span>
                <button id="in-page-save-btn">Save Channels</button>
              </div>
            </div>
          </div>
        `;
        homeBrowse.prepend(container);

        const saveBtn = document.getElementById('in-page-save-btn');
        const inputArea = document.getElementById('in-page-channel-input');
        const statusMsg = document.getElementById('in-page-status');

        if (saveBtn && inputArea && statusMsg) {
          saveBtn.addEventListener('click', () => {
            const text = inputArea.value;
            const handles = text.split('\n').map(h => h.trim()).filter(h => h.length > 0);

            if (handles.length === 0) {
              statusMsg.textContent = 'Please enter at least one channel handle.';
              statusMsg.style.color = '#d9534f';
              return;
            }

            saveBtn.disabled = true;
            statusMsg.textContent = 'Resolving channels...';
            statusMsg.style.color = '#f0ad4e';

            // Resolve handles via background service worker
            if (!chrome.runtime || !chrome.runtime.sendMessage) {
              statusMsg.textContent = 'Extension updated. Please refresh the page.';
              statusMsg.style.color = '#d9534f';
              saveBtn.disabled = false;
              return;
            }

            chrome.runtime.sendMessage({ type: 'resolveChannels', handles }, (response) => {
              if (chrome.runtime.lastError || !response || !response.success) {
                statusMsg.textContent = 'Failed to connect. Try again.';
                statusMsg.style.color = '#d9534f';
                saveBtn.disabled = false;
                return;
              }

              const resolved = response.channels;
              const foundCount = Object.keys(resolved).length;

              if (foundCount === 0) {
                statusMsg.textContent = 'None of the channels were found. Check spelling.';
                statusMsg.style.color = '#d9534f';
                saveBtn.disabled = false;
                return;
              }

              // Update storage with the raw text and resolved IDs
              // The storage listener in content.js will automatically trigger a re-render
              chrome.storage.local.set({
                customFeedWhitelist: text,
                customFeedChannels: resolved
              }, () => {
                statusMsg.textContent = `Added ${foundCount} channels. Loading feed...`;
                statusMsg.style.color = '#5cb85c';
              });
            });
          });
        }
      }
      return;
    }

    // Build a fetch key based on channels + blacklist
    const whitelistIds = [];
    const idToChannel = {};
    for (const val of Object.values(channels)) {
      if (typeof val === 'string') {
        whitelistIds.push(val);
        idToChannel[val] = { id: val, avatar: '', verified: false };
      } else {
        whitelistIds.push(val.id);
        idToChannel[val.id] = val;
      }
    }
    const blacklistChannels = settings.customFeedBlacklistChannels || {};
    const blacklistIds = Object.values(blacklistChannels).map(b => typeof b === 'string' ? b : b.id);
    const fetchKey = whitelistIds.join(',') + '|' + blacklistIds.join(',');

    // Don't re-fetch if we already rendered this exact config
    if (Features._customFeedState.renderedKey === fetchKey && existingContainer) return;

    // Don't start a new fetch if one is in progress for the same key
    if (Features._customFeedState.isLoading && Features._customFeedState.lastFetchKey === fetchKey) return;

    // Show loading state
    if (!existingContainer) {
      const container = document.createElement('div');
      container.id = feedContainerId;
      container.innerHTML = `
        <div class="custom-feed-loading">
          <div class="custom-feed-spinner"></div>
          <p>Loading your curated feed...</p>
        </div>
      `;
      homeBrowse.prepend(container);
    }

    // Fetch the feed
    Features._customFeedState.isLoading = true;
    Features._customFeedState.lastFetchKey = fetchKey;

    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      Features._customFeedState.isLoading = false;
      console.warn('[BetterYT] Extension context invalidated.');
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'fetchFeed', channelIds: whitelistIds, blacklistIds: blacklistIds },
      (response) => {
        Features._customFeedState.isLoading = false;

        if (chrome.runtime.lastError || !response || !response.success) {
          console.warn('[BetterYT] Feed fetch failed:', chrome.runtime.lastError || response?.error);
          const container = document.getElementById(feedContainerId);
          if (container) {
            container.innerHTML = `
              <div class="custom-feed-empty">
                <div class="custom-feed-empty-icon">⚠️</div>
                <h2>Feed Unavailable</h2>
                <p>Couldn't load your curated feed. Try refreshing the page.</p>
              </div>
            `;
          }
          return;
        }

        Features._customFeedState.renderedKey = fetchKey;
        const videos = response.videos;
        const container = document.getElementById(feedContainerId);
        if (!container) return;

        if (videos.length === 0) {
          container.innerHTML = `
            <div class="custom-feed-empty">
              <div class="custom-feed-empty-icon">📭</div>
              <h2>No Videos Found</h2>
              <p>The channels in your list haven't posted recently, or couldn't be reached.</p>
            </div>
          `;
          return;
        }

        // Render the video grid
        const header = `
          <div class="custom-feed-header">
            <h2>Your Feed</h2>
            <button id="custom-feed-refresh" title="Refresh feed">↻</button>
          </div>
        `;

        const cards = videos.map(v => {
          const channelInfo = idToChannel[v.channelId] || {};
          // Fallback to a placeholder avatar if the avatar wasn't resolved
          const avatarUrl = channelInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.channelName)}&background=random`;
          const verifiedBadge = channelInfo.verified ? `
            <svg class="custom-feed-verified" viewBox="0 0 24 24" fill="var(--yt-spec-text-secondary, #aaa)" width="14" height="14">
              <path d="M12,2C6.5,2,2,6.5,2,12c0,5.5,4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z M9.8,17.3l-4.2-4.1L7,11.8l2.8,2.7L17,7.4 l1.4,1.4L9.8,17.3z"></path>
            </svg>
          ` : '';

          return `
          <a href="/watch?v=${v.videoId}" class="custom-feed-card">
            <div class="custom-feed-thumbnail-wrap">
              <img class="custom-feed-thumbnail" src="${v.thumbnail}" alt="" loading="lazy">
            </div>
            <div class="custom-feed-info">
              <img class="custom-feed-avatar" src="${avatarUrl}" alt="">
              <div class="custom-feed-text-wrap">
                <h3 class="custom-feed-title">${escapeHTML(v.title)}</h3>
                <div class="custom-feed-channel-row">
                  <span class="custom-feed-channel">${escapeHTML(v.channelName)}</span>
                  ${verifiedBadge}
                </div>
                <div class="custom-feed-metadata">
                  ${v.views ? `<span class="custom-feed-views">${formatViews(v.views)} views</span>` : ''}
                  <span class="custom-feed-time">${timeAgo(v.published)}</span>
                </div>
              </div>
            </div>
          </a>
        `}).join('');

        const footerForm = `
          <div class="custom-feed-inline-form" style="margin-top: 40px; margin-bottom: 20px;">
            <label>Add More Channels (one per line, e.g. @3blue1brown)</label>
            <textarea id="in-page-list-channel-input" rows="3" placeholder="@newchannel"></textarea>
            <div class="form-actions">
              <span id="in-page-list-status"></span>
              <button id="in-page-list-save-btn">Add Channels</button>
            </div>
          </div>
        `;

        container.innerHTML = header + `<div class="custom-feed-grid">${cards}</div>` + footerForm;

        // Refresh button handler
        const refreshBtn = container.querySelector('#custom-feed-refresh');
        if (refreshBtn) {
          refreshBtn.onclick = (e) => {
            e.preventDefault();
            // Clear cache and re-fetch
            if (!chrome.runtime || !chrome.runtime.sendMessage) {
              alert('Extension updated. Please refresh the page.');
              return;
            }
            chrome.runtime.sendMessage({ type: 'clearFeedCache' }, () => {
              Features._customFeedState.renderedKey = null;
              Features._customFeedState.lastFetchKey = null;
              Features.updateCustomFeed(settings);
            });
          };
        }

        // Add more channels handler
        const addBtn = container.querySelector('#in-page-list-save-btn');
        const addInput = container.querySelector('#in-page-list-channel-input');
        const addStatus = container.querySelector('#in-page-list-status');

        if (addBtn && addInput && addStatus) {
          addBtn.addEventListener('click', () => {
            const newText = addInput.value;
            const handles = newText.split('\n').map(h => h.trim()).filter(h => h.length > 0);

            if (handles.length === 0) {
              addStatus.textContent = 'Please enter at least one channel handle.';
              addStatus.style.color = '#d9534f';
              return;
            }

            addBtn.disabled = true;
            addStatus.textContent = 'Resolving channels...';
            addStatus.style.color = '#f0ad4e';

            if (!chrome.runtime || !chrome.runtime.sendMessage) {
              addStatus.textContent = 'Extension updated. Please refresh the page.';
              addStatus.style.color = '#d9534f';
              addBtn.disabled = false;
              return;
            }

            chrome.runtime.sendMessage({ type: 'resolveChannels', handles }, (response) => {
              if (chrome.runtime.lastError || !response || !response.success) {
                addStatus.textContent = 'Failed to connect. Try again.';
                addStatus.style.color = '#d9534f';
                addBtn.disabled = false;
                return;
              }

              const resolved = response.channels;
              const foundCount = Object.keys(resolved).length;

              if (foundCount === 0) {
                addStatus.textContent = 'None of the channels were found. Check spelling.';
                addStatus.style.color = '#d9534f';
                addBtn.disabled = false;
                return;
              }

              // Merge with existing whitelist
              const existingWhitelistStr = settings.customFeedWhitelist || '';
              const existingChannelsObj = settings.customFeedChannels || {};

              const mergedText = (existingWhitelistStr + '\n' + newText).trim();
              const mergedResolved = Object.assign({}, existingChannelsObj, resolved);

              chrome.storage.local.set({
                customFeedWhitelist: mergedText,
                customFeedChannels: mergedResolved
              }, () => {
                addStatus.textContent = `Added ${foundCount} channels. Reloading...`;
                addStatus.style.color = '#5cb85c';
                // the content.js storage listener will automatically reload the feed
              });
            });
          });
        }
      }
    );
  }
};

// --- Utility Functions ---
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear >= 1) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth >= 1) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffWeek >= 1) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffDay >= 1) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHr >= 1) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffMin >= 1) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
}

function formatViews(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return Math.floor(num / 1_000) + 'K';
  return num.toString();
}