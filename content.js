let blurIntensity = 20;
let isExtensionEnabled = true;

// 1. Initial Load
chrome.storage.local.get(['blurAmount', 'isExtensionEnabled'], (result) => {
  if (result.blurAmount !== undefined) blurIntensity = result.blurAmount;
  if (result.isExtensionEnabled !== undefined) isExtensionEnabled = result.isExtensionEnabled;
});

// 2. Listen for Popup Updates
chrome.runtime.onMessage.addListener((request) => {
  if (request.newBlur) {
    blurIntensity = request.newBlur;
    if (isExtensionEnabled) triggerBlurLogic(); 
  }
});

const applyBlur = (shouldBlur) => {
  const video = document.querySelector('video');
  if (!video) return;
  
  if (!isExtensionEnabled) {
    video.style.filter = 'none';
    return;
  }

  video.style.transition = 'filter 0.1s linear';
  video.style.filter = shouldBlur ? `blur(${blurIntensity}px)` : 'none';
};

const triggerBlurLogic = () => {
  applyBlur(document.hidden || !document.hasFocus());
};

document.addEventListener('visibilitychange', triggerBlurLogic);
window.addEventListener('blur', () => applyBlur(true));
window.addEventListener('focus', () => {
  clearTimeout(window.blurPreviewTimer);
  window.blurPreviewTimer = setTimeout(() => {
    if (!document.hidden && document.hasFocus()) applyBlur(false);
  }, 30); // 30ms is a safe buffer for tab-switching
});

// --- UI INJECTION ---

const injectToggleButton = () => {
  if (document.getElementById('custom-autoblur-btn')) return;

  const targetMenu = document.getElementById('top-level-buttons-computed');
  if (!targetMenu) return;

  const activeBg = '#e95420'; 
  const inactiveBg = 'var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1))'; 

  const btnContainer = document.createElement('div');
  btnContainer.id = 'custom-autoblur-btn';
  btnContainer.style.marginRight = '8px'; 
  
  btnContainer.innerHTML = `
    <button id="autoblur-toggle-btn" class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m" 
      style="border-radius: 18px; padding: 0 16px; height: 36px; border: none; cursor: pointer; 
      background-color: ${isExtensionEnabled ? activeBg : inactiveBg}; 
      color: #fff; font-family: 'Roboto', sans-serif; font-size: 14px; font-weight: 500; 
      transition: background-color 0.2s ease;">
      <span id="autoblur-btn-text">Blur: ${isExtensionEnabled ? 'ON' : 'OFF'}</span>
    </button>
  `;

  targetMenu.insertBefore(btnContainer, targetMenu.firstChild);

  const btnElement = btnContainer.querySelector('#autoblur-toggle-btn');
  const textElement = btnContainer.querySelector('#autoblur-btn-text');

  btnElement.addEventListener('click', () => {
    isExtensionEnabled = !isExtensionEnabled;
    
    textElement.innerText = `Blur: ${isExtensionEnabled ? 'ON' : 'OFF'}`;
    btnElement.style.backgroundColor = isExtensionEnabled ? activeBg : inactiveBg;
    
    // Fixed: Ensure this is on its own line
    chrome.storage.local.set({ isExtensionEnabled });
    
    triggerBlurLogic();
  });
};

const observer = new MutationObserver(() => {
  if (document.getElementById('top-level-buttons-computed')) {
    injectToggleButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });