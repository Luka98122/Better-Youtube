const Features = {
  updateBlur: (settings) => {
    const video = document.querySelector('video');
    const captions = document.querySelector('.ytp-caption-window-container');
    if (!video) return;

    const isHidden = document.hidden || !document.hasFocus();
    const shouldBlur = isHidden && settings.isExtensionEnabled && settings.blurRange > 0;
    
    let filters = [];
    if (shouldBlur) filters.push(`blur(${settings.blurRange}px)`);
    if (settings.blackAndWhite) filters.push('grayscale(100%)');
    const filterVal = filters.length > 0 ? filters.join(' ') : 'none';

    if (video.style.filter !== filterVal) {
      video.style.transition = 'filter 0.1s linear';
      video.style.filter = filterVal;
    }

    if (captions) {
      let capFilters = [];
      if (shouldBlur && settings.blurCaptions) capFilters.push(`blur(${settings.blurRange}px)`);
      if (settings.blackAndWhite && settings.blurCaptions) capFilters.push('grayscale(100%)');
      const capFilterVal = capFilters.length > 0 ? capFilters.join(' ') : 'none';
      if (captions.style.filter !== capFilterVal) {
        captions.style.transition = 'filter 0.1s linear';
        captions.style.filter = capFilterVal;
      }
    }
  },

  updateHomeBlocker: (settings, isOverrideActive, onOverrideClick) => {
    document.body.classList.toggle('hide-home-active', !!settings.hideHome && !isOverrideActive);
    
    const homeBrowse = document.querySelector('ytd-browse[page-subtype="home"]');
    const messageId = 'custom-focus-message';
    
    if (settings.hideHome && !isOverrideActive) {
      if (homeBrowse && !document.getElementById(messageId)) {
        let messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        const overrideBtnHtml = settings.disableHomeOverride ? '' : `<button id="temp-show-feed">Show feed anyway (1 minute)</button>`;
        messageDiv.innerHTML = `
          <h1>Do you really need to be on here?</h1>
          <p>Focus on what matters. Your home feed is disabled.</p>
          ${overrideBtnHtml}
        `;
        homeBrowse.prepend(messageDiv);

        const btn = messageDiv.querySelector('#temp-show-feed');
        if (btn) btn.onclick = onOverrideClick;
      }
      const existingMsg = document.getElementById(messageId);
      if (existingMsg) existingMsg.style.display = 'flex';
    } else {
      const existingMsg = document.getElementById(messageId);
      if (existingMsg) existingMsg.style.display = 'none';
    }
  },

  updateLayout: (settings) => {
    // Determine visibility safely via CSS classes
    const actualHideSidebar = settings.hideSidebar && !settings.swapComments;
    document.body.classList.toggle('hide-sidebar-active', !!actualHideSidebar);
    document.body.classList.toggle('hide-recs', !!settings.hideSidebar);
    document.body.classList.toggle('yt-custom-layout', !!settings.swapComments);

    if (window.location.href.includes('watch')) {
      const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
      const secondaryInner = document.querySelector('#secondary-inner');
      const comments = document.querySelector('#comments');
      const primaryInner = document.querySelector('#primary-inner');

      if (settings.swapComments) {
        if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
          secondaryInner.prepend(comments);
          comments.style.display = 'block';
        }
        if (!settings.hideSidebar && sidebarRecs && primaryInner && sidebarRecs.parentNode !== primaryInner) {
          primaryInner.appendChild(sidebarRecs);
        }
      } else {
        if (comments && primaryInner && comments.parentNode === secondaryInner) {
          const target = document.querySelector('#ticket-shelf');
          if (target) {
            target.after(comments); 
          } else {
            primaryInner.appendChild(comments);
          }
        }
        if (sidebarRecs && secondaryInner && sidebarRecs.parentNode === primaryInner) {
          secondaryInner.appendChild(sidebarRecs);
        }
      }
    }
  },

  injectToggleButton: (settings, onToggle) => {
    const btnId = 'custom-autoblur-btn';
    const activeBg = '#e95420'; 
    const inactiveBg = 'rgba(255, 255, 255, 0.1)';
  
    const existingBtn = document.getElementById('autoblur-toggle-btn');
    if (existingBtn) {
      existingBtn.style.backgroundColor = settings.isExtensionEnabled ? activeBg : inactiveBg;
      existingBtn.innerText = `Blur: ${settings.isExtensionEnabled ? 'ON' : 'OFF'}`;
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
    btnContainer.querySelector('#autoblur-toggle-btn').onclick = onToggle;
    targetMenu.prepend(btnContainer);
  }
};