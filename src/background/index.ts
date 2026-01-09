/**
 * FinishFirst Background Service Worker
 * Core blocking logic and focus session management
 */

import { browserAPI } from '../shared/browser-api';
import { onMessage } from '../shared/messaging';
import {
  getStorageWithDefault,
  setStorage,
  updateStorage,
  generateId,
  type Goal,
  type WhitelistPattern,
  type FocusSession,
} from '../shared/storage';
import { isUrlWhitelisted } from '../shared/whitelist';

// Track the last blocked URL for the blocked page
let lastBlockedUrl = '';

/**
 * Check if blocking should be active
 */
async function shouldBlock(): Promise<boolean> {
  const session = await getStorageWithDefault('focusSession');

  // Not blocking if focus mode is off
  if (!session.active) return false;

  // Only block when there is an active goal
  if (!session.currentGoal) {
    if (session.active || session.breakUntil) {
      await updateStorage('focusSession', {
        active: false,
        startedAt: null,
        breakUntil: null,
      });
    }
    return false;
  }

  return true;
}

/**
 * Check if a URL should be blocked
 */
async function shouldBlockUrl(url: string): Promise<{ blocked: boolean; reason?: string }> {
  // Never block empty or invalid URLs
  if (!url || url === 'about:blank') {
    return { blocked: false, reason: 'empty-url' };
  }

  // Never block the blocked page itself
  if (url.includes('blocked/blocked.html')) {
    return { blocked: false, reason: 'blocked-page' };
  }

  // Handle special new tab pages
  if (url === 'about:newtab' || url === 'chrome://newtab/' || url === 'edge://newtab/') {
    // Special handling for new tab pages
    // Only block if explicitly not whitelisted
    const whitelist = await getStorageWithDefault('whitelist');
    const isWhitelisted = isUrlWhitelisted(url, whitelist);

    if (isWhitelisted) {
      return { blocked: false, reason: 'whitelisted' };
    }

    // For new tab pages, we need to check if blocking is active
    if (!(await shouldBlock())) {
      return { blocked: false, reason: 'focus-inactive' };
    }

    // Block new tab only if there's an active focus session
    // But we need to be careful not to break the browser
    return { blocked: true, reason: 'newtab-blocked' };
  }

  // Check if blocking is active
  if (!(await shouldBlock())) {
    return { blocked: false, reason: 'focus-inactive' };
  }

  // Check whitelist
  const whitelist = await getStorageWithDefault('whitelist');
  if (isUrlWhitelisted(url, whitelist)) {
    return { blocked: false, reason: 'whitelisted' };
  }

  return { blocked: true };
}

/**
 * Get the blocked page URL with the original URL as parameter
 */
