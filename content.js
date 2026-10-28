/**
 * Hide Reels on Facebook Pages & Feeds
 * Content Script (Manifest V3)
 */

(function () {
  'use strict';

  // Apply root attribute synchronously to activate CSS rules immediately
  document.documentElement.setAttribute('data-fb-reels-blocker', 'enabled');

  let config = {
    enabled: true,
    hidePageTabs: true,
    hidePageReelsShelf: true,
    hideReelPosts: true,
    hideSidebar: true,
    hideFeedReels: true,
  };

  let hiddenCount = 0;
  let isScheduled = false;
  let observer = null;

  // Retrieve storage configuration
  function loadConfig(callback) {
    chrome.storage.sync.get(
      ['enabled', 'hidePageTabs', 'hidePageReelsShelf', 'hideReelPosts', 'hideSidebar', 'hideFeedReels'],
      (res) => {
        if (res && typeof res.enabled !== 'undefined') {
          config = { ...config, ...res };
        }
        updateRootAttribute();
        if (callback) callback();
      }
    );
  }

  function updateRootAttribute() {
    if (config.enabled) {
      document.documentElement.setAttribute('data-fb-reels-blocker', 'enabled');
    } else {
      document.documentElement.removeAttribute('data-fb-reels-blocker');
    }
  }

  // React to popup setting changes in real time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      let updated = false;
      for (const [key, val] of Object.entries(changes)) {
        if (key in config) {
          config[key] = val.newValue;
          updated = true;
        }
      }
      if (updated) {
        updateRootAttribute();
        if (!config.enabled) {
          unhideAll();
        } else {
          runScan();
        }
      }
    }
  });

  // Check if string represents a Reels heading or title
  function isReelsHeading(text) {
    if (!text) return false;
    const str = text.trim().toLowerCase();
    if (str === 'reels' ||
        str === 'reels and short videos' ||
        str === 'reels & short videos' ||
        str === 'suggested reels' ||
        str === 'watch reels' ||
        str === 'reels tray' ||
        str === 'create reel') {
      return true;
    }
    if (str.startsWith('reels •') || str.startsWith('reels ·') || str.startsWith('reels by')) {
      return true;
    }
    const words = str.split(/\s+/);
    if (words.length <= 4 && words.includes('reels')) {
      return true;
    }
    return false;
  }

  // Safely hide an element and count it
  function hideElement(el, reason) {
    if (!el || el.nodeType !== 1) return;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    
    // Safety: Never hide entire page containers
    if (tag === 'body' || tag === 'html' || role === 'main') {
      return;
    }

    if (el.getAttribute('data-fb-reel-hidden') === 'true') return;

    el.setAttribute('data-fb-reel-hidden', 'true');
    el.style.setProperty('display', 'none', 'important');
    hiddenCount++;
  }

  // Restore elements when toggle is turned OFF
  function unhideAll() {
    const hidden = document.querySelectorAll('[data-fb-reel-hidden="true"]');
    hidden.forEach((el) => {
      el.removeAttribute('data-fb-reel-hidden');
      el.style.removeProperty('display');
    });
    hiddenCount = 0;
  }

  /**
   * Find the enclosing card or section container for an element inside a Facebook Page or Feed.
   */
  function findSectionCard(indicator) {
    if (!indicator || indicator.nodeType !== 1) return null;

    // 1. Direct standard FB post container or feed unit
    const article = indicator.closest('div[role="article"], div[data-pagelet*="FeedUnit"], div[data-pagelet*="ProfileTilesFeed_"]');
    if (article) return article;

    // 2. Direct child inside role="feed"
    const feed = indicator.closest('div[role="feed"]');
    if (feed) {
      let curr = indicator;
      while (curr && curr.parentElement && curr.parentElement !== feed) {
        curr = curr.parentElement;
      }
      if (curr && curr.parentElement === feed) {
        return curr;
      }
    }

    // 3. Facebook Page timeline section card (inside column / div[role="main"])
    let curr = indicator;
    let candidate = null;

    for (let i = 0; i < 9; i++) {
      if (!curr || !curr.parentElement) break;
      const parent = curr.parentElement;
      const parentTag = parent.tagName.toLowerCase();
      const parentRole = parent.getAttribute('role');

      if (parentTag === 'body' || parentTag === 'html') break;

      // If parent is role="main", curr is the top card/section in that column
      if (parentRole === 'main') {
        return curr;
      }

      // If parent has multiple child elements (representing multiple cards/sections)
      if (parent.children.length >= 2) {
        candidate = curr;
      }

      curr = parent;
    }

    return candidate || indicator;
  }

  /**
   * 1. Remove Page Navigation Tabs ("Reels" tab under Page cover photo & dropdown)
   */
  function scanPageTabs() {
    if (!config.hidePageTabs) return;

    // Standard tab bar buttons
    const tabs = document.querySelectorAll('a[role="tab"], div[role="tab"]');
    tabs.forEach((tab) => {
      const href = (tab.getAttribute('href') || tab.querySelector('a')?.getAttribute('href') || '').toLowerCase();
      const text = (tab.textContent || '').trim().toLowerCase();

      if (href.includes('/reels') || text === 'reels') {
        const container = tab.closest('li') || tab.closest('div[role="presentation"]') || tab;
        hideElement(container, 'page-tab');
      }
    });

    // "More" dropdown menu items on Pages
    const menuItems = document.querySelectorAll('div[role="menuitem"], a[role="menuitem"]');
    menuItems.forEach((item) => {
      const href = (item.getAttribute('href') || item.querySelector('a')?.getAttribute('href') || '').toLowerCase();
      const text = (item.textContent || '').trim().toLowerCase();

      if (href.includes('/reels') || text === 'reels') {
        hideElement(item, 'page-tab-menuitem');
      }
    });
  }

  /**
   * 2. Remove Left Navigation Sidebar Reels Shortcuts
   */
  function scanSidebar() {
    if (!config.hideSidebar) return;

    const navLinks = document.querySelectorAll('div[role="navigation"] a[href*="/reel"], div[role="navigation"] a[href*="/watch/reels"]');
    navLinks.forEach((link) => {
      const row = link.closest('li') || link.closest('div[role="listitem"]') || link;
      hideElement(row, 'sidebar-shortcut');
    });
  }

  /**
   * 3. Remove Reels Sections on Facebook Pages, Profiles, and Home Feed
   */
  function scanReelsSections() {
    if (!config.hidePageReelsShelf && !config.hideFeedReels && !config.hideReelPosts) return;

    // A. Section headings containing "Reels"
    const headings = document.querySelectorAll('h2, h3, h4, span[dir="auto"], div[role="heading"]');
    headings.forEach((heading) => {
      // Ignore comments or text inside chat/forms
      if (heading.closest('form, div[aria-label*="comment" i]')) return;

      const text = heading.textContent || '';
      if (isReelsHeading(text)) {
        const sectionCard = findSectionCard(heading);
        if (sectionCard) {
          hideElement(sectionCard, 'heading-reels-section');
        }
      }
    });

    // B. Cards containing links pointing to /reels/ (e.g. "See all" reels button on Page timeline)
    const seeAllReelsLinks = document.querySelectorAll('a[href*="/reels/"], a[href$="/reels"]');
    seeAllReelsLinks.forEach((link) => {
      if (link.getAttribute('role') === 'tab' || link.closest('div[role="tablist"], div[role="navigation"]')) {
        return; // Handled by scanPageTabs / scanSidebar
      }
      const sectionCard = findSectionCard(link);
      if (sectionCard) {
        hideElement(sectionCard, 'see-all-reels-card');
      }
    });

    // C. Individual Reel video links in feeds or timelines (href="/reel/<id>")
    const reelLinks = document.querySelectorAll('a[href*="/reel/"]');
    reelLinks.forEach((link) => {
      // Skip navigation sidebar and comments
      if (link.closest('div[role="navigation"], ul[role="list"], div[aria-label*="comment" i]')) return;

      const card = findSectionCard(link);
      if (card) {
        hideElement(card, 'reel-video-card');
      }
    });

    // D. Check if currently on a Page's dedicated Reels tab URL (e.g. facebook.com/PAGE/reels)
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('/reels') || path.endsWith('/reels/')) {
      const main = document.querySelector('div[role="main"]');
      if (main) {
        const reelsFeed = main.querySelector('div[role="feed"]') || main.querySelector('div.x1n2onr6') || main;
        hideElement(reelsFeed, 'page-reels-view');
      }
    }
  }

  // Master scan function
  function runScan() {
    if (!config.enabled) return;
    scanPageTabs();
    scanSidebar();
    scanReelsSections();
  }

  // Throttled scan schedule using requestAnimationFrame
  function scheduleScan() {
    if (isScheduled) return;
    isScheduled = true;
    requestAnimationFrame(() => {
      runScan();
      isScheduled = false;
    });
  }

  // Observe dynamic additions
  function startObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (!config.enabled) return;

      let hasNodes = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          hasNodes = true;
          break;
        }
      }

      if (hasNodes) {
        scheduleScan();
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Message handler for extension popup stats
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getStats') {
      sendResponse({
        hiddenCount: hiddenCount,
        enabled: config.enabled,
      });
    } else if (msg.action === 'rescan') {
      runScan();
      sendResponse({ hiddenCount: hiddenCount });
    }
  });

  // Initialization
  function init() {
    loadConfig(() => {
      runScan();
      startObserver();
    });

    // Backup interval for Facebook SPA virtual list recycled items
    setInterval(() => {
      if (config.enabled) {
        runScan();
      }
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
