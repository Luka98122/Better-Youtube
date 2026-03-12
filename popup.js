const slider = document.getElementById('blurRange');
const valDisplay = document.getElementById('val');

// 1. Load from LOCAL instead of SYNC
chrome.storage.local.get(['blurAmount'], (result) => {
  const savedBlur = result.blurAmount || 20;
  slider.value = savedBlur;
  valDisplay.innerText = savedBlur;
});

// 2. LIVE UPDATE (No Quota Cost)
// Fires constantly as you slide
slider.oninput = function() {
  const value = this.value;
  valDisplay.innerText = value;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { newBlur: value }).catch(() => {});
    }
  });
};

// 3. SAVE TO STORAGE (Happens only once when you release the mouse)
slider.onchange = function() {
  chrome.storage.local.set({ blurAmount: this.value }, () => {
    console.log('Saved to local storage!');
  });
};