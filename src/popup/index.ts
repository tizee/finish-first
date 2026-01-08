/**
 * FinishFirst Popup Script
 * Goal setting and focus session management UI
 */

import { browserAPI } from '../shared/browser-api';
import { sendMessage } from '../shared/messaging';

// DOM elements
const goalCard = document.getElementById('goalCard')!;
const goalStatus = document.getElementById('goalStatus')!;
const inactiveView = document.getElementById('inactiveView')!;
const activeView = document.getElementById('activeView')!;
const breakView = document.getElementById('breakView')!;
const goalInput = document.getElementById('goalInput') as HTMLTextAreaElement;
const goalText = document.getElementById('goalText')!;
const goalTimer = document.getElementById('goalTimer')!;
const breakTimer = document.getElementById('breakTimer')!;
const completedCount = document.getElementById('completedCount')!;
const focusTime = document.getElementById('focusTime')!;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const completeBtn = document.getElementById('completeBtn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const newGoalBtn = document.getElementById('newGoalBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;

let timerInterval: number | null = null;

/**
 * Apply i18n translations
 */
function applyI18n(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const message = browserAPI.i18n.getMessage(key);
      if (message) {
        el.textContent = message;
      }
    }
  });
}

/**
 * Format minutes as "Xh Ym" or "Xm"
 */
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Format remaining time as "M:SS"
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Show the appropriate view based on session state
 */
function showView(view: 'inactive' | 'active' | 'break'): void {
  inactiveView.classList.add('hidden');
  activeView.classList.add('hidden');
  breakView.classList.add('hidden');

  goalCard.classList.remove('active', 'on-break');

  if (view === 'inactive') {
    inactiveView.classList.remove('hidden');
    goalStatus.textContent = 'Ready';
    goalStatus.className = 'goal-status inactive';
  } else if (view === 'active') {
    activeView.classList.remove('hidden');
    goalCard.classList.add('active');
    goalStatus.textContent = 'Focusing';
    goalStatus.className = 'goal-status active';
  } else if (view === 'break') {
    breakView.classList.remove('hidden');
    goalCard.classList.add('on-break');
    goalStatus.textContent = 'Break';
    goalStatus.className = 'goal-status break';
  }
}

/**
 * Update the focus timer display
 */
function updateFocusTimer(startedAt: number): void {
  const elapsed = Date.now() - startedAt;
  const minutes = Math.floor(elapsed / 60000);
  // Update the span inside goalTimer
  const timerSpan = goalTimer.querySelector('span');
  if (timerSpan) {
    timerSpan.textContent = `Focused for ${formatDuration(minutes)}`;
  }
}

/**
 * Update the break timer display
 */
function updateBreakTimer(breakUntil: number): void {
  const remaining = breakUntil - Date.now();
  if (remaining <= 0) {
    // Break is over, reload state
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    loadState();
  } else {
    breakTimer.textContent = formatTimeRemaining(remaining);
  }
}

/**
 * Load and display current state
 */
async function loadState(): Promise<void> {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Load stats
  const { stats } = await sendMessage({ type: 'GET_STATS' });
  completedCount.textContent = String(stats.completedTasks);
  focusTime.textContent = formatDuration(stats.focusMinutes);

  // Load session state
  const { session } = await sendMessage({ type: 'GET_FOCUS_STATE' });

  // Check if on break
  if (session.breakUntil && Date.now() < session.breakUntil) {
    showView('break');
    updateBreakTimer(session.breakUntil);
    timerInterval = window.setInterval(() => {
      updateBreakTimer(session.breakUntil!);
    }, 1000);
    return;
  }

  // Check if active with goal
  if (session.active && session.currentGoal) {
    showView('active');
    goalText.textContent = session.currentGoal.text;

    if (session.startedAt) {
      updateFocusTimer(session.startedAt);
      timerInterval = window.setInterval(() => {
        updateFocusTimer(session.startedAt!);
      }, 60000); // Update every minute
    }
    return;
  }

  // Otherwise show inactive view
  showView('inactive');
}

/**
 * Handle start focus button
 */
async function handleStartFocus(): Promise<void> {
  const text = goalInput.value.trim();
  if (!text) {
    goalInput.focus();
    return;
  }

  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';

  try {
    const result = await sendMessage({ type: 'START_FOCUS', payload: { goalText: text } });
    if (result.success) {
      goalInput.value = '';
      await loadState();
    }
  } catch (error) {
    console.error('Failed to start focus:', error);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Begin Focus Session';
  }
}

/**
 * Handle complete task button
 */
async function handleCompleteTask(): Promise<void> {
  completeBtn.disabled = true;
  completeBtn.textContent = 'Completing...';

  try {
    const result = await sendMessage({ type: 'COMPLETE_TASK' });
    if (result.success) {
      await loadState();
    }
  } catch (error) {
    console.error('Failed to complete task:', error);
  } finally {
    completeBtn.disabled = false;
    completeBtn.textContent = 'Mark as Complete';
  }
}

/**
 * Handle cancel focus button
 */
async function handleCancelFocus(): Promise<void> {
  cancelBtn.disabled = true;

  try {
    const result = await sendMessage({ type: 'CANCEL_FOCUS' });
    if (result.success) {
      await loadState();
    } else {
      alert('Cannot cancel in strict mode. Complete your task first!');
    }
  } catch (error) {
    console.error('Failed to cancel focus:', error);
  } finally {
    cancelBtn.disabled = false;
  }
}

/**
 * Handle new goal button (during break)
 */
async function handleNewGoal(): Promise<void> {
  // End break and show inactive view
  await sendMessage({ type: 'CANCEL_FOCUS' });
  await loadState();
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  applyI18n();

  // Set up event listeners
  startBtn.addEventListener('click', handleStartFocus);
  completeBtn.addEventListener('click', handleCompleteTask);
  cancelBtn.addEventListener('click', handleCancelFocus);
  newGoalBtn.addEventListener('click', handleNewGoal);

  settingsBtn.addEventListener('click', () => {
    browserAPI.runtime.openOptionsPage();
  });

  // Allow Enter to start focus (Shift+Enter for newline)
  goalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartFocus();
    }
  });

  // Load initial state
  await loadState();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
