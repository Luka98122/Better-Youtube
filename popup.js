const elements = ['blurRange', 'hideHome', 'hideSidebar', 'swapComments'];
const state = {};

// Load saved settings
chrome.storage.local.get(elements, (result) => {
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el.type === 'checkbox') {
      el.checked = result[id] || false;
    } else {
      el.value = result[id] || 20;
      document.getElementById('val').innerText = el.value;
    }
    state[id] = result[id];
  });
});

// Generic change listener
document.addEventListener('change', (e) => {
  const id = e.target.id;
  const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  
  if(id === 'blurRange') document.getElementById('val').innerText = val;

  chrome.storage.local.set({ [id]: val });
  
  // Notify the tab immediately
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_SETTINGS', id, val });
    }
  });
});