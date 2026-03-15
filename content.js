let settings = {};
let isApplying = false;

// 1. Initial Load
chrome.storage.local.get(null, (res) => {
  settings = res;
  applyAllFeatures();
});

// 2. Listen for Live Changes
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_SETTINGS') {
    settings[msg.id] = msg.val;
    applyAllFeatures();
  }
});

// 3. The Feature Logic 
function applyAllFeatures() {
  if (isApplying || Object.keys(settings).length === 0) return; 
  isApplying = true;

  const video = document.querySelector('video');
  
  // 1. BLUR LOGIC
  const isHidden = document.hidden || !document.hasFocus();
  if (video) {
    const blurValue = (isHidden && settings.blurRange > 0) ? `blur(${settings.blurRange}px)` : 'none';
    if (video.style.filter !== blurValue) {
      video.style.transition = 'filter 0.1s linear';
      video.style.filter = blurValue;
    }
  }

  // 2. HIDE HOME FEED
  const homeGrid = document.querySelector('ytd-rich-grid-renderer');
  const homeBrowse = document.querySelector('ytd-browse[page-subtype="home"]');
  
  if (settings.hideHome) {
    if (homeGrid && homeGrid.style.display !== 'none') homeGrid.style.display = 'none';
    if (homeBrowse && homeBrowse.style.display !== 'none') {
        homeBrowse.style.setProperty('display', 'none', 'important');
    }
  } else {
    if (homeGrid && homeGrid.style.display === 'none') homeGrid.style.display = '';
    if (homeBrowse && homeBrowse.style.display === 'none') homeBrowse.style.display = '';
  }

  // 3. HIDE SIDEBAR
  const sidebarRecs = document.querySelector('ytd-watch-next-secondary-results-renderer');
  if (sidebarRecs) {
    const targetDisplay = settings.hideSidebar ? 'none' : '';
    if (sidebarRecs.style.display !== targetDisplay) sidebarRecs.style.display = targetDisplay;
  }

  // 4. SWAP COMMENTS
  if (settings.swapComments && window.location.href.includes('watch')) {
    const comments = document.querySelector('#comments');
    const secondaryInner = document.querySelector('#secondary-inner');
    if (comments && secondaryInner && comments.parentNode !== secondaryInner) {
      secondaryInner.prepend(comments);
      comments.style.display = 'block';
    }
  }

  setTimeout(() => { isApplying = false; }, 50);
}

// 4. THE INDESTRUCTIBLE OBSERVER LOGIC
function startObserver() {
  try {
    // Attempt to grab the body or html tag
    const target = document.body || document.documentElement;
    
    // If neither exists yet, force an error to jump to the catch block
    if (!target) throw new Error("DOM not ready");

    const observer = new MutationObserver(() => {
      if (!isApplying) applyAllFeatures();
    });
    
    // If Chrome thinks this isn't a Node yet, it will throw the TypeError here
    observer.observe(target, { childList: true, subtree: true });
    
  } catch (error) {
    // We catch the error silently, wait 50ms, and try again. 
    // This loops until Chrome finally constructs the Node!
    setTimeout(startObserver, 50);
  }
}

// Start the loop
startObserver();

// 5. Standard Focus Listeners
window.addEventListener('blur', () => applyAllFeatures());
window.addEventListener('focus', () => applyAllFeatures());
document.addEventListener('visibilitychange', () => applyAllFeatures());