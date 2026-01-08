/**
 * FinishFirst Storage Schema
 * Type-safe storage for goals, whitelist, and focus sessions
 */

import { browserAPI } from './browser-api';

/**
 * A single goal/task
 */
export interface Goal {
  id: string;
  text: string;
  createdAt: number;
  completedAt?: number;
}

/**
 * Whitelist pattern entry
 */
export interface WhitelistPattern {
  id: string;
  pattern: string; // regex pattern string
  label: string; // human-readable label
  enabled: boolean;
}

/**
 * Focus session data
 */
export interface FocusSession {
  active: boolean;
  startedAt: number | null;
  currentGoal: Goal | null;
  breakUntil: number | null; // timestamp when break ends (free browsing allowed)
}

/**
 * Daily statistics
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  completedTasks: number;
  focusMinutes: number;
  blockedAttempts: number;
}

/**
 * Storage schema for FinishFirst
 */
export interface StorageSchema {
  settings: {
    breakDuration: number; // minutes of free browsing after task completion
    strictMode: boolean; // prevent disabling focus without completing
    theme: 'light' | 'dark' | 'system';
  };
  whitelist: WhitelistPattern[];
  focusSession: FocusSession;
  stats: DailyStats;
  completedGoals: Goal[]; // history of completed goals
}

/**
 * Default whitelist patterns - essential sites that should always work
 */
const defaultWhitelist: WhitelistPattern[] = [
  {
    id: 'chrome-internal',
    pattern: '^chrome://',
    label: 'Chrome Internal Pages',
    enabled: true,
  },
  {
    id: 'chrome-extension',
    pattern: '^chrome-extension://',
    label: 'Chrome Extensions',
    enabled: true,
  },
  {
    id: 'edge-internal',
    pattern: '^edge://',
    label: 'Edge Internal Pages',
    enabled: true,
  },
];

/**
 * Get today's date string
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Default values for storage
 */
export const storageDefaults: StorageSchema = {
  settings: {
    breakDuration: 5,
    strictMode: false,
    theme: 'system',
  },
  whitelist: defaultWhitelist,
  focusSession: {
    active: false,
    startedAt: null,
    currentGoal: null,
    breakUntil: null,
  },
  stats: {
    date: getTodayString(),
    completedTasks: 0,
    focusMinutes: 0,
    blockedAttempts: 0,
  },
  completedGoals: [],
};

/**
 * Get a value from storage with type safety
 */
export async function getStorage<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await browserAPI.storage.local.get<Record<K, StorageSchema[K]>>(key);
  return result[key];
}

/**
 * Get a value from storage with a default fallback
 */
export async function getStorageWithDefault<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K]> {
  const result = await getStorage(key);

  // Special handling for stats - reset if date changed
  if (key === 'stats' && result) {
    const stats = result as DailyStats;
    if (stats.date !== getTodayString()) {
      const freshStats = { ...storageDefaults.stats, date: getTodayString() };
      await setStorage('stats', freshStats);
      return freshStats as StorageSchema[K];
    }
  }

  return result ?? storageDefaults[key];
}

/**
 * Set a value in storage with type safety
 */
export async function setStorage<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await browserAPI.storage.local.set({ [key]: value });
}

/**
 * Update a nested value in storage
 */
export async function updateStorage<K extends keyof StorageSchema>(
  key: K,
  updates: Partial<StorageSchema[K]>
): Promise<void> {
  const current = await getStorageWithDefault(key);
  const updated = { ...current, ...updates } as StorageSchema[K];
  await setStorage(key, updated);
}

/**
 * Remove a key from storage
 */
export async function removeStorage<K extends keyof StorageSchema>(key: K): Promise<void> {
  await browserAPI.storage.local.remove(key);
}

/**
 * Clear all storage
 */
export async function clearStorage(): Promise<void> {
  await browserAPI.storage.local.clear();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
