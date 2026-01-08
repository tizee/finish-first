# FinishFirst

FinishFirst is a browser extension for ADHD-friendly focus. Set a single goal, block distractions, and finish the task before browsing.

## Features

- **Single-goal focus**: Only block when a task is active.
- **Whitelist with URLPattern**: Patterns are absolute URL regular expressions; `*` matches zero or more characters.
- **Strict Mode**: Prevent canceling focus without completing the task.
- **Blocked page**: Shows the current goal and lets you complete it to resume browsing.
- **Stats**: Tracks completed tasks and total focus time.

## Tech Overview

- **Chrome**: Manifest V3 service worker
- **Firefox**: Manifest V2 background page (module script)
- **URLPattern**: Uses `urlpattern-polyfill` for Firefox compatibility

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Build

```bash
# Chrome
pnpm build:chrome

# Firefox
pnpm build:firefox
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `dist-chrome`

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `dist-firefox/manifest.json`

## Usage

1. Open the popup and enter your current goal.
2. Click **Begin Focus Session**.
3. Non-whitelisted sites redirect to the blocked page.
4. Mark the task as complete to end the focus session.

## URL Pattern Examples

Patterns use the [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) syntax and must be **absolute** URLs:

```
http{s}?://www.bilibili.com/*
http{s}?://github.com/*
chrome://*
moz-extension://*/*
```

## Project Structure

```
src/
  background/        # blocking logic, session management
  blocked/           # blocked page UI
  popup/             # quick goal setting
  options/           # whitelist + strict mode settings
  shared/            # storage, messaging, whitelist utils
  _locales/          # i18n strings
```

## Notes

- Default protected whitelist entries include internal browser URLs (e.g., `chrome://*`, `moz-extension://*/*`).
- “Total Time” in the popup reflects completed-task focus time (not the current running timer).

## License

MIT
