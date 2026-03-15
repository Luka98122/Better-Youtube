const elements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments', 'isExtensionEnabled', 'disableHomeOverride'];

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

// 2. Generic Change Listener (Save to Storage)
document.addEventListener('change', (e) => {
  const id = e.target.id;
  const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  chrome.storage.local.set({ [id]: val });
  
  chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', id, val });
    });
  });
});

// 3. REAL-TIME Slider Logic
const slider = document.getElementById('blurRange');
slider.oninput = function() {
  const val = this.value;
  document.getElementById('blurValDisplay').innerText = val;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      // Send 'newBlur' to match your working version's expectations
      chrome.tabs.sendMessage(tabs[0].id, { newBlur: val });
    }
  });
};