/**
 * Whitelist URL Pattern Matching
 * Utilities for checking URLs against whitelist regex patterns
 */

import type { WhitelistPattern } from './storage';

/**
 * Check if a URL matches any enabled whitelist pattern
 */
export function isUrlWhitelisted(url: string, patterns: WhitelistPattern[]): boolean {
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;

    try {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(url)) {
        return true;
      }
    } catch {
      // Invalid regex pattern, skip
      console.warn(`[FinishFirst] Invalid regex pattern: ${pattern.pattern}`);
    }
  }
  return false;
}

/**
 * Validate a regex pattern string
 */
export function isValidPattern(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common pattern templates for users
 */
export const patternTemplates = [
  {
    label: 'Google Docs',
    pattern: '^https://docs\\.google\\.com/.*',
  },
  {
    label: 'GitHub',
    pattern: '^https://github\\.com/.*',
  },
  {
    label: 'Stack Overflow',
    pattern: '^https://stackoverflow\\.com/.*',
  },
  {
    label: 'MDN Web Docs',
    pattern: '^https://developer\\.mozilla\\.org/.*',
  },
  {
    label: 'Notion',
    pattern: '^https://www\\.notion\\.so/.*',
  },
];
