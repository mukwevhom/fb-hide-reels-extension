document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const hidePageTabs = document.getElementById('hidePageTabs');
  const hidePageReelsShelf = document.getElementById('hidePageReelsShelf');
  const hideFeedReels = document.getElementById('hideFeedReels');
  const hideSidebar = document.getElementById('hideSidebar');
  const statusBadge = document.getElementById('statusBadge');
  const reelsHiddenCount = document.getElementById('reelsHiddenCount');
  const optionsCard = document.getElementById('optionsCard');

  const toggles = {
    enabled: masterToggle,
    hidePageTabs: hidePageTabs,
    hidePageReelsShelf: hidePageReelsShelf,
    hideFeedReels: hideFeedReels,
    hideSidebar: hideSidebar,
  };

  // Update visual badge and disabled state
  function updateUIState(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'status-badge active';
      optionsCard.style.opacity = '1';
      optionsCard.style.pointerEvents = 'auto';
    } else {
      statusBadge.textContent = 'Disabled';
      statusBadge.className = 'status-badge disabled';
      optionsCard.style.opacity = '0.5';
      optionsCard.style.pointerEvents = 'none';
    }
  }

  // Load saved preferences
  chrome.storage.sync.get(
    ['enabled', 'hidePageTabs', 'hidePageReelsShelf', 'hideFeedReels', 'hideSidebar'],
    (items) => {
      masterToggle.checked = items.enabled !== false;
      hidePageTabs.checked = items.hidePageTabs !== false;
      hidePageReelsShelf.checked = items.hidePageReelsShelf !== false;
      hideFeedReels.checked = items.hideFeedReels !== false;
      hideSidebar.checked = items.hideSidebar !== false;

      updateUIState(masterToggle.checked);
    }
  );

  // Bind change listeners to save settings immediately
  Object.entries(toggles).forEach(([key, element]) => {
    element.addEventListener('change', () => {
      const data = {};
      data[key] = element.checked;
      chrome.storage.sync.set(data);

      if (key === 'enabled') {
        updateUIState(element.checked);
      }
    });
  });

  // Query active tab for stats
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const activeTab = tabs[0];
    if (activeTab.url && activeTab.url.includes('facebook.com')) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'getStats' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script may not be loaded yet or tab is not Facebook
          return;
        }
        if (response && typeof response.hiddenCount !== 'undefined') {
          reelsHiddenCount.textContent = response.hiddenCount;
        }
      });
    } else {
      reelsHiddenCount.textContent = '—';
    }
  });
});
