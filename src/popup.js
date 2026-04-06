// Tab Navigation Logic
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
});

const checkboxElements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments', 'isBlurActive', 'disableHomeOverride', 'blackAndWhite', 'blurCaptions', 'hideShorts', 'redirectShorts', 'customFeed', 'showNormalFeed'];
const allElements = [...checkboxElements, 'customFeeds', 'activeFeedId', 'customFeedWhitelist', 'customFeedChannels', 'customFeedBlacklist', 'customFeedBlacklistChannels'];

let customFeeds = [];
let activeFeedId = null;

// 1. Initial Load
chrome.storage.local.get(allElements, (res) => {
  checkboxElements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = res[id] !== undefined ? res[id] : (id === 'isBlurActive');
    } else {
      el.value = res[id] || 20;
      if (id === 'blurRange') document.getElementById('blurValDisplay').innerText = el.value;
    }
  });

  if (!res.customFeeds) {
    customFeeds = [{
      id: 'default',
      name: 'Main Feed',
      whitelist: res.customFeedWhitelist || '',
      channels: res.customFeedChannels || {}
    }];
    activeFeedId = 'default';
    chrome.storage.local.set({ customFeeds, activeFeedId });
  } else {
    customFeeds = res.customFeeds;
    activeFeedId = res.activeFeedId || customFeeds[0].id;
  }

  renderFeedSelector();
  loadFeedData();
});

function renderFeedSelector() {
  const sel = document.getElementById('feedSelector');
  if (!sel) return;
  sel.innerHTML = '';
  customFeeds.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    if (f.id === activeFeedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function loadFeedData() {
  const feed = customFeeds.find(f => f.id === activeFeedId);
  const el = document.getElementById('customFeedWhitelist');
  if (el) el.value = feed ? feed.whitelist : '';
  updateStatusDisplay('whitelistStatus', feed ? feed.channels : {});
}

function updateStatusDisplay(statusId, channelsObj) {
  const statusEl = document.getElementById(statusId);
  if (!statusEl) return;
  if (channelsObj && Object.keys(channelsObj).length > 0) {
    const count = Object.keys(channelsObj).length;
    statusEl.textContent = `✓ ${count} channel${count > 1 ? 's' : ''} resolved`;
    statusEl.className = 'status-msg success';
  } else {
    statusEl.textContent = '';
    statusEl.className = 'status-msg';
  }
}

// 2. Checkbox Listeners
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (e.target.type === 'checkbox') {
    const val = e.target.checked;
    chrome.storage.local.set({ [id]: val });
  }
});

// 3. Blur Slider
const slider = document.getElementById('blurRange');
if (slider) {
  slider.oninput = function () {
    const val = this.value;
    document.getElementById('blurValDisplay').innerText = val;
    chrome.storage.local.set({ blurRange: val });
  };
}

// 4. Multiple Feeds & Textarea Listeners
document.getElementById('feedSelector')?.addEventListener('change', (e) => {
  activeFeedId = e.target.value;
  chrome.storage.local.set({ activeFeedId });
  loadFeedData();
  const el = document.getElementById('customFeedWhitelist');
  if (el) el.focus();
});

document.getElementById('addFeedBtn')?.addEventListener('click', () => {
  const name = prompt('Enter new feed name:');
  if (!name) return;
  const newFeed = {
    id: Date.now().toString(),
    name: name,
    whitelist: '',
    channels: {}
  };
  customFeeds.push(newFeed);
  activeFeedId = newFeed.id;
  chrome.storage.local.set({ customFeeds, activeFeedId });
  renderFeedSelector();
  loadFeedData();
});

document.getElementById('renameFeedBtn')?.addEventListener('click', () => {
  const feed = customFeeds.find(f => f.id === activeFeedId);
  if (!feed) return;
  const name = prompt('Enter new feed name:', feed.name);
  if (name && name !== feed.name) {
    feed.name = name;
    chrome.storage.local.set({ customFeeds });
    renderFeedSelector();
  }
});

