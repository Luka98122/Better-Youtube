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

// 2. DEBUG Message Listener
chrome.runtime.onMessage.addListener((msg) => {
  console.log("DEBUG: Message Received ->", msg); 
  
  if (msg.newBlur !== undefined) {
    console.log("DEBUG: Real-time blur update to:", msg.newBlur);
    settings.blurRange = msg.newBlur;
    showBlurPreview();
  } else if (msg.type === 'UPDATE_SETTINGS') {
    console.log(`DEBUG: Setting ${msg.id} changed to:`, msg.val);
    settings[msg.id] = msg.val;
    isApplying = false; 
    if (msg.id === 'blurRange') {
      showBlurPreview();
    } else {
      applyAllFeatures();
    }
  }
});

// Helper to show the blur even if the tab is focused
function showBlurPreview() {
  const video = document.querySelector('video');
  if (video && settings.isExtensionEnabled) {
    video.style.filter = `blur(${settings.blurRange}px)`;
    clearTimeout(window.previewTimer);
    window.previewTimer = setTimeout(() => {
      isApplying = false;
      applyAllFeatures(); 
    }, 1000);
  }
}

// Helper to inject CSS that turns the vertical list into a grid
function toggleRecGridStyle(enable) {
  let styleTag = document.getElementById('custom-rec-grid-style');
  
  if (!enable) {
    if (styleTag) styleTag.innerHTML = '';
    return;
  }
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'custom-rec-grid-style';
    document.head.appendChild(styleTag);
  }
  
  if (styleTag.innerHTML === '') {
    styleTag.innerHTML = `
      /* 1. Force the container to take full width of the bottom area */
      #primary-inner ytd-watch-next-secondary-results-renderer {
        width: 100% !important;
        max-width: none !important;
        margin-top: 30px !important;
        padding-top: 20px !important;
        border-top: 1px solid var(--yt-spec-10-percent-layer) !important;
      }

      style-scope ytd-watch-next-secondary-results-renderer {
        max-width:70% !important;
      }
      
      /* 2. Force the inner wrapper to be a grid */
      #primary-inner ytd-watch-next-secondary-results-renderer ytd-item-section-renderer #contents,
      #primary-inner ytd-watch-next-secondary-results-renderer #items {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
        gap: 16px !important;
        width: 100% !important;
      }
      
      /* 3. Stack the thumbnails on top of the text */
      #primary-inner ytd-compact-video-renderer {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        width: 100% !important;
        min-width: 0 !important; /* Prevents grid blowout */
      }
      
      /* 4. Fix the Thumbnail Constraints */
      #primary-inner ytd-compact-video-renderer ytd-thumbnail {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        margin: 0 0 8px 0 !important;
      }
      
      /* 5. Force Images to scale correctly */
      #primary-inner ytd-compact-video-renderer ytd-thumbnail img {
        width: 100% !important;
        height: auto !important;
        object-fit: cover !important;
        aspect-ratio: 16 / 9 !important;
      }
      
      /* 6. Fix Text Container Width */
      #primary-inner ytd-compact-video-renderer .details.ytd-compact-video-renderer {
        width: 100% !important;
        min-width: 0 !important;
        padding-right: 0 !important;
      }
    `;
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
  
  if (settings.hideHome && !isHomeOverrideActive) {
    if (homeGrid && homeGrid.style.display !== 'none') {
      homeGrid.style.display = 'none';
    }
    
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

      const overrideBtnHtml = settings.disableHomeOverride 
        ? '' 
        : `<button id="temp-show-feed" style="margin-top: 30px; background: rgba(255,255,255,0.05); border: 1px solid #444; color: #888; padding: 10px 20px; border-radius: 20px; cursor: pointer; transition: 0.2s;">Show feed anyway (1 minute)</button>`;

      messageDiv.innerHTML = `
        <h1 style="font-size: 32px; margin-bottom: 10px; opacity: 0.9;">Do you really need to be on here?</h1>
        <p style="font-size: 18px; opacity: 0.6;">Focus on what matters. Your home feed is disabled.</p>
        ${overrideBtnHtml}
      `;

      const btn = messageDiv.querySelector('#temp-show-feed');
      if (btn) {
        btn.onclick = () => {
          isHomeOverrideActive = true;
          isApplying = false; 
          applyAllFeatures();
          
          setTimeout(() => {
            isHomeOverrideActive = false;
            applyAllFeatures();
          }, 60000);
        };
        
        btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
        btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.05)';
      }
      
      messageDiv.style.display = 'flex';
    }
  } else {
    if (homeGrid) {
      homeGrid.style.display = '';
      homeGrid.style.removeProperty('display'); 
    }
    const existingMsg = document.getElementById(messageId);
    if (existingMsg) {
      existingMsg.style.display = 'none';
    }
  }

  // 3 & 4. LAYOUT COORDINATION: SIDEBAR & COMMENTS
  const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
  const secondaryInner = document.querySelector('#secondary-inner');
  const comments = document.querySelector('#comments');
  const primaryInner = document.querySelector('#primary-inner');

  // Handle purely hiding the sidebar first
  if (sidebarRecs) {
    const targetDisplay = settings.hideSidebar ? 'none' : '';
    if (sidebarRecs.style.display !== targetDisplay) sidebarRecs.style.display = targetDisplay;
  }

  // Handle the Complex Layout Swaps
  if (settings.swapComments && window.location.href.includes('watch')) {
    
    // Move Comments to Sidebar
    if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
      secondaryInner.prepend(comments);
      secondaryInner.style.setProperty('max-height', 'calc(100vh - 80px)', 'important');
      secondaryInner.style.setProperty('overflow-y', 'auto', 'important');
      secondaryInner.style.setProperty('display', 'block', 'important');
      comments.style.display = 'block';
    }

    // Move Recs to Bottom (and apply Grid CSS)
    if (!settings.hideSidebar && sidebarRecs && primaryInner && sidebarRecs.parentNode !== primaryInner) {
      primaryInner.appendChild(sidebarRecs);
    }
    toggleRecGridStyle(true);

  } else {
    
    // Move Comments Back to Bottom
    if (comments && primaryInner && comments.parentNode === secondaryInner) {
      primaryInner.appendChild(comments);
      if (secondaryInner) {
        secondaryInner.style.removeProperty('max-height');
        secondaryInner.style.removeProperty('overflow-y');
        secondaryInner.style.removeProperty('display');
      }
    }

    // Move Recs Back to Sidebar (and remove Grid CSS)
    if (sidebarRecs && secondaryInner && sidebarRecs.parentNode === primaryInner) {
      secondaryInner.appendChild(sidebarRecs);
    }
    toggleRecGridStyle(false);
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