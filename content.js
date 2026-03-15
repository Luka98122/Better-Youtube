let settings = {};
let isApplying = false;
let isHomeOverrideActive = false;

// 1. Initial Load
chrome.storage.local.get(null, (res) => {
  settings = res;
  if (settings.blurRange === undefined) settings.blurRange = 20;
  if (settings.isExtensionEnabled === undefined) settings.isExtensionEnabled = true;
  applyAllFeatures();
});

// 2. The Message Listener (Unified for Real-time and Settings)
chrome.runtime.onMessage.addListener((msg) => {
  // Handle both the old "newBlur" key and the new "UPDATE_SETTINGS" key
  if (msg.newBlur !== undefined) {
    settings.blurRange = msg.newBlur;
    showBlurPreview();
  } else if (msg.type === 'UPDATE_SETTINGS') {
    settings[msg.id] = msg.val;
    if (msg.id === 'blurRange') {
      showBlurPreview();
    } else {
      applyAllFeatures();
    }
  }
});

// Helper to show the blur even if the tab is focused (for the slider)
function showBlurPreview() {
  const video = document.querySelector('video');
  if (video && settings.isExtensionEnabled) {
    video.style.filter = `blur(${settings.blurRange}px)`;
    clearTimeout(window.previewTimer);
    window.previewTimer = setTimeout(() => {
      isApplying = false;
      applyAllFeatures(); // Return to normal auto-blur logic
    }, 1000);
  }
}

// 3. The Feature Logic 
function applyAllFeatures() {
  if (isApplying || Object.keys(settings).length === 0) return; 
  isApplying = true;

  const video = document.querySelector('video');
  
  // 1. BLUR LOGIC
  const isHidden = document.hidden || !document.hasFocus();
  if (video) {
    const shouldBlur = isHidden && settings.isExtensionEnabled && settings.blurRange > 0;
    const blurVal = shouldBlur ? `blur(${settings.blurRange}px)` : 'none';
    if (video.style.filter !== blurVal) {
      video.style.transition = 'filter 0.1s linear';
      video.style.filter = blurVal;
    }
  }

  // 2. HIDE HOME FEED & SHOW MESSAGE
  const homeGrid = document.querySelector('ytd-rich-grid-renderer');
  const homeBrowse = document.querySelector('ytd-browse[page-subtype="home"]');
  const messageId = 'custom-focus-message';
  
  // Logic: Hide if the setting is ON AND we aren't in a temporary override
  if (settings.hideHome && !isHomeOverrideActive) {
    // Hide the actual video grid
    if (homeGrid && homeGrid.style.display !== 'none') {
      homeGrid.style.display = 'none';
    }
    
    // Inject or update the focus message
    if (homeBrowse) {
      let messageDiv = document.getElementById(messageId);
      
      if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.style.cssText = `
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 70vh; width: 100%; color: var(--yt-spec-text-primary);
          font-family: "Roboto", sans-serif; text-align: center;
        `;
        homeBrowse.prepend(messageDiv);
      }

      // Determine if the "Show Anyway" button should exist
      const overrideBtnHtml = settings.disableHomeOverride 
        ? '' 
        : `<button id="temp-show-feed" style="margin-top: 30px; background: rgba(255,255,255,0.05); border: 1px solid #444; color: #888; padding: 10px 20px; border-radius: 20px; cursor: pointer; transition: 0.2s;">Show feed anyway (1 minute)</button>`;

      messageDiv.innerHTML = `
        <h1 style="font-size: 32px; margin-bottom: 10px; opacity: 0.9;">Do you really need to be on here?</h1>
        <p style="font-size: 18px; opacity: 0.6;">Focus on what matters. Your home feed is disabled.</p>
        ${overrideBtnHtml}
      `;

      // Re-attach listener if the button was just created
      const btn = messageDiv.querySelector('#temp-show-feed');
      if (btn) {
        btn.onclick = () => {
          isHomeOverrideActive = true;
          isApplying = false; // Reset guard to allow immediate UI change
          applyAllFeatures();
          
          setTimeout(() => {
            isHomeOverrideActive = false;
            applyAllFeatures();
          }, 60000);
        };
        
        // Hover effect
        btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
        btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.05)';
      }
      
      messageDiv.style.display = 'flex';
    }
  } else {
    // Restore feed if override is active OR setting is OFF
    if (homeGrid && homeGrid.style.display === 'none') {
      homeGrid.style.display = '';
    }
    const existingMsg = document.getElementById(messageId);
    if (existingMsg) {
      existingMsg.style.display = 'none';
    }
  }

  // 3. HIDE SIDEBAR
  const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
  if (sidebarRecs) {
    const targetDisplay = settings.hideSidebar ? 'none' : '';
    if (sidebarRecs.style.display !== targetDisplay) sidebarRecs.style.display = targetDisplay;
  }

  // 4. SWAP COMMENTS
  const secondaryInner = document.querySelector('#secondary-inner');
  if (settings.swapComments && window.location.href.includes('watch')) {
    const comments = document.querySelector('#comments');
    if (comments && secondaryInner) {
      if (comments.parentNode !== secondaryInner) {
        secondaryInner.prepend(comments);
        comments.style.display = 'block';
      }
      if (secondaryInner.style.overflowY !== 'auto') {
        secondaryInner.style.maxHeight = 'calc(100vh - 70px)'; 
        secondaryInner.style.overflowY = 'auto';
        secondaryInner.style.paddingRight = '5px'; 
      }
    }
  }

  // 5. UI INJECTION: TOGGLE BUTTON
  injectToggleButton();

  setTimeout(() => { isApplying = false; }, 50);
}

// Helper: UI Injection Logic
function injectToggleButton() {
  const btnId = 'custom-autoblur-btn';
  const activeBg = '#e95420'; 
  const inactiveBg = 'rgba(255, 255, 255, 0.1)';

  if (document.getElementById(btnId)) {
    const btn = document.getElementById('autoblur-toggle-btn');
    if (btn) {
      btn.style.backgroundColor = settings.isExtensionEnabled ? activeBg : inactiveBg;
      btn.innerText = `Blur: ${settings.isExtensionEnabled ? 'ON' : 'OFF'}`;
    }
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
      Blur: ${settings.isExtensionEnabled ? 'ON' : 'OFF'}
    </button>
  `;

  btnContainer.querySelector('#autoblur-toggle-btn').onclick = () => {
    settings.isExtensionEnabled = !settings.isExtensionEnabled;
    chrome.storage.local.set({ isExtensionEnabled: settings.isExtensionEnabled });
    
    // Reset guard and apply changes immediately
    isApplying = false;
    applyAllFeatures(); 
  };

  targetMenu.prepend(btnContainer);
}

// 4. THE INDESTRUCTIBLE OBSERVER LOGIC
function startObserver() {
  try {
    const target = document.body || document.documentElement;
    if (!target) throw new Error("DOM not ready");

    const observer = new MutationObserver(() => {
      if (!isApplying) applyAllFeatures();
    });
    
    observer.observe(target, { childList: true, subtree: true });
  } catch (error) {
    setTimeout(startObserver, 50);
  }
}

startObserver();

// 5. Standard Focus Listeners
window.addEventListener('blur', () => applyAllFeatures());
window.addEventListener('focus', () => applyAllFeatures());
document.addEventListener('visibilitychange', () => applyAllFeatures());