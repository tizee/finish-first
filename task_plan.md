# Task Plan: FinishFirst Browser Extension

## Goal
Create an ADHD productivity browser extension that helps users stay focused by setting goals, maintaining a URL whitelist with regex patterns, blocking non-whitelisted sites, and redirecting to a focus page until tasks are completed.

## Phases
- [x] Phase 1: Project setup - Copy template structure and configure for FinishFirst
- [x] Phase 2: Define storage schema and data models for goals, whitelist, and focus sessions
- [x] Phase 3: Implement core blocking logic in background script with webNavigation API
- [x] Phase 4: Create blocked page (redirect destination) with goal display and completion UI
- [x] Phase 5: Build popup UI for quick goal setting and whitelist management
- [x] Phase 6: Implement options page for detailed whitelist regex configuration
- [x] Phase 7: Add focus session tracking and completion flow
- [x] Phase 8: Build and verify extension

## Architecture Decisions
- Use `webNavigation.onCommitted` for blocking (more flexible than declarativeNetRequest, allows dynamic regex matching)
- Store whitelist patterns as regex strings, compile at runtime for matching
- Blocked page shows current goal and "Mark Complete" button
- After completion, user gets X minutes of free browsing (configurable via breakDuration setting)
- Default whitelist includes chrome:// and chrome-extension:// to prevent breaking browser functionality

## Core Features Implemented
1. **Goal Setting**: Set current focus task via popup UI
2. **URL Whitelist**: Regex patterns for allowed sites during focus (managed in options page)
3. **Smart Blocking**: Block all non-whitelisted URLs, redirect to blocked page
4. **Task Completion**: Mark task done to unlock browsing temporarily (break time)
5. **Focus Stats**: Track daily completed tasks and focus minutes
6. **Strict Mode**: Optional setting to prevent canceling focus without completion

## File Structure
```
finish-first/
├── src/
│   ├── background/index.ts      # Blocking logic, session management
│   ├── popup/                   # Goal setting UI
│   │   ├── popup.html
│   │   └── index.ts
│   ├── options/                 # Whitelist pattern management
│   │   ├── options.html
│   │   └── index.ts
│   ├── blocked/                 # Blocked page with goal display
│   │   ├── blocked.html
│   │   └── index.ts
│   ├── shared/
│   │   ├── storage.ts          # Focus session & whitelist storage
│   │   ├── messaging.ts        # Type-safe message passing
│   │   ├── whitelist.ts        # Regex pattern matching utilities
│   │   └── browser-api.ts      # Cross-browser compatibility
│   ├── _locales/               # i18n (en, zh)
│   └── manifest.v3.json
├── vite.config.js
├── package.json
└── tsconfig.json
```

## How to Use

### Build
```bash
cd finish-first
pnpm install
pnpm build:chrome    # For Chrome
pnpm build:firefox   # For Firefox
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist-chrome` folder

### Usage
1. Click the extension icon to open popup
2. Enter your current goal/task
3. Click "Start Focus" to activate blocking
4. All non-whitelisted sites will redirect to the blocked page
5. Complete your task and click "Complete Task" to get a break
6. Configure whitelist patterns in the options page

## Status
**COMPLETED** - Extension is ready for use
