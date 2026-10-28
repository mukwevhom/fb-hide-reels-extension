# Hide Reels on Facebook Pages & Feeds (Chrome Extension)

A lightweight, high-performance Manifest V3 Google Chrome extension designed to hide Reels across Facebook pages, profiles, watch sections, and feeds.

---

## Features

- **Facebook Pages & Profiles**: Automatically detects and hides the "Reels" navigation tab (both in the main tab bar and inside the "More" dropdown menu) as well as Reels shelves on page timelines.
- **Feed Reels Suppression**: Hides "Reels and short videos" trays, carousels, and standalone Reels posts in your news feed.
- **Navigation Cleaner**: Removes the Reels shortcut from Facebook's left navigation sidebar.
- **Zero Flickering**: Injects CSS selectors early (`document_start`) using modern `:has()` styling so Reels content is concealed before layout renders.
- **Smooth SPA Support**: Uses a debounced, throttled `MutationObserver` with `requestAnimationFrame` to seamlessly handle Facebook's dynamic infinite scrolling without browser lag.
- **Control Popup**: Clean popup toggle switch to turn blocking on/off with one click or configure granular options.
- **Session Stats**: Shows how many Reels elements have been concealed on the active tab.

---

## Installation Guide (Load Unpacked)

### 1. Clone or Download the Repository

```bash
git clone https://github.com/mukwevhom/fb-hide-reels-extension.git
```

Alternatively, download and extract the ZIP archive from GitHub.

### 2. Load into Chrome

1. Open Google Chrome.
2. In the address bar, navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch located in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker dialog, select the cloned `fb-hide-reels-extension` folder (the root directory containing `manifest.json`).
6. Click **Select** / **Open**. The extension will now be active in Chrome.

---

## How to Use & Test

1. Navigate to any Facebook Page (e.g. `https://www.facebook.com/<PageName>`) or your main Feed.
2. The "Reels" tab in the page menu, timeline Reels shelves, and feed Reels trays will be hidden automatically.
3. Click the extension icon in your Chrome toolbar to view the status, toggle features, or check the number of hidden elements.
4. If you turn off the master toggle, hidden elements reappear dynamically without needing a page refresh.

---

## Project Structure

```text
fb-hide-reels-extension/
├── manifest.json       # Manifest V3 extension configuration
├── content.css         # Early-injected anti-flicker style rules
├── content.js          # Mutation observer & DOM detection logic
├── popup.html          # Extension settings & status popup UI
├── popup.js            # Popup controller & chrome.storage sync
├── icons/              # Extension icons (16, 32, 48, 128 px)
└── README.md           # Documentation & instructions
```

---

## License

MIT
