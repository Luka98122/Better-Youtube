# YouTube Auto-Blur Pro

A Chrome extension designed to automatically blur YouTube videos when the tab loses focus or is hidden. This ensures privacy and minimizes distractions when switching between tasks or windows.

---

## Features

* **Auto-Blur on Focus Loss**: The video immediately blurs when you click away from the tab or switch windows.
* **Visibility Handling**: Blurs the video when the tab is hidden and unblurs it with a slight delay when returning to ensure a smooth transition.
* **Customizable Intensity**: Adjust the blur strength from 0px to 100px using a range slider in the extension popup.
* **Native UI Integration**: Injects a custom toggle button directly into the YouTube watch page, located to the left of the Like/Dislike segment.
* **Performance Optimized**: Uses local storage for settings and efficient event listeners to avoid hitting Chrome API quotas.
* **Ubuntu-Inspired UI**: The popup features a dark-themed interface with a distinctive orange accent.

---

## Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to chrome://extensions/.
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click **Load unpacked**.
5. Select the directory containing the extension files.

---

## File Structure

* **manifest.json**: Extension configuration and permissions.
* **content.js**: Handles the blur logic, DOM injection for the toggle button, and YouTube UI observers.
* **popup.html / popup.js**: The user interface for adjusting blur intensity settings.
* **README.md**: Documentation for the project.

---

## Technical Details

### Blur Logic
The extension monitors the window blur and focus events, as well as the document visibilitychange event. A timeout is utilized during the focus event to prevent flickering during rapid tab switching.

### UI Injection
A MutationObserver is used in content.js to detect when YouTube's dynamic menu elements are rendered. Once the target container (#top-level-buttons-computed) is available, the custom button is injected while maintaining the look and feel of YouTube's native tonal button style.

### Storage
Settings are persisted using chrome.storage.local, avoiding the strict write-frequency limits associated with chrome.storage.sync.