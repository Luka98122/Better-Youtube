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

  updateShorts: (settings) => {
    // 1. Hide shorts 
    const isHideShorts = !!settings.hideShorts;
    if (document.body.classList.contains('hide-shorts-active') !== isHideShorts) {
      document.body.classList.toggle('hide-shorts-active', isHideShorts);
      window.dispatchEvent(new Event('resize'));
    }

    // 2. Redirect shorts
    if (settings.redirectShorts && window.location.pathname.startsWith('/shorts/')) {
      const parts = window.location.pathname.split('/shorts/');
      if (parts.length > 1) {
        const videoId = parts[1];
        if (videoId) {
          window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
        }
      }
    }
  },

  updateLayout: (settings) => {
    let layoutChanged = false;

    // Determine visibility safely via CSS classes
    const actualHideSidebar = settings.hideSidebar && !settings.swapComments;

    if (document.body.classList.contains('hide-sidebar-active') !== !!actualHideSidebar) {
      document.body.classList.toggle('hide-sidebar-active', !!actualHideSidebar);
      layoutChanged = true;
    }
    if (document.body.classList.contains('hide-recs') !== !!settings.hideSidebar) {
      document.body.classList.toggle('hide-recs', !!settings.hideSidebar);
      layoutChanged = true;
    }
    if (document.body.classList.contains('yt-custom-layout') !== !!settings.swapComments) {
      document.body.classList.toggle('yt-custom-layout', !!settings.swapComments);
      layoutChanged = true;
    }

    if (window.location.href.includes('watch')) {
      const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
      const secondaryInner = document.querySelector('#secondary-inner');
      const comments = document.querySelector('#comments');
      const primaryInner = document.querySelector('#primary-inner');

      if (settings.swapComments) {
        if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
          let placeholder = document.getElementById('comments-placeholder');
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'comments-placeholder';
            placeholder.style.display = 'none';
            // Only insert placeholder if not already there, to avoid duplicates
            if (comments.parentNode) comments.parentNode.insertBefore(placeholder, comments);
          }
          secondaryInner.prepend(comments);
          comments.style.display = 'block';
          layoutChanged = true;
        }
        if (!settings.hideSidebar && sidebarRecs && primaryInner && sidebarRecs.parentNode !== primaryInner) {
          let placeholder = document.getElementById('sidebar-recs-placeholder');
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'sidebar-recs-placeholder';
            placeholder.style.display = 'none';
            if (sidebarRecs.parentNode) sidebarRecs.parentNode.insertBefore(placeholder, sidebarRecs);
          }
          primaryInner.appendChild(sidebarRecs);
          layoutChanged = true;
        }
      } else {
        if (comments && primaryInner && comments.parentNode === secondaryInner) {
          const placeholder = document.getElementById('comments-placeholder');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(comments, placeholder);
            // Don't remove the placeholder, keep it in DOM for the next time!
          } else {
            const below = document.querySelector('#below');
            if (below) {
              below.appendChild(comments);
            } else {
              primaryInner.appendChild(comments);
            }
          }
          layoutChanged = true;
        }
        if (sidebarRecs && secondaryInner && sidebarRecs.parentNode === primaryInner) {
          const placeholder = document.getElementById('sidebar-recs-placeholder');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(sidebarRecs, placeholder);
            // Don't remove the placeholder, keep it in DOM for the next time!
          } else {
            secondaryInner.appendChild(sidebarRecs);
          }
          layoutChanged = true;
        }
      }

      // Force YouTube's app to recalculate player size since we changed the physical layout containers
      if (layoutChanged) {
        window.dispatchEvent(new Event('resize'));
        // Sometimes YouTube's internal debouncing needs a slight delay
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
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