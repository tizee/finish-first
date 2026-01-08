/**
 * Whitelist URL Pattern Matching
 * Utilities for checking URLs against whitelist URL regular expressions
 * (URLPattern syntax)
 */

import 'urlpattern-polyfill';
import type { WhitelistPattern } from './storage';

/**
 * Compile a pattern into a URLPattern, returning null for invalid patterns.
 * Only absolute URL patterns are accepted (no baseURL provided).
 */
function compilePattern(pattern: string): URLPattern | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  try {
    return new URLPattern(trimmed, { ignoreCase: true });
  } catch {
    return null;
  }
}

/**
 * Check if a URL matches any enabled whitelist pattern
 */
export function isUrlWhitelisted(url: string, patterns: WhitelistPattern[]): boolean {
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;

    const urlPattern = compilePattern(pattern.pattern);
    if (!urlPattern) {
      // Invalid pattern, skip
      console.warn(`[FinishFirst] Invalid pattern: ${pattern.pattern}`);
      continue;
    }

    if (urlPattern.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate a regex pattern string
 */
export function isValidPattern(pattern: string): boolean {
  return compilePattern(pattern) !== null;
}

/**
 * Common pattern templates for users
 */
export const patternTemplates = [
  {
    label: 'Google Docs',
    pattern: 'http{s}?://docs.google.com/*',
  },
  {
    label: 'GitHub',
    pattern: 'http{s}?://github.com/*',
  },
  {
    label: 'Stack Overflow',
    pattern: 'http{s}?://stackoverflow.com/*',
  },
  {
    label: 'MDN Web Docs',
    pattern: 'http{s}?://developer.mozilla.org/*',
  },
  {
    label: 'Notion',
    pattern: 'http{s}?://www.notion.so/*',
  },
];
