/**
 * FinishFirst Blocked Page
 * Shows when user tries to visit a blocked site
 */

import { sendMessage } from '../shared/messaging';

// Motivational quotes
const quotes = [
  '"The secret of getting ahead is getting started." - Mark Twain',
  '"Focus on being productive instead of busy." - Tim Ferriss',
  '"It\'s not that I\'m so smart, it\'s just that I stay with problems longer." - Einstein',
  '"The way to get started is to quit talking and begin doing." - Walt Disney',
  '"You don\'t have to be great to start, but you have to start to be great." - Zig Ziglar',
  '"Discipline is choosing between what you want now and what you want most." - Abraham Lincoln',
  '"Small daily improvements are the key to staggering long-term results." - Unknown',
  '"The only way to do great work is to love what you do." - Steve Jobs',
];

// DOM elements
const icon = document.getElementById('icon')!;
const title = document.getElementById('title')!;
const subtitle = document.getElementById('subtitle')!;
const goalCard = document.getElementById('goalCard')!;
const goalLabel = document.getElementById('goalLabel')!;
const goalText = document.getElementById('goalText')!;
const blockedUrlContainer = document.getElementById('blockedUrlContainer')!;
const blockedUrl = document.getElementById('blockedUrl')!;
const completeBtn = document.getElementById('completeBtn') as HTMLButtonElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const motivationText = document.getElementById('motivationText')!;

// Get blocked URL from query params
const urlParams = new URLSearchParams(window.location.search);
const originalUrl = urlParams.get('url') || '';

/**
 * Initialize the blocked page
 */
async function init(): Promise<void> {
  // Set random motivation quote
  motivationText.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  // Show blocked URL
  if (originalUrl) {
    try {
      const url = new URL(originalUrl);
      blockedUrl.textContent = url.hostname + (url.pathname !== '/' ? url.pathname : '');
    } catch {
      blockedUrl.textContent = originalUrl;
    }
  } else {
    blockedUrlContainer.style.display = 'none';
  }

  // Load focus state
  await loadFocusState();

  // Set up event listeners
  completeBtn.addEventListener('click', handleComplete);
  backBtn.addEventListener('click', handleBack);
}

/**
 * Load and display the current focus state
 */
async function loadFocusState(): Promise<void> {
  const { session } = await sendMessage({ type: 'GET_FOCUS_STATE' });

  if (session.breakUntil && Date.now() < session.breakUntil) {
    // On break - shouldn't be here, redirect back
    showBreakMode(session.breakUntil);
    return;
  }

  if (session.currentGoal) {
    goalText.textContent = session.currentGoal.text;
    goalText.classList.remove('no-goal');
  } else {
    goalText.textContent = 'No active goal set';
    goalText.classList.add('no-goal');
    completeBtn.style.display = 'none';
  }

  // Show focus duration if available
  if (session.startedAt) {
    const minutes = Math.floor((Date.now() - session.startedAt) / 60000);
    if (minutes > 0) {
      goalLabel.textContent = `Your Goal (${minutes} min focused)`;
    }
  }
}

/**
 * Show break mode UI
 */
function showBreakMode(breakUntil: number): void {
  icon.textContent = '🎉';
  title.textContent = 'Great job!';
  subtitle.textContent = 'You\'re on a break. Enjoy your free browsing time!';

  goalCard.classList.add('break-mode');
  goalLabel.textContent = 'Break Time Remaining';

  completeBtn.textContent = '→ Continue to Site';
  completeBtn.onclick = () => {
    if (originalUrl) {
      window.location.href = originalUrl;
    } else {
      window.history.back();
    }
  };

  // Start countdown
  updateBreakTimer(breakUntil);
  const interval = setInterval(() => {
    const remaining = breakUntil - Date.now();
    if (remaining <= 0) {
      clearInterval(interval);
      window.location.reload();
    } else {
      updateBreakTimer(breakUntil);
    }
  }, 1000);
}

/**
 * Update break timer display
 */
function updateBreakTimer(breakUntil: number): void {
  const remaining = Math.max(0, breakUntil - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  // Clear and rebuild safely
  goalText.textContent = '';
  const timerSpan = document.createElement('span');
  timerSpan.style.fontSize = '32px';
  timerSpan.style.color = '#22c55e';
  timerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  goalText.appendChild(timerSpan);
}

/**
 * Handle task completion
 */
async function handleComplete(): Promise<void> {
  completeBtn.disabled = true;
  completeBtn.textContent = 'Completing...';

  const result = await sendMessage({ type: 'COMPLETE_TASK' });

  if (result.success && result.breakUntil) {
    showBreakMode(result.breakUntil);
  } else {
    completeBtn.disabled = false;
    completeBtn.textContent = '✓ I\'ve Completed My Task';
    alert('Could not complete task. Please try again.');
  }
}

/**
 * Handle going back
 */
function handleBack(): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

// Initialize
init();
