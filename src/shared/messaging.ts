/**
 * FinishFirst Messaging
 * Type-safe message passing between extension components
 */

import { browserAPI } from './browser-api';
import type { Goal, FocusSession, WhitelistPattern, DailyStats, StorageSchema } from './storage';

/**
 * Message type definitions for FinishFirst
 */
export type MessageType =
  // Focus Session
  | { type: 'START_FOCUS'; payload: { goalText: string } }
  | { type: 'COMPLETE_TASK'; payload?: undefined }
  | { type: 'CANCEL_FOCUS'; payload?: undefined }
  | { type: 'GET_FOCUS_STATE'; payload?: undefined }
  // Whitelist
  | { type: 'ADD_WHITELIST'; payload: { pattern: string; label: string } }
  | { type: 'REMOVE_WHITELIST'; payload: { id: string } }
  | { type: 'TOGGLE_WHITELIST'; payload: { id: string; enabled: boolean } }
  | { type: 'GET_WHITELIST'; payload?: undefined }
  | { type: 'CHECK_URL'; payload: { url: string } }
  // Settings
  | { type: 'GET_SETTINGS'; payload?: undefined }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<StorageSchema['settings']> }
  // Stats
  | { type: 'GET_STATS'; payload?: undefined }
  // Blocked page
  | { type: 'GET_BLOCKED_INFO'; payload?: undefined };

/**
 * Response type mapping
 */
export interface MessageResponseMap {
  START_FOCUS: { success: boolean; session?: FocusSession };
  COMPLETE_TASK: { success: boolean };
  CANCEL_FOCUS: { success: boolean };
  GET_FOCUS_STATE: { session: FocusSession; isBlocking: boolean };
  ADD_WHITELIST: { success: boolean; pattern?: WhitelistPattern };
  REMOVE_WHITELIST: { success: boolean };
  TOGGLE_WHITELIST: { success: boolean };
  GET_WHITELIST: { patterns: WhitelistPattern[] };
  CHECK_URL: { allowed: boolean; reason?: string };
  GET_SETTINGS: { settings: StorageSchema['settings'] };
  UPDATE_SETTINGS: { success: boolean };
  GET_STATS: { stats: DailyStats };
  GET_BLOCKED_INFO: { goal: Goal | null; blockedUrl: string };
}

export type MessageTypeName = MessageType['type'];
export type MessageResponse<T extends MessageTypeName> = MessageResponseMap[T];

/**
 * Send a typed message to the background script
 */
export async function sendMessage<T extends MessageType>(
  message: T
): Promise<MessageResponse<T['type']>> {
  return browserAPI.runtime.sendMessage<MessageResponse<T['type']>>(message);
}

/**
 * Message handler function type
 */
export type MessageHandler<T extends MessageTypeName> = (
  payload: Extract<MessageType, { type: T }>['payload'],
  sender: chrome.runtime.MessageSender
) => Promise<MessageResponse<T>> | MessageResponse<T>;

/**
 * Partial handlers object
 */
export type MessageHandlers = {
  [K in MessageTypeName]?: MessageHandler<K>;
};

/**
 * Register message handlers in the background script
 */
export function onMessage(handlers: MessageHandlers): void {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const typedMessage = message as MessageType;

    if (!typedMessage || typeof typedMessage !== 'object' || !('type' in typedMessage)) {
      return false;
    }

    const handler = handlers[typedMessage.type as MessageTypeName];

    if (handler) {
      const result = handler(typedMessage.payload as never, sender);

      if (result instanceof Promise) {
        result.then(sendResponse).catch((error) => {
          console.error(`[FinishFirst] Error handling ${typedMessage.type}:`, error);
          sendResponse({ success: false, error: String(error) });
        });
        return true;
      }

      sendResponse(result);
      return false;
    }

    return false;
  });
}
