/**
 * FinishFirst Options Page
 * Settings and whitelist pattern management
 */

import { browserAPI } from '../shared/browser-api';
import { sendMessage } from '../shared/messaging';
import { patternTemplates, isValidPattern } from '../shared/whitelist';
import type { WhitelistPattern } from '../shared/storage';

// DOM elements
const breakDurationInput = document.getElementById('breakDuration') as HTMLInputElement;
const strictModeToggle = document.getElementById('strictMode') as HTMLInputElement;
const patternInput = document.getElementById('patternInput') as HTMLInputElement;
const labelInput = document.getElementById('labelInput') as HTMLInputElement;
const addPatternBtn = document.getElementById('addPatternBtn') as HTMLButtonElement;
const whitelistList = document.getElementById('whitelistList')!;
const templatesContainer = document.getElementById('templates')!;
const savedMsg = document.getElementById('savedMsg')!;

/**
 * Apply i18n translations
 */
function applyI18n(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const message = browserAPI.i18n.getMessage(key);
      if (message) {
        if (el.tagName === 'TITLE' || el.tagName === 'OPTION') {
          el.textContent = message;
        } else if (el instanceof HTMLInputElement) {
          el.placeholder = message;
        } else {
          el.textContent = message;
        }
      }
    }
  });
}

/**
 * Show saved message
 */
function showSavedMessage(): void {
  savedMsg.classList.add('visible');
  setTimeout(() => {
    savedMsg.classList.remove('visible');
  }, 2000);
}

/**
 * Load and display settings
 */
async function loadSettings(): Promise<void> {
  const { settings } = await sendMessage({ type: 'GET_SETTINGS' });

  breakDurationInput.value = String(settings.breakDuration);
  strictModeToggle.checked = settings.strictMode;
}

/**
 * Save settings
 */
async function saveSettings(): Promise<void> {
  await sendMessage({
    type: 'UPDATE_SETTINGS',
    payload: {
      breakDuration: parseInt(breakDurationInput.value, 10) || 5,
      strictMode: strictModeToggle.checked,
    },
  });
  showSavedMessage();
}

/**
 * Create whitelist item element
 */
function createWhitelistItem(pattern: WhitelistPattern): HTMLElement {
  const item = document.createElement('div');
  item.className = `whitelist-item${pattern.enabled ? '' : ' disabled'}`;
  item.dataset.id = pattern.id;

  const info = document.createElement('div');
  info.className = 'whitelist-item-info';

  const label = document.createElement('div');
  label.className = 'whitelist-item-label';
  label.textContent = pattern.label;

  const patternText = document.createElement('div');
  patternText.className = 'whitelist-item-pattern';
  patternText.textContent = pattern.pattern;

  info.appendChild(label);
  info.appendChild(patternText);

  const actions = document.createElement('div');
  actions.className = 'whitelist-item-actions';

  // Toggle button
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle';
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = pattern.enabled;
  toggleInput.addEventListener('change', async () => {
    await sendMessage({
      type: 'TOGGLE_WHITELIST',
      payload: { id: pattern.id, enabled: toggleInput.checked },
    });
    item.classList.toggle('disabled', !toggleInput.checked);
  });
  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'toggle-slider';
  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleSlider);

  // Delete button (only for non-default patterns)
  if (!pattern.id.startsWith('chrome-') && !pattern.id.startsWith('edge-')) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Remove pattern';
    deleteBtn.addEventListener('click', async () => {
      await sendMessage({ type: 'REMOVE_WHITELIST', payload: { id: pattern.id } });
      item.remove();
      checkEmptyList();
    });
    actions.appendChild(toggleLabel);
    actions.appendChild(deleteBtn);
  } else {
    actions.appendChild(toggleLabel);
  }

  item.appendChild(info);
  item.appendChild(actions);

  return item;
}

/**
 * Check if whitelist is empty and show message
 */
function checkEmptyList(): void {
  const items = whitelistList.querySelectorAll('.whitelist-item');
  const existingEmpty = whitelistList.querySelector('.whitelist-empty');

  if (items.length === 0 && !existingEmpty) {
    const empty = document.createElement('div');
    empty.className = 'whitelist-empty';
    empty.textContent = 'No whitelist patterns added yet.';
    whitelistList.appendChild(empty);
  } else if (items.length > 0 && existingEmpty) {
    existingEmpty.remove();
  }
}

/**
 * Load and render whitelist patterns
 */
async function loadWhitelist(): Promise<void> {
  const { patterns } = await sendMessage({ type: 'GET_WHITELIST' });

  whitelistList.textContent = '';

  for (const pattern of patterns) {
    whitelistList.appendChild(createWhitelistItem(pattern));
  }

  checkEmptyList();
}

/**
 * Add a new whitelist pattern
 */
async function addPattern(pattern: string, label: string): Promise<void> {
  if (!pattern.trim()) {
    patternInput.focus();
    return;
  }

  if (!isValidPattern(pattern)) {
    alert('Invalid regex pattern. Please check the syntax.');
    return;
  }

  const result = await sendMessage({
    type: 'ADD_WHITELIST',
    payload: {
      pattern: pattern.trim(),
      label: label.trim() || pattern.trim(),
    },
  });

  if (result.success && result.pattern) {
    // Remove empty message if exists
    const emptyMsg = whitelistList.querySelector('.whitelist-empty');
    if (emptyMsg) emptyMsg.remove();

    whitelistList.appendChild(createWhitelistItem(result.pattern));
    patternInput.value = '';
    labelInput.value = '';
    showSavedMessage();
  }
}

/**
 * Render pattern templates
 */
function renderTemplates(): void {
  templatesContainer.textContent = '';

  for (const template of patternTemplates) {
    const btn = document.createElement('button');
    btn.className = 'template-btn';
    btn.textContent = `+ ${template.label}`;
    btn.addEventListener('click', () => {
      addPattern(template.pattern, template.label);
    });
    templatesContainer.appendChild(btn);
  }
}

/**
 * Initialize options page
 */
async function init(): Promise<void> {
  applyI18n();

  // Load data
  await loadSettings();
  await loadWhitelist();
  renderTemplates();

  // Set up event listeners
  breakDurationInput.addEventListener('change', saveSettings);
  strictModeToggle.addEventListener('change', saveSettings);

  addPatternBtn.addEventListener('click', () => {
    addPattern(patternInput.value, labelInput.value);
  });

  // Allow Enter to add pattern
  labelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addPattern(patternInput.value, labelInput.value);
    }
  });

  patternInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      labelInput.focus();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
