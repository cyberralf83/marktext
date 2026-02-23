# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is MarkText

MarkText is an Electron-based WYSIWYG markdown editor built with Vue 2, Vuex, and a custom editor engine called Muya. It runs on macOS, Linux, and Windows.

## Common Commands

```bash
# Development
yarn dev                  # Start dev mode (webpack-dev-server + electron)

# Building
yarn build:dev            # Build without packaging
yarn build                # Build and package for current platform
yarn build:bin            # Build unpacked binary (faster, for testing)

# Linting
yarn lint                 # ESLint check
yarn lint:fix             # ESLint autofix

# Testing
yarn unit                 # Unit tests (Karma + Mocha + Chai in Electron)
yarn e2e                  # E2E tests (Playwright, requires pack first)
yarn test                 # Both unit + e2e
yarn test:specs           # CommonMark/GFM spec compliance tests
```

## Architecture

### Process Model

Standard Electron two-process architecture:

- **Main process** (`src/main/index.js` → `dist/electron/main.js`): Window management, native menus, file I/O, IPC hub
- **Renderer process** (`src/renderer/main.js`): Vue 2 SPA with Vuex store and Vue Router

### Key Architectural Components

**`src/main/app/accessor.js`** — Main-process dependency injection container. Wires together Preferences, DataCenter, CommandManager, Keybindings, AppMenu, and WindowManager.

**`src/main/app/index.js`** — `App` class: lifecycle manager and centralized IPC listener hub.

**`src/renderer/store/listenForMain.js`** — Centralized handler converting all incoming IPC messages from main process into Vuex actions/mutations.

### Muya Editor Engine (`src/muya/`)

Muya is a self-contained WYSIWYG markdown editor with its own package.json. It can be built/published independently (`yarn build:muya`).

- **Document model** (`src/muya/lib/contentState/`): Tree of block objects (`{ key, type, text, parent, children, ... }`), NOT a Vue/React virtual DOM. ContentState is assembled from ~25 mixin modules via prototype injection.
- **Parser** (`src/muya/lib/parser/`): Customized fork of `marked.js` for tokenization.
- **Rendering** (`src/muya/lib/parser/render/`): Uses **snabbdom** virtual DOM to patch the browser DOM from block state.
- **Event handling** (`src/muya/lib/eventHandler/`): Keyboard, mouse, clipboard, drag/drop.
- **UI widgets** (`src/muya/lib/ui/`): Floating toolbars, image pickers, table pickers, emoji/front-matter pickers.
- **Public API**: `Muya` class instantiated with a DOM container. Key methods: `setMarkdown`, `getMarkdown`, `format`, `search`, `undo`, `redo`, `exportStyledHTML`, `destroy`.

### Renderer Structure

| Path | Purpose |
|---|---|
| `src/renderer/pages/app.vue` | Main editor page |
| `src/renderer/pages/preference.vue` | Preferences page |
| `src/renderer/components/editorWithTabs/` | Tab bar and editor container |
| `src/renderer/components/sideBar/` | File tree, search, TOC panels |
| `src/renderer/components/commandPalette/` | Quick open / command palette |
| `src/renderer/prefComponents/` | Preference panels |

### Vuex Store Modules (`src/renderer/store/`)

`editor` (tabs, current file, TOC), `preferences` (all settings), `project` (sidebar file tree), `layout` (UI visibility), `commandCenter` (command palette), `listenForMain` (IPC→Vuex bridge), `autoUpdates`, `notification`, `tweet`.

### IPC Convention

All IPC channels use the `mt::` prefix (e.g., `mt::open-file`, `mt::set-theme`). Both directions use this convention.

## Build System

Webpack configs live in `.electron-vue/`:
- `webpack.main.config.js` — Main process, externalizes all `dependencies`
- `webpack.renderer.config.js` — Renderer process, includes vue-loader, svg-sprite-loader, css pipeline
- `dev-runner.js` — Parallel dev build: renderer on port 9091 with HMR, main via webpack.watch(), spawns Electron

**Webpack aliases**: `@` → `src/renderer`, `muya` → `src/muya`, `main` → `src/main`, `common` → `src/common`

## Code Style

- ESLint with `standard` config, 2-space indent, no semicolons
- Vue single-file components (`.vue`)
- ESM imports throughout (transpiled by Babel)
- `src/common/` for code shared between main and renderer processes

## Test Structure

- **Unit tests** (`test/unit/specs/`): Markdown parser tests running in Karma+Electron. Fixture data in `test/unit/data/`.
- **Spec compliance** (`test/specs/`): Tests against official CommonMark 0.30 and GFM 0.29 JSON spec suites.
- **E2E** (`test/e2e/`): Playwright tests (launch, XSS). Requires `yarn pack` before running.
