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
  if (msg.newBlur !== undefined) {
    settings.blurRange = msg.newBlur;
    showBlurPreview();
  } else if (msg.type === 'UPDATE_SETTINGS') {
    settings[msg.id] = msg.val;
    
    isApplying = false; 
    

    setTimeout(() => {
      applyAllFeatures();
    }, 10);
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
      /* 1. Neutralize the Sidebar Grid on the parent */
      #primary-inner ytd-watch-next-secondary-results-renderer,
      #primary-inner ytd-watch-next-secondary-results-renderer #items {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
      }

      /* 2. Force the Category Bar (Chips) to be on its own line on top */
      #primary-inner yt-related-chip-cloud-renderer {
        display: block !important;
        width: 100% !important;
        margin-bottom: 15px !important;
        padding: 10px 0 !important;
        border-bottom: 1px solid var(--yt-spec-10-percent-layer) !important;
      }

      /* 3. Ensure the chip cloud inside doesn't shrink */
      #primary-inner yt-chip-cloud-renderer {
        width: 100% !important;
      }

      /* 4. Target the Video Section and turn it into the Grid */
      #primary-inner ytd-item-section-renderer #contents {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
        gap: 20px !important;
        width: 100% !important;
      }

      /* 5. Clean up individual video wrappers (Lockups) */
      #primary-inner yt-lockup-view-model {
        width: 100% !important;
        margin: 0 !important;
      }

      #primary-inner .yt-lockup-view-model--horizontal {
        flex-direction: column !important;
        align-items: flex-start !important;
      }

      /* 6. Fix Thumbnail sizes for the new grid cells */
      #primary-inner .yt-lockup-view-model__content-image {
        width: 100% !important;
        height: auto !important;
        margin-bottom: 8px !important;
      }

      #primary-inner yt-thumbnail-view-model {
        width: 100% !important;
        height: auto !important;
      }

      #primary-inner yt-thumbnail-view-model img {
        width: 100% !important;
        aspect-ratio: 16/9 !important;
        object-fit: cover !important;
        border-radius: 12px !important;
      }

      /* 7. Fix text metadata below thumbnails */
      #primary-inner .yt-lockup-view-model__metadata {
        width: 100% !important;
        padding-left: 0 !important;
      }

      /* 8. Hide the sidebar's original header/spinner to prevent shifting */
      #primary-inner ytd-item-section-renderer #header,
      #primary-inner #spinner-container {
        display: none !important;
      }

      /* Stick player when scrolling comments and recommended. */

      /* Inside toggleRecGridStyle styleTag.innerHTML */

      /* 1. Hide the scrollbar for the sidebar specifically */
      #secondary-inner {
        /* For Firefox */
        scrollbar-width: none !important; 
        /* For Chrome, Safari, and Edge */
        -ms-overflow-style: none !important; 
      }

      #secondary-inner::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
      }

      /* 2. Style the main page scrollbar to look sleeker (Optional) */
      /* This makes the main scrollbar look better on Ubuntu/Linux */
      ::-webkit-scrollbar {
        width: 10px !important;
      }

      ::-webkit-scrollbar-track {
        background: var(--yt-spec-base-background) !important;
      }

      ::-webkit-scrollbar-thumb {
        background: #444 !important;
        border-radius: 5px !important;
        border: 2px solid var(--yt-spec-base-background) !important;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #666 !important;
      }

      /* 3. Keep the Sidebar Pinned */
      #secondary.ytd-watch-flexy {
        position: sticky !important;
        top: 56px !important;
        height: calc(100vh - 56px) !important;
        z-index: 100 !important;
        /* Ensure the container itself doesn't show a bar, only the inner div */
        overflow: hidden !important; 
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

  // 3 & 4. LAYOUT COORDINATION
  const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
  const secondaryInner = document.querySelector('#secondary-inner');
  const comments = document.querySelector('#comments');
  const primaryInner = document.querySelector('#primary-inner');

  if (window.location.href.includes('watch')) {
    if (settings.swapComments && window.location.href.includes('watch')) {
    
    // 1. Move Comments to Sidebar
    if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
      secondaryInner.prepend(comments);
      
      // Independent scroll ONLY for the comments sidebar
      secondaryInner.style.cssText = `
      height: 100% !important; 
      overflow-y: scroll !important; /* Keep the 'scroll' logic but CSS hides the bar */
      display: block !important;
      padding-right: 10px; /* Prevents text from hitting the edge of the screen */
    `;
    comments.style.display = 'block';
    }

    // 2. The Video Grid (stays in Primary, scrolls with page)
    if (!settings.hideSidebar && sidebarRecs && primaryInner && sidebarRecs.parentNode !== primaryInner) {
      primaryInner.appendChild(sidebarRecs);
      // Remove any previously applied heights/scrolls to the grid
      sidebarRecs.style.cssText = ""; 
    }
    toggleRecGridStyle(true);

  } else {
      // RESET LOGIC: Put everything back exactly where it belongs
      if (comments && primaryInner && comments.parentNode === secondaryInner) {
        // Find the skeleton/placeholder where comments usually live
        const commentTarget = document.querySelector('#ticket-shelf') || primaryInner;
        commentTarget.after(comments); 
        if (secondaryInner) secondaryInner.style.cssText = "";
      }
      if (sidebarRecs && secondaryInner && sidebarRecs.parentNode === primaryInner) {
        secondaryInner.appendChild(sidebarRecs);
      }
      toggleRecGridStyle(false);
    }

    // 3. Handle purely hiding the sidebar/recommendations
    if (sidebarRecs) {
      sidebarRecs.style.display = settings.hideSidebar ? 'none' : '';
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

// Function to manually trigger YouTube's infinite scroll for moved elements
function handleInternalScroll(e) {
  const el = e.target;
  // If we are within 200px of the bottom of the internal container
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
    // Dispatch a scroll event to the window so YouTube's scripts think the page moved
    window.dispatchEvent(new Event('scroll'));
  }
}

// Attach the listeners to the new scrollable zones
document.addEventListener('scroll', (e) => {
  if (e.target.id === 'secondary-inner' || e.target.tagName === 'YTD-WATCH-NEXT-SECONDARY-RESULTS-RENDERER') {
    handleInternalScroll(e);
  }
}, true); // Use capture phase to catch internal scrolls