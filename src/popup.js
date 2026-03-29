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

const checkboxElements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments', 'isExtensionEnabled', 'disableHomeOverride', 'blackAndWhite', 'blurCaptions', 'hideShorts', 'redirectShorts', 'customFeed', 'showNormalFeed'];
const textareaElements = ['customFeedWhitelist', 'customFeedBlacklist'];
const allElements = [...checkboxElements, ...textareaElements, 'customFeedChannels', 'customFeedBlacklistChannels'];

// 1. Initial Load
chrome.storage.local.get(allElements, (res) => {
  checkboxElements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = res[id] !== undefined ? res[id] : (id === 'isExtensionEnabled');
    } else {
      el.value = res[id] || 20;
      if (id === 'blurRange') document.getElementById('blurValDisplay').innerText = el.value;
    }
  });

  // Load textareas
  textareaElements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = res[id] || '';
  });

  // Show resolved channel counts
  updateStatusDisplay('whitelistStatus', res.customFeedChannels);
  updateStatusDisplay('blacklistStatus', res.customFeedBlacklistChannels);
});

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

// 4. Textarea Listeners (with debounce + channel resolution)
let debounceTimers = {};

function setupTextarea(textareaId, storageKey, channelsKey, statusId) {
  const el = document.getElementById(textareaId);
  if (!el) return;

  el.addEventListener('input', () => {
    // Save raw text immediately
    chrome.storage.local.set({ [storageKey]: el.value });

    // Debounce the channel resolution
    clearTimeout(debounceTimers[textareaId]);
    debounceTimers[textareaId] = setTimeout(() => {
      resolveAndSave(el.value, channelsKey, statusId);
    }, 800);
  });
}

function resolveAndSave(text, channelsKey, statusId) {
  const statusEl = document.getElementById(statusId);
  const handles = text
    .split('\n')
    .map(h => h.trim())
    .filter(h => h.length > 0);

  if (handles.length === 0) {
    chrome.storage.local.set({ [channelsKey]: {} });
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
    chrome.storage.local.set({ [channelsKey]: resolved });

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

setupTextarea('customFeedWhitelist', 'customFeedWhitelist', 'customFeedChannels', 'whitelistStatus');
setupTextarea('customFeedBlacklist', 'customFeedBlacklist', 'customFeedBlacklistChannels', 'blacklistStatus');

// Self-Close & Focus logic
function checkFocus() {
  if (!document.hasFocus()) window.close();
  else requestAnimationFrame(checkFocus);
}
setTimeout(() => requestAnimationFrame(checkFocus), 200);