document.getElementById('deleteFeedBtn')?.addEventListener('click', () => {
  if (customFeeds.length <= 1) {
    alert("You cannot delete the last feed.");
    return;
  }
  if (!confirm('Delete this feed?')) return;
  customFeeds = customFeeds.filter(f => f.id !== activeFeedId);
  activeFeedId = customFeeds[0].id;
  chrome.storage.local.set({ customFeeds, activeFeedId });
  renderFeedSelector();
  loadFeedData();
});

let debounceTimer = null;
const whitelistArea = document.getElementById('customFeedWhitelist');

if (whitelistArea) {
  whitelistArea.addEventListener('input', () => {
    const feedIndex = customFeeds.findIndex(f => f.id === activeFeedId);
    if (feedIndex === -1) return;

    customFeeds[feedIndex].whitelist = whitelistArea.value;
    chrome.storage.local.set({ customFeeds });

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      resolveAndSaveFeed(whitelistArea.value, feedIndex);
    }, 800);
  });
}

function resolveAndSaveFeed(text, feedIndex) {
  const statusEl = document.getElementById('whitelistStatus');
  const handles = text.split('\n').map(h => h.trim()).filter(h => h.length > 0);

  if (handles.length === 0) {
    customFeeds[feedIndex].channels = {};
    chrome.storage.local.set({ customFeeds });
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'status-msg';
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = `⏳ Resolving ${handles.length} channel${handles.length > 1 ? 's' : ''}...`;
    statusEl.className = 'status-msg resolving';
  }

  chrome.runtime.sendMessage({ type: 'resolveChannels', handles }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      if (statusEl) {
        statusEl.textContent = '✗ Failed to resolve channels';
        statusEl.className = 'status-msg error';
      }
      return;
    }

    const resolved = response.channels;

    if (customFeeds[feedIndex]) {
      customFeeds[feedIndex].channels = resolved;
      chrome.storage.local.set({ customFeeds });
    }

    if (statusEl) {
      const total = handles.length;
      const found = Object.keys(resolved).length;
      const failed = total - found;
      if (failed > 0) {
        statusEl.textContent = `✓ ${found}/${total} resolved (${failed} not found)`;
        statusEl.className = 'status-msg resolving';
      } else {
        statusEl.textContent = `✓ ${found} channel${found > 1 ? 's' : ''} resolved`;
        statusEl.className = 'status-msg success';
      }
    }
  });
}

// --- DEBUG TOOLS & SECRET ACTIVATION ---
let clickCount = 0;
let clickTimer = null;

const title = document.querySelector('h3');
if (title) {
  title.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);

    if (clickCount >= 5) {
      const debugBtn = document.getElementById('debugTabBtn');
      if (debugBtn) {
        debugBtn.style.display = 'block';
        debugBtn.click(); // Automatically switch to it
      }
      clickCount = 0;
    } else {
      clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    }
  });
}

// Export State
document.getElementById('exportSettings').addEventListener('click', () => {
  chrome.storage.local.get(null, (allData) => {
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `better-youtube-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Import State
document.getElementById('importSettings').addEventListener('click', () => {
  const text = document.getElementById('importText').value;
  try {
    const data = JSON.parse(text);
    chrome.storage.local.set(data, () => {
      alert('State imported successfully! Reloading...');
      window.location.reload();
    });
  } catch (e) {
    alert('Invalid JSON! Please check the format.');
  }
});

// Reset State
document.getElementById('resetSettings').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset ALL settings? This cannot be undone.')) {
    chrome.storage.local.clear(() => {
      alert('Settings reset! Reloading...');
      window.location.reload();
    });
  }
});

// Self-Close & Focus logic
function checkFocus() {
  if (!document.hasFocus()) window.close();
  else requestAnimationFrame(checkFocus);
}
setTimeout(() => requestAnimationFrame(checkFocus), 200);