function getBlockedPageUrl(originalUrl: string): string {
  const blockedPage = chrome.runtime.getURL('blocked/blocked.html');
  return `${blockedPage}?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Handle navigation - redirect blocked URLs
 */
async function handleNavigation(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
): Promise<void> {
  // Only handle main frame navigations
  if (details.frameId !== 0) return;

  const { blocked } = await shouldBlockUrl(details.url);

  if (blocked) {
    lastBlockedUrl = details.url;

    // Increment blocked attempts stat
    const stats = await getStorageWithDefault('stats');
    await updateStorage('stats', { blockedAttempts: stats.blockedAttempts + 1 });

    // Redirect to blocked page
    await browserAPI.tabs.update(details.tabId, {
      url: getBlockedPageUrl(details.url),
    });
  }
}

/**
 * Update badge based on focus state
 */
async function updateBadge(): Promise<void> {
  const session = await getStorageWithDefault('focusSession');

  if (session.active) {
    if (session.currentGoal) {
      // Active focus
      await browserAPI.action.setBadgeText({ text: 'ON' });
      await browserAPI.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      await browserAPI.action.setBadgeText({ text: '' });
    }
  } else {
    await browserAPI.action.setBadgeText({ text: '' });
  }
  await browserAPI.action.setBadgeTextColor({ color: '#FFFFFF' });
}

/**
 * Start a focus session
 */
async function startFocus(goalText: string): Promise<FocusSession> {
  const goal: Goal = {
    id: generateId(),
    text: goalText,
    createdAt: Date.now(),
  };

  const session: FocusSession = {
    active: true,
    startedAt: Date.now(),
    currentGoal: goal,
    breakUntil: null,
  };

  await setStorage('focusSession', session);
  await updateBadge();

  console.log('[FinishFirst] Focus started:', goal.text);
  return session;
}

/**
 * Check current tab and block if needed when focus starts
 */
async function checkCurrentTabOnFocusStart(): Promise<void> {
  try {
    const [currentTab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!currentTab || !currentTab.url) return;

    // Skip special pages
    if (currentTab.url.startsWith('chrome://') ||
        currentTab.url.startsWith('about:') ||
        currentTab.url.startsWith('edge://') ||
        currentTab.url.startsWith('moz-extension://')) {
      return;
    }

    const { blocked } = await shouldBlockUrl(currentTab.url);
    if (blocked && currentTab.id) {
      // Block the current tab
      await browserAPI.tabs.update(currentTab.id, {
        url: getBlockedPageUrl(currentTab.url),
      });
      console.log('[FinishFirst] Blocked current tab after focus started:', currentTab.url);
    }
  } catch (error) {
    console.error('[FinishFirst] Error checking current tab on focus start:', error);
  }
}

/**
 * Complete the current task
 */
async function completeTask(): Promise<boolean> {
  const session = await getStorageWithDefault('focusSession');

  if (!session.active || !session.currentGoal) {
    return false;
  }

  // Calculate focus duration
  const focusDuration = session.startedAt ? Math.floor((Date.now() - session.startedAt) / 60000) : 0;

  // Update stats
  const stats = await getStorageWithDefault('stats');
  await updateStorage('stats', {
    completedTasks: stats.completedTasks + 1,
    focusMinutes: stats.focusMinutes + focusDuration,
  });

  // Mark goal as completed and save to history
  const completedGoal: Goal = {
    ...session.currentGoal,
    completedAt: Date.now(),
  };

  const completedGoals = await getStorageWithDefault('completedGoals');
  await setStorage('completedGoals', [...completedGoals, completedGoal]);

  // End focus session after completion
  await updateStorage('focusSession', {
    active: false,
    startedAt: null,
    currentGoal: null,
    breakUntil: null,
  });

  await updateBadge();
  console.log('[FinishFirst] Task completed! Focus session ended.');

  return true;
}

/**
 * Cancel the current focus session
 */
async function cancelFocus(): Promise<void> {
  const settings = await getStorageWithDefault('settings');

  if (settings.strictMode) {
    console.log('[FinishFirst] Cannot cancel in strict mode');
    return;
  }

  await setStorage('focusSession', {
    active: false,
    startedAt: null,
    currentGoal: null,
    breakUntil: null,
  });

  await updateBadge();
  console.log('[FinishFirst] Focus cancelled');
}

/**
 * Handle tab activation - check if we need to block
 */
async function handleTabActivated(activeInfo: { tabId: number; windowId: number }): Promise<void> {
  console.log('[FinishFirst] Tab activated:', activeInfo.tabId);
  try {
    // First check if blocking should be active at all
    const blockingActive = await shouldBlock();
    console.log('[FinishFirst] Blocking active:', blockingActive);
    if (!blockingActive) {
      return;
    }

    const tab = await browserAPI.tabs.get(activeInfo.tabId);
    console.log('[FinishFirst] Tab info:', tab?.id, tab?.url, tab?.status);

    if (!tab) {
      console.log('[FinishFirst] Tab not found');
      return;
    }

    // If URL is not available yet, wait for tab to finish loading
    if (!tab.url) {
      console.log('[FinishFirst] Tab URL not available, waiting for load');
      return;
    }

    // Skip special pages and extension pages
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('moz-extension://') ||
        tab.url.includes('blocked/blocked.html')) {
      console.log('[FinishFirst] Skipping special page:', tab.url);
      return;
    }

    // Check if this tab should be blocked
    const { blocked, reason } = await shouldBlockUrl(tab.url);
    console.log('[FinishFirst] Should block:', blocked, 'reason:', reason, 'url:', tab.url);

    if (blocked) {
      // Block the tab - redirect to blocked page
      await browserAPI.tabs.update(tab.id!, {
        url: getBlockedPageUrl(tab.url),
      });
      console.log('[FinishFirst] Blocked tab on activation:', tab.url);
    }
  } catch (error) {
    console.error('[FinishFirst] Error handling tab activation:', error);
  }
}

/**
 * Handle tab update - check if we need to block
 */
async function handleTabUpdate(_tabId: number, changeInfo: { status?: string; url?: string }, tab: chrome.tabs.Tab): Promise<void> {
  try {
    // Only check when tab finishes loading and URL changes
    if (changeInfo.status !== 'complete' || !changeInfo.url) return;

    // First check if blocking should be active at all
    if (!(await shouldBlock())) {
      return;
    }

    if (tab.active) return; // Skip if tab is already active (handled by handleTabActivated)

    // Skip special pages and extension pages
    if (changeInfo.url.startsWith('chrome://') ||
        changeInfo.url.startsWith('about:') ||
        changeInfo.url.startsWith('edge://') ||
        changeInfo.url.startsWith('moz-extension://') ||
        changeInfo.url.includes('blocked/blocked.html')) {
      return;
    }

    // Note: tab.setIcon is not available in all browsers, so we'll skip this feature
    // Just log the fact that this tab would be blocked if activated
    const { blocked } = await shouldBlockUrl(changeInfo.url);
    if (blocked) {
      console.log('[FinishFirst] Background tab would be blocked if activated:', changeInfo.url);
    }
  } catch (error) {
    console.error('[FinishFirst] Error handling tab update:', error);
  }
}

// Extension lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[FinishFirst] Installed');
    await updateBadge();
  } else if (details.reason === 'update') {
    console.log('[FinishFirst] Updated to', chrome.runtime.getManifest().version);
  }
});

// Navigation listener for blocking
chrome.webNavigation.onCommitted.addListener(handleNavigation);

// Tab activation listener for blocking
browserAPI.tabs.onActivated.addListener(handleTabActivated);

// Tab update listener for blocking background tabs
browserAPI.tabs.onUpdated.addListener(handleTabUpdate);

// Message handlers
onMessage({
  START_FOCUS: async ({ goalText }) => {
    const session = await startFocus(goalText);
    // Check current tab and block if needed
    await checkCurrentTabOnFocusStart();
    return { success: true, session };
  },

  COMPLETE_TASK: async () => {
    const success = await completeTask();
    return { success };
  },

  CANCEL_FOCUS: async () => {
    const settings = await getStorageWithDefault('settings');
    if (settings.strictMode) {
      return { success: false };
    }
    await cancelFocus();
    return { success: true };
  },

  GET_FOCUS_STATE: async () => {
    const session = await getStorageWithDefault('focusSession');
    const isBlocking = await shouldBlock();
    return { session, isBlocking };
  },

  ADD_WHITELIST: async ({ pattern, label }) => {
    const newPattern: WhitelistPattern = {
      id: generateId(),
      pattern,
      label,
      enabled: true,
    };

    const whitelist = await getStorageWithDefault('whitelist');
    await setStorage('whitelist', [...whitelist, newPattern]);

    return { success: true, pattern: newPattern };
  },

  REMOVE_WHITELIST: async ({ id }) => {
    const whitelist = await getStorageWithDefault('whitelist');
    await setStorage(
      'whitelist',
      whitelist.filter((p) => p.id !== id)
    );
    return { success: true };
  },

  TOGGLE_WHITELIST: async ({ id, enabled }) => {
    const whitelist = await getStorageWithDefault('whitelist');
    await setStorage(
      'whitelist',
      whitelist.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
    return { success: true };
  },

  GET_WHITELIST: async () => {
    const patterns = await getStorageWithDefault('whitelist');
    return { patterns };
  },

  CHECK_URL: async ({ url }) => {
    const result = await shouldBlockUrl(url);
    return { allowed: !result.blocked, reason: result.reason };
  },

  GET_SETTINGS: async () => {
    const settings = await getStorageWithDefault('settings');
    return { settings };
  },

  UPDATE_SETTINGS: async (updates) => {
    const before = await getStorageWithDefault('settings');
    await updateStorage('settings', updates);
    const after = await getStorageWithDefault('settings');
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    (Object.keys(updates) as (keyof typeof updates)[]).forEach((key) => {
      if (before[key] !== after[key]) {
        changed[String(key)] = { from: before[key], to: after[key] };
      }
    });
    if (Object.keys(changed).length > 0) {
      console.log('[FinishFirst] Settings updated:', changed);
    }
    return { success: true };
  },

  GET_STATS: async () => {
    const stats = await getStorageWithDefault('stats');
    return { stats };
  },

  GET_BLOCKED_INFO: async () => {
    const session = await getStorageWithDefault('focusSession');
    return {
      goal: session.currentGoal,
      blockedUrl: lastBlockedUrl,
    };
  },
});

// Initialize on load
updateBadge();
console.log('[FinishFirst] Background script loaded');
