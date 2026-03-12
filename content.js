let blurIntensity = 20;
let isExtensionEnabled = true; // State for our new toggle

// Load from local storage
chrome.storage.local.get(['blurAmount', 'isExtensionEnabled'], (result) => {
  if (result.blurAmount !== undefined) blurIntensity = result.blurAmount;
  if (result.isExtensionEnabled !== undefined) isExtensionEnabled = result.isExtensionEnabled;
});

// Listen for slider changes
chrome.runtime.onMessage.addListener((request) => {
  if (request.newBlur) {
    blurIntensity = request.newBlur;
    if (isExtensionEnabled) triggerBlurLogic(); 
  }
});

const applyBlur = (shouldBlur) => {
  const video = document.querySelector('video');
  if (!video) return;
  
  // If the user toggled the master switch off, force unblur
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

// Event Listeners for tab focus
document.addEventListener('visibilitychange', triggerBlurLogic);
window.addEventListener('blur', () => applyBlur(true));
window.addEventListener('focus', () => {
  clearTimeout(window.blurPreviewTimer);
  window.blurPreviewTimer = setTimeout(() => {
    if (!document.hidden && document.hasFocus()) applyBlur(false);
  }, 1000);
});

// --- UI INJECTION LOGIC ---

const injectToggleButton = () => {
  // Check if we already injected it to avoid duplicates
  if (document.getElementById('custom-autoblur-btn')) return;

  const targetMenu = document.getElementById('top-level-buttons-computed');
  if (!targetMenu) return;

  // Define our states
  const activeBg = '#e95420'; // Sleek orange
  const activeText = '#ffffff';
  const inactiveBg = 'var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1))'; // Default YouTube gray
  const inactiveText = 'var(--yt-spec-text-primary, #fff)';

  const currentBg = isExtensionEnabled ? activeBg : inactiveBg;
  const currentColor = isExtensionEnabled ? activeText : inactiveText;

  const btnContainer = document.createElement('div');
  btnContainer.id = 'custom-autoblur-btn';
  btnContainer.style.marginRight = '8px'; 
  
  // Create the button with a transition for smooth color changes
  btnContainer.innerHTML = `
    <button id="autoblur-toggle-btn" class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m" style="border-radius: 18px; padding: 0 16px; height: 36px; border: none; cursor: pointer; background-color: ${currentBg}; color: ${currentColor}; font-family: 'Roboto', 'Arial', sans-serif; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease, color 0.2s ease;">
      <span id="autoblur-btn-text">Blur: ${isExtensionEnabled ? 'ON' : 'OFF'}</span>
    </button>
  `;

  // Insert it as the very first item (to the left of the Like button)
  targetMenu.insertBefore(btnContainer, targetMenu.firstChild);

  const btnElement = btnContainer.querySelector('#autoblur-toggle-btn');
  const textElement = btnContainer.querySelector('#autoblur-btn-text');

  // Add click logic
  btnElement.addEventListener('click', () => {
    isExtensionEnabled = !isExtensionEnabled;
    
    // Update text
    textElement.innerText = `Blur: ${isExtensionEnabled ? 'ON' : 'OFF'}`;
    
    // Update colors smoothly
    btnElement.style.backgroundColor = isExtensionEnabled ? activeBg : inactiveBg;
    btnElement.style.color = isExtensionEnabled ? activeText : inactiveText;
    
    // Save state
    chrome.storage.local.set({ isExtensionEnabled });
    
    // Immediately apply the new state
    triggerBlurLogic();
  });
};

// YouTube changes the DOM constantly. Watch the body for changes.
const observer = new MutationObserver(() => {
  if (document.getElementById('top-level-buttons-computed')) {
    injectToggleButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });