const elements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments', 'isExtensionEnabled', 'disableHomeOverride'];

// Load saved settings
chrome.storage.local.get(elements, (result) => {
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === 'checkbox') {
      el.checked = result[id] !== undefined ? result[id] : (id === 'isExtensionEnabled');
    } else {
      el.value = result[id] || 20;
      if(id === 'blurRange') document.getElementById('blurValDisplay').innerText = el.value;
    }
  });
});

// Listener for all changes
document.addEventListener('change', (e) => {
  const id = e.target.id;
  const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  
  if(id === 'blurRange') document.getElementById('blurValDisplay').innerText = val;

  chrome.storage.local.set({ [id]: val });
  
  // Sync with active YouTube tabs
  chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', id, val });
    });
  });
});