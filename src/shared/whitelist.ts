/**
 * Whitelist URL Pattern Matching
 * Utilities for checking URLs against whitelist URL regular expressions
 * (URLPattern syntax)
 */

import type { WhitelistPattern } from './storage';

/**
 * Compile a pattern into a URLPattern, returning null for invalid patterns.
 * Supports various formats:
 * - Full URLs: https://example.com/*
 * - Domain only: example.com
 * - Partial URLs: example.com/path
 * - Wildcard domains: *.example.com
 */
function compilePattern(pattern: string): URLPattern | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  try {
    // Try as full URL pattern first
    return new URLPattern(trimmed, { ignoreCase: true });
  } catch (e) {
    // If full URL pattern fails, try domain-only patterns
    try {
      // Check if it looks like a domain without protocol
      if (!trimmed.includes('://') && !trimmed.startsWith('*://')) {
        // Handle domain-only patterns
        if (trimmed.startsWith('.')) {
          // Subdomain wildcard like .example.com
          return new URLPattern({ host: `*${trimmed}`, pathname: '*' }, { ignoreCase: true });
        } else if (trimmed.startsWith('*.')) {
          // Subdomain wildcard like *.example.com
          return new URLPattern({ host: trimmed, pathname: '*' }, { ignoreCase: true });
        } else {
          // Exact domain match
          return new URLPattern({ host: trimmed, pathname: '*' }, { ignoreCase: true });
        }
      }
    } catch (e2) {
      // Try as path pattern
      try {
        if (trimmed.startsWith('/')) {
          return new URLPattern({ pathname: trimmed }, { ignoreCase: true });
        }
      } catch (e3) {
        // All attempts failed
        return null;
      }
    }
    return null;
  }
}

/**
 * Check if a URL matches any enabled whitelist pattern
 */
export function isUrlWhitelisted(url: string, patterns: WhitelistPattern[]): boolean {
  // Handle special new tab case for Firefox
  if (url === 'about:newtab') {
    // Check if there's a specific pattern for newtab
    const newtabPattern = patterns.find(p =>
      p.enabled && (p.pattern === 'about:newtab' || p.pattern === '*://newtab/*')
    );
    return !!newtabPattern;
  }

  for (const pattern of patterns) {
    if (!pattern.enabled) continue;

    // Skip overly broad patterns that might break new tab
    if (pattern.pattern === 'newtab' || pattern.pattern === '*newtab*') {
      continue;
    }

    const urlPattern = compilePattern(pattern.pattern);
    if (!urlPattern) {
      // Invalid pattern, skip
      console.warn(`[FinishFirst] Invalid pattern: ${pattern.pattern}`);
      continue;
    }

    try {
      if (urlPattern.test(url)) {
        return true;
      }
    } catch (e) {
      console.warn(`[FinishFirst] Error testing pattern ${pattern.pattern}:`, e);
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
