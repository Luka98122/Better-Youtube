let State = {
  settings: {},
  isApplying: false,
  isHomeOverrideActive: false,
  previewTimer: null
};

// 1. Initial Load (Wrapped safely)
const init = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(null, (res) => {
      State.settings = res || {};
      if (State.settings.blurRange === undefined) State.settings.blurRange = 20;
      if (State.settings.isExtensionEnabled === undefined) State.settings.isExtensionEnabled = true;
      applyAllFeatures();
    });
  }
};
init();

// 2. Main Controller
function applyAllFeatures() {
  if (State.isApplying || Object.keys(State.settings).length === 0) return;
  if (!document.body) return;
  State.isApplying = true;

  Features.updateBlur(State.settings);

  Features.updateHomeBlocker(State.settings, State.isHomeOverrideActive, () => {
    State.isHomeOverrideActive = true;
    State.isApplying = false;
    applyAllFeatures();
    setTimeout(() => {
      State.isHomeOverrideActive = false;
      applyAllFeatures();
    }, 60000);
  });

  Features.updateShorts(State.settings);

  Features.updateCustomFeed(State.settings);

  Features.updateLayout(State.settings);

  Features.injectToggleButton(State.settings, () => {
    State.settings.isExtensionEnabled = !State.settings.isExtensionEnabled;
    chrome.storage.local.set({ isExtensionEnabled: State.settings.isExtensionEnabled });
    State.isApplying = false;
    applyAllFeatures();
  });

  setTimeout(() => { State.isApplying = false; }, 50);
}

// 3. Storage Change Listener (replaces message-based communication)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    State.settings[key] = newValue;
  }
  State.isApplying = false;
  applyAllFeatures();
});

// 4. Observers & Focus Listeners
function startObserver() {
  try {
    const target = document.body || document.documentElement;
    //if (!target) throw new Error("DOM not ready");
    const observer = new MutationObserver(() => { if (!State.isApplying) applyAllFeatures(); });
    observer.observe(target, { childList: true, subtree: true });
  } catch (error) {
    setTimeout(startObserver, 50);
  }
}
startObserver();

window.addEventListener('blur', () => applyAllFeatures());
window.addEventListener('focus', () => applyAllFeatures());
document.addEventListener('visibilitychange', () => applyAllFeatures());

// 5. Infinite Scroll Trigger for Custom Layouts
document.addEventListener('scroll', (e) => {
  const el = e.target;
  if (el.id === 'secondary-inner' || el.tagName === 'YTD-WATCH-NEXT-SECONDARY-RESULTS-RENDERER') {
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      window.dispatchEvent(new Event('scroll'));
    }
  }
}, true);