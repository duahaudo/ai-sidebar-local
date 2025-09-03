import { PageAdjuster } from './page-adjuster';

// Initialize page adjuster
const pageAdjuster = new PageAdjuster();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_SIDEBAR':
      pageAdjuster.toggleSidebar();
      sendResponse({ success: true });
      break;

    case 'OPEN_SIDEBAR':
      pageAdjuster.openSidebar();
      sendResponse({ success: true });
      break;

    case 'CLOSE_SIDEBAR':
      pageAdjuster.closeSidebar();
      sendResponse({ success: true });
      break;

    case 'RESIZE_SIDEBAR':
      if (message.width) {
        pageAdjuster.resizeSidebar(message.width);
      }
      sendResponse({ success: true });
      break;

    case 'EXTRACT_CONTEXT':
      const context = pageAdjuster.extractPageContext();
      sendResponse({ context });
      break;

    case 'IS_SIDEBAR_OPEN':
      sendResponse({ isOpen: pageAdjuster.isVisible() });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async response
});

// Listen for keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Shift + Y
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Y') {
    e.preventDefault();
    pageAdjuster.toggleSidebar();
  }
});

// Auto-close sidebar on navigation for single-page apps
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Optional: close sidebar on navigation
    // pageAdjuster.closeSidebar();
  }
}).observe(document, { subtree: true, childList: true });

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden && pageAdjuster.isVisible()) {
    // Optional: save state when tab becomes hidden
    try {
      chrome.storage.local.set({ 
        sidebarWasOpen: true,
        tabUrl: location.href 
      });
    } catch (error) {
      // Extension context was invalidated, ignore
      console.log('Extension context invalidated');
    }
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (pageAdjuster.isVisible()) {
    // Save state before unload
    try {
      chrome.storage.local.set({
        sidebarWasOpen: true,
        tabUrl: location.href
      });
    } catch (error) {
      // Extension context was invalidated, ignore
      console.log('Extension context invalidated');
    }
  }
});

// Check if sidebar should be restored
try {
  chrome.storage.local.get(['sidebarWasOpen', 'tabUrl'], (result) => {
    if (chrome.runtime.lastError) {
      // Extension context was invalidated
      return;
    }
    if (result.sidebarWasOpen && result.tabUrl === location.href) {
      // Auto-open sidebar if it was previously open on this page
      setTimeout(() => {
        pageAdjuster.openSidebar();
        // Clear the flag
        try {
          chrome.storage.local.remove(['sidebarWasOpen', 'tabUrl']);
        } catch (error) {
          // Ignore if context is invalidated
        }
      }, 500);
    }
  });
} catch (error) {
  // Extension context was invalidated, ignore
  console.log('Extension context invalidated');
}

console.log('AI Assistant Sidebar - Content script loaded');