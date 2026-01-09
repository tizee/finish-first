/**
 * Cross-browser API abstraction layer
 * Handles differences between Chrome (MV3) and Firefox (MV2) APIs
 */

// Detect Firefox - it has native 'browser' API
const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';

/**
 * Unified browser API wrapper that works across Chrome and Firefox
 */
export const browserAPI = {
  /**
   * Runtime APIs for messaging and extension lifecycle
   */
  runtime: {
    sendMessage: <T = unknown>(message: unknown): Promise<T> => {
      if (isFirefox) {
        return browser.runtime.sendMessage(message) as Promise<T>;
      }
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome.runtime.sendMessage(message) as Promise<T>;
      }
      return Promise.reject(new Error('Runtime API not available'));
    },

    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void => {
        if (isFirefox) {
          browser.runtime.onMessage.addListener(callback);
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.onMessage.addListener(callback);
        }
      },
    },

    getURL: (path: string): string => {
      if (isFirefox) {
        return browser.runtime.getURL(path);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome.runtime.getURL(path);
      }
      return path;
    },

    openOptionsPage: (): Promise<void> => {
      if (isFirefox) {
        return Promise.resolve(browser.runtime.openOptionsPage());
      }
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve) => {
          chrome.runtime.openOptionsPage(resolve);
        });
      }
      return Promise.reject(new Error('Runtime API not available'));
    },
  },

  /**
   * Internationalization APIs
   */
  i18n: {
    getMessage: (key: string, substitutions?: string | string[]): string => {
      if (isFirefox) {
        return browser.i18n.getMessage(key, substitutions);
      }
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.getMessage(key, substitutions);
      }
      return key;
    },
  },

  /**
   * Tab management APIs
   */
  tabs: {
    get: (tabId: number): Promise<chrome.tabs.Tab> => {
      if (isFirefox) {
        return browser.tabs.get(tabId);
      }
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        return chrome.tabs.get(tabId);
      }
      return Promise.reject(new Error('Tabs API not available'));
    },

    query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      if (isFirefox) {
        return browser.tabs.query(queryInfo);
      }
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        return chrome.tabs.query(queryInfo);
      }
      return Promise.reject(new Error('Tabs API not available'));
    },

    update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab | undefined> => {
      if (isFirefox) {
        return browser.tabs.update(tabId, updateProperties);
      }
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        return chrome.tabs.update(tabId, updateProperties);
      }
      return Promise.reject(new Error('Tabs API not available'));
    },

    onActivated: {
      addListener: (callback: (activeInfo: { tabId: number; windowId: number }) => void): void => {
        if (isFirefox) {
          browser.tabs.onActivated.addListener(callback);
        } else if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.onActivated.addListener(callback);
        }
      },
    },

    onUpdated: {
      addListener: (callback: (tabId: number, changeInfo: { status?: string; url?: string }, tab: chrome.tabs.Tab) => void): void => {
        if (isFirefox) {
          browser.tabs.onUpdated.addListener(callback as any);
        } else if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.onUpdated.addListener(callback as any);
        }
      },
    },
  },

  /**
   * Window management APIs
   */
  windows: {
    getCurrent: (): Promise<chrome.windows.Window> => {
      if (isFirefox) {
        return browser.windows.getCurrent();
      }
      if (typeof chrome !== 'undefined' && chrome.windows) {
        return new Promise((resolve) => {
          chrome.windows.getCurrent((window) => {
            resolve(window);
          });
        });
      }
      return Promise.reject(new Error('Windows API not available'));
    },

    getAll: (getInfo: { populate?: boolean; windowTypes?: chrome.windows.WindowType[] }): Promise<chrome.windows.Window[]> => {
      if (isFirefox) {
        return browser.windows.getAll(getInfo) as Promise<chrome.windows.Window[]>;
      }
      if (typeof chrome !== 'undefined' && chrome.windows) {
        return new Promise((resolve) => {
          chrome.windows.getAll(getInfo, (windows) => {
            resolve(windows);
          });
        });
      }
      return Promise.reject(new Error('Windows API not available'));
    },
  },

  /**
   * Browser action / action APIs (badge, icon)
   */
  action: {
    setBadgeText: (details: chrome.action.BadgeTextDetails): Promise<void> => {
      if (isFirefox) {
        if (browser.browserAction) {
          browser.browserAction.setBadgeText(details);
        }
        return Promise.resolve();
      }
      if (typeof chrome !== 'undefined') {
        if (chrome.action) {
          return chrome.action.setBadgeText(details);
        } else if (chrome.browserAction) {
          return new Promise((resolve) => {
            chrome.browserAction.setBadgeText(details, resolve);
          });
        }
      }
      return Promise.reject(new Error('Action API not available'));
    },

    setBadgeBackgroundColor: (details: chrome.action.BadgeColorDetails): Promise<void> => {
      if (isFirefox) {
        if (browser.browserAction) {
          browser.browserAction.setBadgeBackgroundColor(details);
        }
        return Promise.resolve();
      }
      if (typeof chrome !== 'undefined') {
        if (chrome.action) {
          return chrome.action.setBadgeBackgroundColor(details);
        } else if (chrome.browserAction) {
          return new Promise((resolve) => {
            chrome.browserAction.setBadgeBackgroundColor(details, resolve);
          });
        }
      }
      return Promise.reject(new Error('Action API not available'));
    },

    setBadgeTextColor: (details: chrome.action.BadgeColorDetails): Promise<void> => {
      // Firefox MV2 browserAction doesn't support setBadgeTextColor
      if (isFirefox) {
        return Promise.resolve();
      }
      if (typeof chrome !== 'undefined' && chrome.action) {
        return chrome.action.setBadgeTextColor(details);
      }
      return Promise.resolve();
    },
  },

  /**
   * Storage APIs
   */
  storage: {
    local: {
      get: <T>(keys: string | string[] | null): Promise<T> => {
        if (isFirefox) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (browser.storage.local as any).get(keys) as Promise<T>;
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (chrome.storage.local as any).get(keys, (result: T) => {
              resolve(result);
            });
          });
        }
        return Promise.reject(new Error('Storage API not available'));
      },

      set: (items: Record<string, unknown>): Promise<void> => {
        if (isFirefox) {
          return browser.storage.local.set(items);
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return chrome.storage.local.set(items);
        }
        return Promise.reject(new Error('Storage API not available'));
      },

      remove: (keys: string | string[]): Promise<void> => {
        if (isFirefox) {
          return browser.storage.local.remove(keys);
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return chrome.storage.local.remove(keys);
        }
        return Promise.reject(new Error('Storage API not available'));
      },

      clear: (): Promise<void> => {
        if (isFirefox) {
          return browser.storage.local.clear();
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return chrome.storage.local.clear();
        }
        return Promise.reject(new Error('Storage API not available'));
      },
    },
  },
};

// TypeScript global declarations for Firefox's browser API
declare global {
  interface Window {
    browser: typeof chrome;
  }
  const browser: typeof chrome;
}
