const elements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments', 'isExtensionEnabled', 'disableHomeOverride', 'blackAndWhite', 'blurCaptions'];

// 1. Initial Load
chrome.storage.local.get(elements, (res) => {
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = res[id] !== undefined ? res[id] : (id === 'isExtensionEnabled');
    } else {
      el.value = res[id] || 20;
      if (id === 'blurRange') document.getElementById('blurValDisplay').innerText = el.value;
    }
  });
});

// 2. The Robust Sender Function
function sendMessageToYouTube(message) {
  // We remove the 'active: true' requirement because the popup is currently the active window!
  chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      console.warn("No YouTube tabs found to message.");
      return;
    }
    tabs.forEach(tab => {
      //chrome.tabs.sendMessage(tab.id, message).catch(err => console.log("Tab " + tab.id + " error: " + err.message));
    });
  });
}

// 3. Listeners
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (e.target.type === 'checkbox') {
    const val = e.target.checked;
    chrome.storage.local.set({ [id]: val });
    sendMessageToYouTube({ type: 'UPDATE_SETTINGS', id, val });
  }
});

const slider = document.getElementById('blurRange');
if (slider) {
  slider.oninput = function () {
    const val = this.value;
    document.getElementById('blurValDisplay').innerText = val;
    chrome.storage.local.set({ blurRange: val });
    sendMessageToYouTube({ newBlur: val });
  };
}

// Self-Close & Focus logic (Keep yours as is)
function checkFocus() {
  if (!document.hasFocus()) window.close();
  else requestAnimationFrame(checkFocus);
}
setTimeout(() => requestAnimationFrame(checkFocus), 200);