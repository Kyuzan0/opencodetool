# OpenCode Manager — Electron Desktop App

## TL;DR

> **Quick Summary**: Build a Windows Electron desktop app with React/TypeScript that provides a modern dark-themed GUI for managing OpenCode configuration files (`opencode.json` and `oh-my-openagent.json[c]`), plugins, skills, and includes an integrated terminal.
> 
> **Deliverables**:
> - Complete Electron app with electron-vite + React + TypeScript + Tailwind CSS
> - 6 main pages: Dashboard, OpenCode Config Editor, Agent Config Editor, Plugin Manager, Skill Manager, Settings
> - Integrated terminal with shell auto-detection
> - Backup/Restore system for all configs
> - File browser with auto-detection of OpenCode project directories
> 
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 → Task 2 → Task 5 → Task 8 → Task 14 → Task 18 → Task 22 → F1-F4

---

## Context

### Original Request
User wants a centralized Electron desktop app to manage all OpenCode configuration through a modern GUI instead of manually editing JSON files. The app must handle `opencode.json` (provider/model config) and `oh-my-openagent.json[c]` (agent/category/hooks config), support both global and project-level configs, manage plugins via bun/npm, manage skills, and include an embedded terminal.

### Interview Summary
**Key Discussions**:
- **Config scope**: opencode.json + oh-my-openagent.json[c] only (NOT kilo.jsonc)
- **Config levels**: Both global (`~/.config/opencode/`) and project-level (`.opencode/`)
- **Package manager**: Bun at custom path `C:\Apps\bun\bin\bun.exe` (v1.3.12), app must auto-detect bun at non-standard paths, fallback to npm
- **UI**: Tailwind CSS with dark theme default
- **State**: Zustand
- **Terminal**: Auto-detect shells (PowerShell, cmd, bash/WSL), user selectable
- **Build**: electron-vite (Vite-based)
- **Tests**: No automated tests — agent QA only

**Research Findings**:
- `opencode.json` schema: $schema, plugin[], disabled_providers[], provider{name, npm, options{baseURL, apiKey?}, models{name, limit{context, output}, modalities{input[], output[]}, reasoning?}}, permission{}, model, small_model, compaction{auto, prune}
- `oh-my-openagent.json[c]` schema: agents (11 built-in: sisyphus, hephaestus, oracle, librarian, explore, atlas, prometheus, metis, momus, multimodal-looker, sisyphus-junior), categories (8: quick, visual-engineering, ultrabrain, artistry, deep, unspecified-low, unspecified-high, writing), background_task{providerConcurrency, modelConcurrency, defaultConcurrency}, experimental, tmux, hooks (40+), mcps, lsp, skills
- oh-my-openagent supports JSONC (comments, trailing commas), schema at `https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json`
- Legacy filename `oh-my-opencode.json[c]` still recognized during transition
- Plugin ecosystem: npm packages listed in opencode.json `plugin` array, installed via bun/npm
- Bun confirmed at `C:\Apps\bun\bin\bun.exe` v1.3.12 (NOT in system PATH)

### Gap Analysis
**Identified Gaps** (addressed):
- API key security: Added show/hide toggle for sensitive fields
- Config corruption prevention: Auto-backup before every write, JSON validation before save
- First-time user: Handle missing config files gracefully (create with defaults)
- Unknown fields preservation: Parse and re-serialize without dropping unknown keys
- Bun detection: Scan common paths + registry + user-configured path
- JSONC handling: Use `jsonc-parser` library (same as oh-my-openagent uses)

---

## Work Objectives

### Core Objective
Deliver a production-ready Electron desktop application that replaces manual JSON editing with an intuitive GUI for all OpenCode configuration management.

### Concrete Deliverables
- `package.json` with all dependencies, runnable via `npm install && npm start`
- Electron main process with IPC handlers for file I/O, shell detection, plugin management
- React renderer with 6 pages + sidebar navigation
- Config read/write service supporting JSON and JSONC formats
- Plugin manager with bun/npm integration
- Skill manager for .md-based skills
- Embedded terminal via xterm.js + node-pty
- Backup/restore system
- Dark/light theme toggle with Tailwind

### Definition of Done
- [ ] `npm install && npm run dev` launches the app without errors
- [ ] All 6 pages render and navigate correctly
- [ ] opencode.json can be loaded, edited, previewed, and saved
- [ ] oh-my-openagent.json[c] can be loaded, edited, and saved
- [ ] Plugins can be installed/uninstalled via GUI
- [ ] Terminal opens and accepts commands
- [ ] Backup creates a .zip, restore loads from .zip
- [ ] Dark/light theme toggle works

### Must Have
- Form validation on all config editors (prevent invalid JSON)
- Auto-backup before any config write
- Preserve unknown/unrecognized fields in config files
- Show/hide toggle for API key fields
- Graceful handling when config files don't exist
- Bun auto-detection at custom paths (scan C:\Apps\bun, %USERPROFILE%\.bun, PATH)
- JSONC support (read/write with comments preserved where possible)

### Must NOT Have (Guardrails)
- NO kilo.jsonc editing (out of scope)
- NO .kilo/ directory management (out of scope)
- NO plugin marketplace/registry browsing (manual input + known list only)
- NO auto-update mechanism (keep it simple)
- NO cloud sync or remote features
- NO multi-window support (single window app)
- NO writing API keys to logs or console
- NO deleting config files without explicit user confirmation
- NO overwriting configs without backup

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: None
- **Framework**: None

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Terminal/CLI**: Use Bash — Run commands, validate output
- **File I/O**: Use Bash — Read/write files, compare contents

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: Project scaffolding (electron-vite + React + TS + Tailwind) [quick]
├── Task 2: TypeScript types & interfaces for all config schemas [quick]
├── Task 3: Zustand store skeleton (config state, UI state, settings state) [quick]
└── Task 4: Tailwind theme config + dark/light CSS variables [quick]

Wave 2 (Core Services — after Wave 1):
├── Task 5: Config file service (read/write/parse JSON & JSONC, backup) [deep]
├── Task 6: Bun/npm detection service (scan paths, registry, fallback) [unspecified-high]
├── Task 7: Shell detection service (PowerShell, cmd, bash/WSL) [quick]
├── Task 8: Sidebar layout + React Router navigation [visual-engineering]
└── Task 9: Reusable form components (text input, select, toggle, JSON editor, key-value editor) [visual-engineering]

Wave 3 (Pages — after Wave 2):
├── Task 10: Dashboard page (status cards, quick actions) [visual-engineering]
├── Task 11: OpenCode Config Editor page (opencode.json) [deep]
├── Task 12: Agent Config Editor page (oh-my-openagent.json) [deep]
├── Task 13: Plugin Manager page [unspecified-high]
├── Task 14: Skill Manager page [unspecified-high]
└── Task 15: Settings page (theme, language, paths) [visual-engineering]

Wave 4 (Advanced Features — after Wave 3):
├── Task 16: Integrated Terminal (xterm.js + node-pty + IPC) [deep]
├── Task 17: Backup & Restore system [unspecified-high]
├── Task 18: File Browser & Project Auto-Detection [unspecified-high]
└── Task 19: JSON Preview panel (live preview with syntax highlighting) [visual-engineering]

Wave 5 (Integration & Polish — after Wave 4):
├── Task 20: Cross-page integration (dashboard reads from all stores) [unspecified-high]
├── Task 21: Error handling & toast notifications [quick]
├── Task 22: Window chrome (title bar, menu, tray) [quick]
└── Task 23: Final build config (electron-builder, icons, metadata) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2-9 | 1 |
| 2 | 1 | 5, 11, 12 | 1 |
| 3 | 1 | 10-15, 20 | 1 |
| 4 | 1 | 8, 9, 10-15 | 1 |
| 5 | 1, 2 | 11, 12, 17, 18 | 2 |
| 6 | 1 | 13 | 2 |
| 7 | 1 | 16 | 2 |
| 8 | 1, 4 | 10-15 | 2 |
| 9 | 1, 4 | 11, 12, 13, 14, 15 | 2 |
| 10 | 3, 4, 8 | 20 | 3 |
| 11 | 2, 3, 5, 8, 9 | 19, 20 | 3 |
| 12 | 2, 3, 5, 8, 9 | 19, 20 | 3 |
| 13 | 3, 6, 8, 9 | 20 | 3 |
| 14 | 3, 5, 8, 9 | 20 | 3 |
| 15 | 3, 4, 8, 9 | - | 3 |
| 16 | 7, 8 | - | 4 |
| 17 | 5 | - | 4 |
| 18 | 5, 8 | 10 | 4 |
| 19 | 11, 12 | - | 4 |
| 20 | 10-14, 18 | - | 5 |
| 21 | 8 | - | 5 |
| 22 | 1 | 23 | 5 |
| 23 | 22 | - | 5 |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1-T4 → `quick`
- **Wave 2**: **5 tasks** — T5 → `deep`, T6 → `unspecified-high`, T7 → `quick`, T8-T9 → `visual-engineering`
- **Wave 3**: **6 tasks** — T10 → `visual-engineering`, T11-T12 → `deep`, T13-T14 → `unspecified-high`, T15 → `visual-engineering`
- **Wave 4**: **4 tasks** — T16 → `deep`, T17-T18 → `unspecified-high`, T19 → `visual-engineering`
- **Wave 5**: **4 tasks** — T20 → `unspecified-high`, T21-T23 → `quick`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Project Scaffolding — electron-vite + React + TypeScript + Tailwind

  **What to do**:
  - Initialize electron-vite project with React + TypeScript template in `D:\laragon\www\app\opencodetool`
  - Configure `package.json` with all required dependencies:
    - Core: `electron`, `electron-vite`, `react`, `react-dom`, `react-router-dom`
    - UI: `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/forms`, `lucide-react` (icons)
    - State: `zustand`
    - Config parsing: `jsonc-parser`
    - Terminal: `xterm`, `@xterm/addon-fit`, `node-pty`
    - Utils: `archiver`, `extract-zip` (backup/restore), `glob` (file scanning)
    - Dev: `typescript`, `@types/react`, `@types/react-dom`, `electron-builder`
  - Configure `electron.vite.config.ts` with proper main/preload/renderer entries
  - Configure `tailwind.config.js` with dark mode class strategy, custom color palette for dark/light themes
  - Configure `tsconfig.json` for both main and renderer processes with path aliases (`@main/*`, `@renderer/*`, `@shared/*`)
  - Create directory structure:
    ```
    src/
    ├── main/           # Electron main process
    │   ├── index.ts    # Main entry, window creation
    │   ├── ipc/        # IPC handlers
    │   └── services/   # Backend services
    ├── preload/
    │   └── index.ts    # Preload script, contextBridge API
    ├── renderer/       # React app
    │   ├── src/
    │   │   ├── App.tsx
    │   │   ├── main.tsx
    │   │   ├── index.css     # Tailwind imports
    │   │   ├── components/   # Reusable UI components
    │   │   ├── pages/        # Page components
    │   │   ├── stores/       # Zustand stores
    │   │   ├── hooks/        # Custom React hooks
    │   │   ├── lib/          # Utilities
    │   │   └── types/        # Shared types
    │   └── index.html
    └── shared/         # Types shared between main & renderer
        └── types/
    ```
  - Create minimal `src/main/index.ts` that creates a BrowserWindow (1280x800, dark background)
  - Create `src/preload/index.ts` with contextBridge exposing `electronAPI` namespace
  - Create minimal `src/renderer/src/App.tsx` with "OpenCode Manager" placeholder text
  - Verify `npm run dev` launches the Electron window

  **Must NOT do**:
  - Do NOT install kilo-related packages
  - Do NOT add testing frameworks
  - Do NOT configure auto-update

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard scaffolding with well-known tools, no complex logic
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA scenario to verify the Electron window launches

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1 (first task, others depend on it)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 9
  - **Blocked By**: None

  **References**:

  **External References**:
  - electron-vite docs: `https://electron-vite.org/guide/` — Project setup and config structure
  - electron-vite React template: `https://github.com/alex8088/electron-vite/tree/main/packages/create-electron` — Scaffolding reference
  - Tailwind CSS v3 dark mode: `https://tailwindcss.com/docs/dark-mode` — Class-based dark mode strategy

  **Acceptance Criteria**:
  - [ ] `package.json` exists with all listed dependencies
  - [ ] `npm install` completes without errors
  - [ ] `npm run dev` launches Electron window (1280x800)
  - [ ] Directory structure matches specification above
  - [ ] TypeScript compiles without errors (`npx tsc --noEmit`)

  **QA Scenarios**:

  ```
  Scenario: App launches successfully
    Tool: Bash
    Preconditions: Fresh npm install completed
    Steps:
      1. Run `npm run dev` in background, wait 15 seconds
      2. Check process list for electron process running
      3. Kill the process
    Expected Result: Electron process found running, no crash errors in console output
    Failure Indicators: Process not found, error messages in stdout/stderr
    Evidence: .sisyphus/evidence/task-1-app-launch.txt

  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code
    Expected Result: Exit code 0, no type errors
    Failure Indicators: Non-zero exit code, type error messages
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt
  ```

  **Commit**: YES
  - Message: `feat(scaffold): init electron-vite project with React, TS, Tailwind, Zustand`
  - Files: All project files
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. TypeScript Types & Interfaces for All Config Schemas

  **What to do**:
  - Create `src/shared/types/opencode-config.ts` with full TypeScript interfaces for `opencode.json`:
    ```typescript
    interface OpenCodeConfig {
      $schema?: string;
      plugin?: string[];
      disabled_providers?: string[];
      provider?: Record<string, ProviderConfig>;
      permission?: Record<string, 'allow' | 'ask'>;
      model?: string;
      small_model?: string;
      compaction?: { auto?: boolean; prune?: boolean };
    }
    interface ProviderConfig {
      name: string;
      npm?: string;
      options?: { baseURL?: string; apiKey?: string; [key: string]: unknown };
      models?: Record<string, ModelConfig>;
    }
    interface ModelConfig {
      name: string;
      limit?: { context?: number; output?: number };
      modalities?: { input?: string[]; output?: string[] };
      reasoning?: boolean;
      [key: string]: unknown; // preserve unknown fields
    }
    ```
  - Create `src/shared/types/agent-config.ts` with full TypeScript interfaces for `oh-my-openagent.json[c]`:
    ```typescript
    interface AgentPluginConfig {
      $schema?: string;
      agents?: Record<string, AgentOverride>;
      categories?: Record<string, CategoryConfig>;
      background_task?: BackgroundTaskConfig;
      experimental?: Record<string, boolean>;
      tmux?: { enabled?: boolean };
      hooks?: Record<string, HookConfig>;
      mcps?: Record<string, McpConfig>;
      lsp?: Record<string, LspConfig>;
      skills?: Record<string, SkillConfig>;
      [key: string]: unknown;
    }
    // AgentOverride: model, variant, temperature, top_p, prompt_append, permissions
    // CategoryConfig: model, variant, temperature, top_p
    // BackgroundTaskConfig: providerConcurrency, modelConcurrency, defaultConcurrency
    // HookConfig, McpConfig, LspConfig, SkillConfig — all with proper typing
    ```
  - Create `src/shared/types/app-types.ts` for application-level types:
    ```typescript
    interface AppSettings { theme: 'dark' | 'light'; language: string; defaultConfigPath: string; recentProjects: string[] }
    interface ConfigLocation { type: 'global' | 'project'; path: string; exists: boolean }
    interface PluginInfo { name: string; version: string; enabled: boolean; installed: boolean }
    interface SkillInfo { name: string; path: string; description: string; priority: number }
    interface ShellInfo { name: string; path: string; available: boolean }
    ```
  - Create `src/shared/types/ipc-types.ts` for IPC channel type definitions (request/response types for all IPC calls)
  - Create `src/shared/types/index.ts` barrel export

  **Must NOT do**:
  - Do NOT use Zod or runtime validation here (types only, validation is in Task 5)
  - Do NOT add kilo.jsonc types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definition work, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4 after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 3, 4)
  - **Blocks**: Tasks 5, 11, 12
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `C:\Users\PC1\.config\opencode\opencode.json` — Full opencode.json structure to type against (332 lines, all fields visible)
  - oh-my-openagent schema docs: `https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/configuration.md` — Complete config reference with all agent names, category names, hook names, MCP structure

  **Acceptance Criteria**:
  - [ ] All 5 type files exist in `src/shared/types/`
  - [ ] `npx tsc --noEmit` passes with no errors
  - [ ] Types cover ALL fields from both config schemas (opencode.json + oh-my-openagent.json)
  - [ ] All interfaces use `[key: string]: unknown` for extensibility

  **QA Scenarios**:

  ```
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: Task 1 scaffolding complete
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify all type files exist: src/shared/types/opencode-config.ts, agent-config.ts, app-types.ts, ipc-types.ts, index.ts
    Expected Result: Zero type errors, all 5 files present
    Failure Indicators: Type errors in output, missing files
    Evidence: .sisyphus/evidence/task-2-types-compile.txt

  Scenario: Types match actual config structure
    Tool: Bash
    Preconditions: Type files created
    Steps:
      1. Read `C:\Users\PC1\.config\opencode\opencode.json`
      2. Verify every top-level key in the JSON has a corresponding field in OpenCodeConfig interface
      3. Verify nested structures (provider.*.models.*.limit, etc.) are properly typed
    Expected Result: 1:1 mapping between actual config keys and TypeScript interface fields
    Failure Indicators: Missing fields, wrong types
    Evidence: .sisyphus/evidence/task-2-types-match.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [x] 3. Zustand Store Skeleton

  **What to do**:
  - Create `src/renderer/src/stores/config-store.ts`:
    - State: `openCodeConfig: OpenCodeConfig | null`, `agentConfig: AgentPluginConfig | null`, `configPath: ConfigLocation | null`, `isLoading: boolean`, `isDirty: boolean`, `lastError: string | null`
    - Actions: `loadConfig(path)`, `saveConfig()`, `updateField(path, value)`, `resetChanges()`, `setConfigPath(location)`
  - Create `src/renderer/src/stores/ui-store.ts`:
    - State: `sidebarCollapsed: boolean`, `activePage: string`, `toasts: Toast[]`, `modals: Modal[]`
    - Actions: `toggleSidebar()`, `navigate(page)`, `addToast(toast)`, `removeToast(id)`, `openModal(modal)`, `closeModal(id)`
  - Create `src/renderer/src/stores/settings-store.ts`:
    - State: `theme: 'dark' | 'light'`, `language: string`, `defaultConfigPath: string`, `recentProjects: string[]`, `preferredShell: string`
    - Actions: `setTheme(theme)`, `setLanguage(lang)`, `setDefaultPath(path)`, `addRecentProject(path)`, `setPreferredShell(shell)`
    - Persistence: Use zustand `persist` middleware with `localStorage`
  - Create `src/renderer/src/stores/plugin-store.ts`:
    - State: `plugins: PluginInfo[]`, `isInstalling: boolean`, `installProgress: string`
    - Actions: `loadPlugins()`, `installPlugin(name)`, `uninstallPlugin(name)`, `togglePlugin(name)`
  - Create `src/renderer/src/stores/skill-store.ts`:
    - State: `skills: SkillInfo[]`, `isLoading: boolean`
    - Actions: `loadSkills()`, `createSkill(skill)`, `updateSkill(name, content)`, `deleteSkill(name)`, `reorderSkills(order)`
  - Create `src/renderer/src/stores/index.ts` barrel export

  **Must NOT do**:
  - Do NOT implement actual IPC calls yet (use placeholder async functions that return mock data)
  - Do NOT add Redux or any other state library

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward store definitions with Zustand boilerplate
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4 after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: Tasks 10, 11, 12, 13, 14, 15, 20
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Zustand docs: `https://docs.pmnd.rs/zustand/getting-started/introduction` — Store creation patterns
  - Zustand persist middleware: `https://docs.pmnd.rs/zustand/integrations/persisting-store-data` — localStorage persistence for settings

  **API/Type References**:
  - `src/shared/types/opencode-config.ts:OpenCodeConfig` — Config state shape
  - `src/shared/types/agent-config.ts:AgentPluginConfig` — Agent config state shape
  - `src/shared/types/app-types.ts` — AppSettings, PluginInfo, SkillInfo types

  **Acceptance Criteria**:
  - [ ] All 6 store files exist in `src/renderer/src/stores/`
  - [ ] Each store exports a `use{Name}Store` hook
  - [ ] Settings store uses `persist` middleware
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios**:

  ```
  Scenario: Stores compile and export correctly
    Tool: Bash
    Preconditions: Tasks 1 and 2 complete
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify all store files exist
      3. Grep each store file for `export const use` to confirm hook exports
    Expected Result: Zero errors, all stores export hooks
    Failure Indicators: Type errors, missing exports
    Evidence: .sisyphus/evidence/task-3-stores-compile.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [x] 4. Tailwind Theme Config + Dark/Light CSS Variables

  **What to do**:
  - Update `tailwind.config.js`:
    - Set `darkMode: 'class'`
    - Define custom color palette:
      - `bg-primary`: dark `#0f0f0f` / light `#ffffff`
      - `bg-secondary`: dark `#1a1a2e` / light `#f5f5f5`
      - `bg-sidebar`: dark `#16213e` / light `#e8e8e8`
      - `bg-card`: dark `#1e1e2e` / light `#ffffff`
      - `text-primary`: dark `#e0e0e0` / light `#1a1a1a`
      - `text-secondary`: dark `#a0a0a0` / light `#666666`
      - `accent`: `#6366f1` (indigo-500, both themes)
      - `accent-hover`: `#818cf8` (indigo-400)
      - `border-default`: dark `#2d2d3f` / light `#e0e0e0`
      - `danger`: `#ef4444`, `success`: `#22c55e`, `warning`: `#f59e0b`
    - Add custom font: Inter (or system font stack)
    - Configure content paths for renderer
  - Update `src/renderer/src/index.css`:
    - Import Tailwind layers (`@tailwind base; @tailwind components; @tailwind utilities;`)
    - Define CSS custom properties for theme colors
    - Add base styles: smooth scrollbar, selection color, focus ring styles
    - Add utility classes for common patterns (`.card`, `.btn-primary`, `.btn-secondary`, `.input-field`)
  - Create `src/renderer/src/lib/theme.ts`:
    - `applyTheme(theme: 'dark' | 'light')` — toggles `dark` class on `<html>`
    - `getSystemTheme()` — detects OS preference via `prefers-color-scheme`
    - Hook into settings store to auto-apply theme on change

  **Must NOT do**:
  - Do NOT use CSS-in-JS (styled-components, emotion)
  - Do NOT add complex animation libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS/config work, straightforward
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3 after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 8, 9, 10, 11, 12, 13, 14, 15
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Tailwind dark mode: `https://tailwindcss.com/docs/dark-mode` — Class-based dark mode
  - Tailwind custom colors: `https://tailwindcss.com/docs/customizing-colors` — Extending color palette

  **Acceptance Criteria**:
  - [ ] `tailwind.config.js` has darkMode: 'class' and custom color palette
  - [ ] `index.css` has Tailwind imports and custom utility classes
  - [ ] `theme.ts` exports `applyTheme` and `getSystemTheme`
  - [ ] Dark class on `<html>` toggles theme visually

  **QA Scenarios**:

  ```
  Scenario: Dark theme renders correctly
    Tool: Playwright
    Preconditions: App running with `npm run dev`
    Steps:
      1. Launch app
      2. Verify `<html>` element has class `dark`
      3. Check background color of body is dark (#0f0f0f or similar)
      4. Screenshot the window
    Expected Result: Dark background, light text visible
    Failure Indicators: White background, missing dark class
    Evidence: .sisyphus/evidence/task-4-dark-theme.png
  ```

  **Commit**: NO (groups with Wave 1)

- [x] 5. Config File Service (Read/Write/Parse JSON & JSONC, Backup)

  **What to do**:
  - Create `src/main/services/config-service.ts`:
    - `readConfig(filePath: string): Promise<{ data: object; raw: string; format: 'json' | 'jsonc' }>` — Read and parse JSON or JSONC files using `jsonc-parser`. Detect format by extension (.jsonc) or content (has comments).
    - `writeConfig(filePath: string, data: object, options: { format: 'json' | 'jsonc'; preserveComments?: boolean }): Promise<void>` — Serialize and write config. For JSONC, use `jsonc-parser`'s `modify` to update values while preserving comments where possible. For JSON, use `JSON.stringify(data, null, 2)`.
    - `backupConfig(filePath: string): Promise<string>` — Copy file to `{filePath}.backup.{timestamp}` before any write. Return backup path.
    - `validateConfig(data: object, schema: 'opencode' | 'agent'): { valid: boolean; errors: string[] }` — Validate required fields, type checks, known enum values (permission values, agent names, category names).
    - `getConfigLocations(): Promise<ConfigLocation[]>` — Scan for config files at:
      - Global: `~/.config/opencode/opencode.json`, `~/.config/opencode/oh-my-openagent.json[c]`, `~/.config/opencode/oh-my-opencode.json[c]` (legacy)
      - `%APPDATA%/opencode/` variants
      - Project: `.opencode/opencode.json`, `.opencode/oh-my-openagent.json[c]`
    - `createDefaultConfig(type: 'opencode' | 'agent', path: string): Promise<void>` — Create config file with sensible defaults if it doesn't exist
    - `mergeConfigs(base: object, override: object): object` — Deep merge for project overriding global, preserving unknown keys
  - Create `src/main/ipc/config-ipc.ts`:
    - Register IPC handlers: `config:read`, `config:write`, `config:validate`, `config:locations`, `config:create-default`, `config:backup`
    - Each handler wraps the corresponding service method with error handling
  - Update `src/preload/index.ts` to expose config IPC methods via contextBridge

  **Must NOT do**:
  - Do NOT delete config files (only read/write/backup)
  - Do NOT strip unknown fields from configs (preserve them)
  - Do NOT write API keys to any log output

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core service with complex file I/O, JSONC parsing, error handling, and multiple edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 12, 17, 18
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `C:\Users\PC1\.config\opencode\opencode.json` — Real opencode.json to test against (332 lines)
  - oh-my-openagent config locations: `https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/configuration.md` — File location priority, JSONC support details, legacy filename compatibility

  **External References**:
  - jsonc-parser npm: `https://www.npmjs.com/package/jsonc-parser` — API for parse, modify, format JSONC
  - Electron IPC: `https://www.electronjs.org/docs/latest/tutorial/ipc` — Main/renderer IPC patterns

  **API/Type References**:
  - `src/shared/types/opencode-config.ts:OpenCodeConfig` — Shape to validate against
  - `src/shared/types/agent-config.ts:AgentPluginConfig` — Shape to validate against
  - `src/shared/types/ipc-types.ts` — IPC channel definitions
  - `src/shared/types/app-types.ts:ConfigLocation` — Return type for getConfigLocations

  **Acceptance Criteria**:
  - [ ] `config-service.ts` exports all 6 methods
  - [ ] Can read real `opencode.json` from `C:\Users\PC1\.config\opencode\`
  - [ ] Can read JSONC files with comments without error
  - [ ] Backup file created before every write
  - [ ] Unknown fields preserved after read → modify → write cycle
  - [ ] IPC handlers registered and callable from renderer

  **QA Scenarios**:

  ```
  Scenario: Read real opencode.json successfully
    Tool: Bash
    Preconditions: App running, config-service implemented
    Steps:
      1. Call config:read IPC with path "C:\Users\PC1\.config\opencode\opencode.json"
      2. Verify returned data has `provider` key with `enowxai` and `enowxai2` providers
      3. Verify `model` field equals "enowxai2/claude-opus-4.6"
    Expected Result: Config parsed correctly with all fields intact
    Failure Indicators: Parse error, missing fields, null data
    Evidence: .sisyphus/evidence/task-5-read-config.txt

  Scenario: Write preserves unknown fields
    Tool: Bash
    Preconditions: Config service available
    Steps:
      1. Read a config file with unknown fields
      2. Modify one known field (e.g., change model)
      3. Write back to a temp file
      4. Read the temp file and verify unknown fields still present
    Expected Result: All original fields present in written file, modified field updated
    Failure Indicators: Missing fields, corrupted JSON
    Evidence: .sisyphus/evidence/task-5-preserve-fields.txt

  Scenario: Backup created before write
    Tool: Bash
    Preconditions: Config service available
    Steps:
      1. Write a config to a temp path
      2. Write again to the same path (triggering backup)
      3. Verify backup file exists with timestamp in name
    Expected Result: Backup file exists at {path}.backup.{timestamp}
    Failure Indicators: No backup file created
    Evidence: .sisyphus/evidence/task-5-backup-created.txt
  ```

  **Commit**: YES
  - Message: `feat(services): add config file service with JSON/JSONC parsing and backup`
  - Files: `src/main/services/config-service.ts`, `src/main/ipc/config-ipc.ts`, `src/preload/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 6. Bun/npm Detection Service

  **What to do**:
  - Create `src/main/services/package-manager-service.ts`:
    - `detectBun(): Promise<{ found: boolean; path: string; version: string } | null>` — Scan for bun executable in order:
      1. System PATH (`where bun` / `which bun`)
      2. Common custom paths: `C:\Apps\bun\bin\bun.exe`, `%USERPROFILE%\.bun\bin\bun.exe`, `%LOCALAPPDATA%\bun\bin\bun.exe`
      3. Windows registry (if applicable)
      4. User-configured path from app settings
    - `detectNpm(): Promise<{ found: boolean; path: string; version: string }>` — Detect npm (should always be available)
    - `getPreferredPackageManager(): Promise<'bun' | 'npm'>` — Return bun if found, else npm
    - `runPackageCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }>` — Execute bun/npm command with proper PATH setup
    - `installPlugin(pluginName: string, configDir: string): Promise<void>` — Run `bun add {pluginName}` or `npm install {pluginName}` in the config directory
    - `uninstallPlugin(pluginName: string, configDir: string): Promise<void>` — Run `bun remove` or `npm uninstall`
    - `listInstalledPackages(configDir: string): Promise<Record<string, string>>` — Read package.json dependencies
  - Create `src/main/ipc/package-manager-ipc.ts`:
    - Register IPC handlers: `pm:detect`, `pm:install`, `pm:uninstall`, `pm:list`, `pm:run-command`
  - Update preload to expose package manager IPC

  **Must NOT do**:
  - Do NOT hardcode only one bun path — must scan multiple locations
  - Do NOT run commands without proper error handling and timeout (30s max)
  - Do NOT expose raw shell execution to renderer (only predefined commands)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: System-level detection with multiple fallback paths, process spawning, Windows-specific concerns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 7, 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - Bun confirmed at: `C:\Apps\bun\bin\bun.exe` (v1.3.12) — Primary detection target
  - npm confirmed at: `C:\Apps\nodejs\npx` — Fallback detection target

  **External References**:
  - Node.js child_process: `https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback` — For spawning bun/npm processes

  **Acceptance Criteria**:
  - [ ] `detectBun()` finds bun at `C:\Apps\bun\bin\bun.exe`
  - [ ] `detectNpm()` finds npm at `C:\Apps\nodejs\`
  - [ ] `installPlugin()` successfully runs bun/npm install
  - [ ] Commands have 30s timeout
  - [ ] IPC handlers registered

  **QA Scenarios**:

  ```
  Scenario: Detect bun at custom path
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Call pm:detect IPC
      2. Verify response includes bun with path containing "C:\Apps\bun\bin\bun.exe"
      3. Verify version is "1.3.12" or later
    Expected Result: Bun detected with correct path and version
    Failure Indicators: Bun not found, wrong path
    Evidence: .sisyphus/evidence/task-6-bun-detect.txt

  Scenario: Fallback to npm when bun not available
    Tool: Bash
    Preconditions: Simulate bun not found (mock detection)
    Steps:
      1. Call getPreferredPackageManager with bun paths cleared
      2. Verify it returns "npm"
    Expected Result: Returns "npm" as fallback
    Failure Indicators: Throws error instead of falling back
    Evidence: .sisyphus/evidence/task-6-npm-fallback.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 7. Shell Detection Service

  **What to do**:
  - Create `src/main/services/shell-service.ts`:
    - `detectAvailableShells(): Promise<ShellInfo[]>` — Detect available shells on Windows:
      1. PowerShell 7+ (`pwsh.exe`) — check `C:\Program Files\PowerShell\7\pwsh.exe` and PATH
      2. Windows PowerShell 5.1 (`powershell.exe`) — always available on Windows
      3. Command Prompt (`cmd.exe`) — always available
      4. Git Bash (`bash.exe`) — check `C:\Program Files\Git\bin\bash.exe` and PATH
      5. WSL (`wsl.exe`) — check if WSL is installed
    - `getDefaultShell(): Promise<ShellInfo>` — Return PowerShell 7 if available, else Windows PowerShell 5.1
    - `getShellEnv(shell: ShellInfo): Record<string, string>` — Get environment variables for the shell, including adding bun to PATH if detected
  - Create `src/main/ipc/shell-ipc.ts`:
    - Register IPC handlers: `shell:detect`, `shell:default`, `shell:env`
  - Update preload

  **Must NOT do**:
  - Do NOT assume any specific shell is available (always check)
  - Do NOT modify system PATH permanently

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple detection logic, well-defined paths on Windows
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 16
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - PowerShell 7 confirmed at: `C:\Program Files\PowerShell\7\pwsh.exe` — Primary shell

  **Acceptance Criteria**:
  - [ ] Detects at least PowerShell and cmd.exe
  - [ ] Returns correct paths for each shell
  - [ ] `getShellEnv` includes bun in PATH if detected

  **QA Scenarios**:

  ```
  Scenario: Detect PowerShell 7
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Call shell:detect IPC
      2. Verify response includes entry with name "PowerShell 7" and path containing "pwsh.exe"
    Expected Result: PowerShell 7 detected with correct path
    Failure Indicators: Not found, wrong path
    Evidence: .sisyphus/evidence/task-7-shell-detect.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 8. Sidebar Layout + React Router Navigation

  **What to do**:
  - Create `src/renderer/src/layouts/MainLayout.tsx`:
    - Fixed sidebar on left (width: 240px collapsed: 64px)
    - Main content area on right with scrollable container
    - Bottom status bar (optional, shows current config path)
  - Create `src/renderer/src/components/Sidebar.tsx`:
    - Logo/app name at top ("OpenCode Manager")
    - Navigation items with icons (using lucide-react):
      - Dashboard (`LayoutDashboard` icon)
      - OpenCode Config (`FileJson` icon)
      - Agent Config (`Bot` icon)
      - Plugins (`Puzzle` icon)
      - Skills (`Wand2` icon)
      - Settings (`Settings` icon)
    - Active item highlighted with accent color
    - Collapse/expand toggle button
    - Current config path indicator at bottom
  - Update `src/renderer/src/App.tsx`:
    - Set up React Router with routes for all 6 pages
    - Wrap in MainLayout
    - Create placeholder page components (just title text) for each route
    - Apply dark theme class on mount based on settings store
  - Routes: `/` (Dashboard), `/opencode-config`, `/agent-config`, `/plugins`, `/skills`, `/settings`

  **Must NOT do**:
  - Do NOT implement page content (just placeholders)
  - Do NOT add animations or transitions yet
  - Do NOT use a UI component library (Tailwind only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout and navigation UI work requiring visual design sense
  - **Skills**: [`playwright`]
    - `playwright`: For visual QA verification

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 10, 11, 12, 13, 14, 15, 16, 18
  - **Blocked By**: Tasks 1, 4

  **References**:

  **External References**:
  - React Router v6: `https://reactrouter.com/en/main/start/tutorial` — Route setup
  - lucide-react icons: `https://lucide.dev/icons/` — Icon names and usage

  **Acceptance Criteria**:
  - [ ] Sidebar renders with 6 navigation items
  - [ ] Clicking each item navigates to correct route
  - [ ] Active item visually highlighted
  - [ ] Sidebar collapse/expand works
  - [ ] All 6 placeholder pages render

  **QA Scenarios**:

  ```
  Scenario: Navigation works for all pages
    Tool: Playwright
    Preconditions: App running with `npm run dev`
    Steps:
      1. Launch app, verify sidebar is visible
      2. Click "Dashboard" nav item → verify URL is "/" and page shows "Dashboard" text
      3. Click "OpenCode Config" → verify URL is "/opencode-config"
      4. Click "Agent Config" → verify URL is "/agent-config"
      5. Click "Plugins" → verify URL is "/plugins"
      6. Click "Skills" → verify URL is "/skills"
      7. Click "Settings" → verify URL is "/settings"
      8. Screenshot each page
    Expected Result: All 6 pages accessible, correct URLs, sidebar highlights active item
    Failure Indicators: Navigation doesn't work, blank pages, no highlighting
    Evidence: .sisyphus/evidence/task-8-navigation.png

  Scenario: Sidebar collapse/expand
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Verify sidebar width is ~240px
      2. Click collapse toggle
      3. Verify sidebar width is ~64px
      4. Click expand toggle
      5. Verify sidebar width is ~240px again
    Expected Result: Sidebar toggles between collapsed and expanded states
    Failure Indicators: Toggle doesn't work, layout breaks
    Evidence: .sisyphus/evidence/task-8-sidebar-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(layout): add sidebar navigation with React Router for all pages`
  - Files: `src/renderer/src/layouts/*`, `src/renderer/src/components/Sidebar.tsx`, `src/renderer/src/App.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 9. Reusable Form Components

  **What to do**:
  - Create `src/renderer/src/components/ui/TextInput.tsx` — Label, input, error message, optional description. Supports `type="text"|"password"|"number"|"url"`. Password type has show/hide toggle (eye icon).
  - Create `src/renderer/src/components/ui/SelectInput.tsx` — Label, dropdown select, supports options array with value/label.
  - Create `src/renderer/src/components/ui/ToggleSwitch.tsx` — Label + toggle switch (on/off), with optional description text.
  - Create `src/renderer/src/components/ui/TextArea.tsx` — Label, multi-line textarea with optional monospace font for code/JSON content.
  - Create `src/renderer/src/components/ui/KeyValueEditor.tsx` — Dynamic key-value pair editor. Add/remove rows. Used for provider options, environment variables, etc.
  - Create `src/renderer/src/components/ui/JsonEditor.tsx` — Textarea with monospace font, line numbers (CSS-based), basic syntax highlighting via CSS classes. Shows validation errors below.
  - Create `src/renderer/src/components/ui/ArrayEditor.tsx` — Dynamic list editor. Add/remove/reorder string items. Used for plugin lists, disabled_providers, modalities arrays.
  - Create `src/renderer/src/components/ui/Card.tsx` — Container with title, optional description, border, padding. Used to group form sections.
  - Create `src/renderer/src/components/ui/Button.tsx` — Primary, secondary, danger variants. Loading state with spinner.
  - Create `src/renderer/src/components/ui/Modal.tsx` — Overlay modal with title, content, action buttons. Closes on escape and backdrop click.
  - Create `src/renderer/src/components/ui/Toast.tsx` — Toast notification component (success, error, warning, info). Auto-dismiss after 5s.
  - Create `src/renderer/src/components/ui/Tabs.tsx` — Tab navigation component for switching between sections within a page.
  - Create `src/renderer/src/components/ui/index.ts` — Barrel export

  All components must:
  - Support dark/light theme via Tailwind classes
  - Accept `className` prop for customization
  - Be fully typed with TypeScript
  - Use consistent spacing and sizing

  **Must NOT do**:
  - Do NOT use a component library (Ant Design, MUI, etc.)
  - Do NOT add complex rich text editing
  - Do NOT implement Monaco editor (too heavy — use simple textarea with CSS highlighting)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component design requiring visual consistency and attention to detail
  - **Skills**: [`playwright`]
    - `playwright`: For visual QA of components

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 12, 13, 14, 15
  - **Blocked By**: Tasks 1, 4

  **References**:

  **External References**:
  - Tailwind forms plugin: `https://github.com/tailwindlabs/tailwindcss-forms` — Form element styling
  - lucide-react: `https://lucide.dev/icons/` — Icons for buttons, toggles, etc.

  **Acceptance Criteria**:
  - [ ] All 13 component files exist in `src/renderer/src/components/ui/`
  - [ ] All components accept `className` prop
  - [ ] TextInput password type has show/hide toggle
  - [ ] KeyValueEditor supports add/remove rows
  - [ ] ArrayEditor supports add/remove/reorder
  - [ ] Modal closes on escape and backdrop click
  - [ ] Toast auto-dismisses after 5s
  - [ ] All components render correctly in dark theme

  **QA Scenarios**:

  ```
  Scenario: Form components render in dark theme
    Tool: Playwright
    Preconditions: App running, components imported into a test page
    Steps:
      1. Navigate to a page using TextInput, SelectInput, ToggleSwitch, Button
      2. Verify all components have dark background and light text
      3. Click password show/hide toggle on TextInput type="password"
      4. Verify input type toggles between "password" and "text"
      5. Screenshot the form
    Expected Result: All components styled consistently in dark theme, password toggle works
    Failure Indicators: White backgrounds, invisible text, toggle doesn't work
    Evidence: .sisyphus/evidence/task-9-form-components.png

  Scenario: KeyValueEditor add/remove rows
    Tool: Playwright
    Preconditions: KeyValueEditor rendered on page
    Steps:
      1. Click "Add" button
      2. Verify new empty row appears
      3. Type "key1" in key field, "value1" in value field
      4. Click remove button on the row
      5. Verify row is removed
    Expected Result: Rows can be added and removed dynamically
    Failure Indicators: Add doesn't create row, remove doesn't delete
    Evidence: .sisyphus/evidence/task-9-kv-editor.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add reusable form components with dark theme support`
  - Files: `src/renderer/src/components/ui/*`
  - Pre-commit: `npx tsc --noEmit`

- [x] 10. Dashboard Page

  **What to do**:
  - Create `src/renderer/src/pages/DashboardPage.tsx`:
    - **Status Cards Row** (top): 4 cards showing:
      1. Config Status - loaded config path, last modified, valid/invalid badge
      2. Active Plugins - count of enabled plugins, list of names
      3. Registered Skills - count of skills, list of names
      4. Package Manager - detected bun/npm with version
    - **Quick Actions Section**: Buttons for Open Config, Manage Plugins, Open Terminal, Backup All, Reload Config
    - **Recent Projects Section**: List of recently opened project directories with Open button
    - **System Info**: Config file locations (global path, project path), detected shells
    - All data pulled from Zustand stores. Loading skeleton states while fetching.
  - Wire up store data: on page mount, trigger loadConfig(), loadPlugins(), loadSkills() if not already loaded

  **Must NOT do**:
  - Do NOT add charts or complex visualizations
  - Do NOT add real-time monitoring

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11-15)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 3, 4, 8

  **References**:
  - `src/renderer/src/stores/config-store.ts` - Config state and loading actions
  - `src/renderer/src/stores/plugin-store.ts` - Plugin list and count
  - `src/renderer/src/stores/skill-store.ts` - Skill list and count
  - `src/renderer/src/components/ui/Card.tsx` - Card container component
  - `src/renderer/src/components/ui/Button.tsx` - Action buttons

  **Acceptance Criteria**:
  - [ ] Dashboard renders 4 status cards
  - [ ] Quick action buttons navigate to correct pages
  - [ ] Recent projects list shows entries from settings store
  - [ ] Loading skeletons shown while data loads

  **QA Scenarios**:

  ```
  Scenario: Dashboard renders with status cards
    Tool: Playwright
    Preconditions: App running, config loaded
    Steps:
      1. Navigate to "/" (Dashboard)
      2. Verify 4 status cards are visible
      3. Verify Quick Actions section has 5 buttons
      4. Click "Open Config" button, verify navigation to "/opencode-config"
      5. Screenshot dashboard
    Expected Result: All cards render with data, quick actions navigate correctly
    Evidence: .sisyphus/evidence/task-10-dashboard.png

  Scenario: Dashboard handles no config loaded
    Tool: Playwright
    Preconditions: App running, no config file selected
    Steps:
      1. Navigate to "/"
      2. Verify Config Status card shows "No config loaded"
      3. Verify other cards show "0" counts gracefully
    Expected Result: Graceful empty state, no crashes
    Evidence: .sisyphus/evidence/task-10-dashboard-empty.png
  ```

  **Commit**: NO (groups with Wave 3)

- [ ] 11. OpenCode Config Editor Page (opencode.json)

  **What to do**:
  - Create `src/renderer/src/pages/OpenCodeConfigPage.tsx`:
    - **Header**: Config file path display, Save button (disabled when not dirty), Reload, Export, Import buttons
    - **Tabs**: Providers, Models, Permissions, General, JSON Preview
    - **Providers Tab**: List of providers as expandable cards. Each shows name, npm, baseURL. Expand to edit: name (TextInput), npm (TextInput), options (KeyValueEditor with apiKey as password). Add/Remove Provider buttons.
    - **Models Tab**: Provider selector dropdown at top. List of models for selected provider. Each model: name, context limit, output limit, modalities (checkboxes), reasoning toggle. Add/Remove Model buttons.
    - **Permissions Tab**: Grid of 9 permission toggles (bash, read, glob, grep, list, external_directory, edit, skill, task). Each shows name + description + allow/ask toggle.
    - **General Tab**: model (SelectInput from provider/model combos), small_model (same), plugin (ArrayEditor), disabled_providers (ArrayEditor), compaction.auto (ToggleSwitch), compaction.prune (ToggleSwitch).
    - **JSON Preview Tab**: Read-only JsonEditor showing current config as formatted JSON. Updates live. Copy-to-clipboard button.
    - **Import/Export**: Import opens file dialog, Export saves to chosen path.
    - All edits update Zustand config-store (mark dirty), save triggers IPC write with backup.

  **Must NOT do**:
  - Do NOT allow editing JSON directly in preview tab (read-only)
  - Do NOT auto-save (only on explicit Save click)
  - Do NOT strip unknown fields

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 12-15)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 19, 20
  - **Blocked By**: Tasks 2, 3, 5, 8, 9

  **References**:
  - `C:\Users\PC1\.config\opencode\opencode.json` - Real config with 2 providers (enowxai, enowxai2), 11+ models each, permissions, plugin array
  - `src/shared/types/opencode-config.ts` - OpenCodeConfig, ProviderConfig, ModelConfig types
  - `src/renderer/src/stores/config-store.ts` - State and actions
  - `src/renderer/src/components/ui/*` - All form components
  - `src/main/ipc/config-ipc.ts` - IPC channels: config:read, config:write

  **Acceptance Criteria**:
  - [ ] Page renders with 5 tabs
  - [ ] Providers tab lists all providers from loaded config
  - [ ] Can add/remove providers and models
  - [ ] Permissions tab shows all 9 toggles
  - [ ] JSON Preview updates live as form changes
  - [ ] Save triggers IPC write with backup
  - [ ] API key fields masked by default with show/hide toggle

  **QA Scenarios**:

  ```
  Scenario: Load and display real opencode.json
    Tool: Playwright
    Preconditions: App running, config loaded from C:\Users\PC1\.config\opencode\opencode.json
    Steps:
      1. Navigate to "/opencode-config"
      2. Verify Providers tab shows "enowxai" and "enowxai2" cards
      3. Expand "enowxai", verify baseURL is "https://llm2.srvl.my.id/v1"
      4. Click Models tab, select "enowxai" provider
      5. Verify models include "claude-sonnet-4.5", "claude-opus-4-6", "gpt-5"
      6. Click JSON Preview tab, verify JSON contains "enowxai2/claude-opus-4.6"
    Expected Result: All config data displayed correctly across tabs
    Evidence: .sisyphus/evidence/task-11-opencode-editor.png

  Scenario: Edit and save config
    Tool: Playwright
    Steps:
      1. Go to General tab, toggle compaction.auto off
      2. Verify Save button becomes enabled
      3. Click Save, verify success toast
    Expected Result: Config saved with backup created
    Evidence: .sisyphus/evidence/task-11-save-config.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add OpenCode config editor with provider/model/permission management`
  - Files: `src/renderer/src/pages/OpenCodeConfigPage.tsx`

- [ ] 12. Agent Config Editor Page (oh-my-openagent.json)

  **What to do**:
  - Create `src/renderer/src/pages/AgentConfigPage.tsx`:
    - **Header**: Config file path, Save/Reload/Export/Import buttons (same pattern as Task 11)
    - **Tabs**: Agents, Categories, Background Tasks, Hooks, MCPs, Experimental, JSON Preview
    - **Agents Tab**: 11 built-in agent cards (sisyphus, hephaestus, oracle, librarian, explore, atlas, prometheus, metis, momus, multimodal-looker, sisyphus-junior). Each shows name, current model or "default", variant badge. Expand to edit: model, variant (default/high/low/max), temperature (0-2), top_p (0-1), prompt_append (TextArea monospace). Show only agents with overrides + "Add Override" button.
    - **Categories Tab**: 8 category cards (quick, visual-engineering, ultrabrain, artistry, deep, unspecified-low, unspecified-high, writing). Each: model, variant, temperature, top_p.
    - **Background Tasks Tab**: defaultConcurrency (number), providerConcurrency (KeyValueEditor), modelConcurrency (KeyValueEditor).
    - **Hooks Tab**: List of configured hooks with enable/disable toggles. Read-only display of hook names (40+ built-in). Users can enable/disable specific hooks.
    - **MCPs Tab**: List of MCP server configs. Each: name, command, args (ArrayEditor), env (KeyValueEditor), disabled toggle. Add/Remove MCP buttons.
    - **Experimental Tab**: Key-value toggles for experimental flags (aggressive_truncation, task_system, etc.).
    - **JSON Preview Tab**: Same as Task 11 pattern.

  **Must NOT do**:
  - Do NOT allow creating new agent types (only override existing 11)
  - Do NOT auto-save
  - Do NOT strip unknown fields

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 13-15)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 19, 20
  - **Blocked By**: Tasks 2, 3, 5, 8, 9

  **References**:
  - oh-my-openagent config docs: `https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/configuration.md` - Full schema with all agent names, categories, hooks, MCPs
  - oh-my-openagent schema JSON: `https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json` - Machine-readable schema
  - `src/shared/types/agent-config.ts` - AgentPluginConfig, AgentOverride, CategoryConfig types
  - `src/renderer/src/stores/config-store.ts` - State and actions
  - `src/renderer/src/components/ui/*` - Form components

  **Acceptance Criteria**:
  - [ ] Page renders with 7 tabs
  - [ ] Agents tab shows 11 built-in agent names
  - [ ] Categories tab shows 8 category cards
  - [ ] Background Tasks tab has concurrency editors
  - [ ] MCPs tab can add/remove/configure MCP servers
  - [ ] JSON Preview updates live
  - [ ] Save triggers IPC write with backup

  **QA Scenarios**:

  ```
  Scenario: Agent config editor renders all tabs
    Tool: Playwright
    Preconditions: App running, oh-my-openagent.json loaded (or empty default)
    Steps:
      1. Navigate to "/agent-config"
      2. Verify 7 tabs visible: Agents, Categories, Background Tasks, Hooks, MCPs, Experimental, JSON Preview
      3. Click Agents tab, verify 11 agent names listed
      4. Click Categories tab, verify 8 category cards
      5. Click JSON Preview, verify JSON output
    Expected Result: All tabs render with correct content
    Evidence: .sisyphus/evidence/task-12-agent-editor.png

  Scenario: Add agent override
    Tool: Playwright
    Steps:
      1. Go to Agents tab
      2. Click "Add Override" for "oracle" agent
      3. Set model to "openai/gpt-5.4"
      4. Set variant to "high"
      5. Verify JSON Preview shows the override
    Expected Result: Agent override added and reflected in preview
    Evidence: .sisyphus/evidence/task-12-add-override.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add Agent config editor for oh-my-openagent.json`
  - Files: `src/renderer/src/pages/AgentConfigPage.tsx`

- [ ] 13. Plugin Manager Page

  **What to do**:
  - Create `src/renderer/src/pages/PluginsPage.tsx` with:
    - Installed Plugins list from opencode.json plugin array. Each row: name, version, enable/disable toggle, uninstall button with confirmation modal.
    - Install New Plugin section: TextInput for npm package name, Install button, progress log panel (monospace textarea).
    - Known Plugins list (hardcoded): oh-my-china, @tarquinen/opencode-dcp, opencode-antigravity-auth with one-click install.
    - Install/uninstall calls IPC to package-manager-service. After install, update opencode.json plugin array.

  **Must NOT do**: No npm registry browsing, no arbitrary package install, no install without confirmation.

  **Recommended Agent Profile**: `unspecified-high`, Skills: [`playwright`]

  **Parallelization**: Wave 3, parallel with Tasks 10-12, 14, 15. Blocks: Task 20. Blocked By: Tasks 3, 6, 8, 9.

  **References**:
  - `src/main/services/package-manager-service.ts` - installPlugin, uninstallPlugin
  - `src/renderer/src/stores/plugin-store.ts` - Plugin state
  - `src/shared/types/app-types.ts:PluginInfo`

  **Acceptance Criteria**:
  - [ ] Shows installed plugins from opencode.json
  - [ ] Enable/disable toggle updates config
  - [ ] Install/uninstall works with bun or npm
  - [ ] Known plugins list with one-click install

  **QA Scenarios**:
  ```
  Scenario: Display installed plugins
    Tool: Playwright
    Steps: Navigate to /plugins, verify 2 plugin entries, verify toggle and uninstall buttons
    Evidence: .sisyphus/evidence/task-13-plugins-list.png

  Scenario: Install fails gracefully
    Tool: Playwright
    Steps: Type fake package name, click Install, verify error in log panel
    Evidence: .sisyphus/evidence/task-13-install-error.png
  ```

  **Commit**: NO (groups with Wave 3)

- [ ] 14. Skill Manager Page

  **What to do**:
  - Create `src/main/services/skill-service.ts`: listSkills (scan for .md files), readSkill, writeSkill, deleteSkill, createSkill
  - Create `src/main/ipc/skill-ipc.ts`: IPC handlers skill:list, skill:read, skill:write, skill:delete, skill:create
  - Create `src/renderer/src/pages/SkillsPage.tsx`:
    - Split-pane layout: skill list (left) + skill editor (right)
    - Skill list: name, path, description (first line of .md), drag-to-reorder
    - Skill editor: monospace TextArea for markdown content, Save/Discard buttons
    - Actions: Create New Skill (modal), Delete Skill (confirmation), Duplicate Skill

  **Must NOT do**: No full markdown editor, no modifying skills outside configured dirs.

  **Recommended Agent Profile**: `unspecified-high`, Skills: [`playwright`]

  **Parallelization**: Wave 3, parallel with Tasks 10-13, 15. Blocks: Task 20. Blocked By: Tasks 3, 5, 8, 9.

  **References**:
  - `src/shared/types/app-types.ts:SkillInfo`
  - `src/renderer/src/stores/skill-store.ts`
  - `src/renderer/src/components/ui/*`

  **Acceptance Criteria**:
  - [ ] Split-pane layout renders
  - [ ] Can create, edit, save, delete skills
  - [ ] Skill list shows name and description
  - [ ] Drag-to-reorder works

  **QA Scenarios**:
  ```
  Scenario: Create and edit a skill
    Tool: Playwright
    Steps: Navigate to /skills, click Create New, enter name "test-skill", type content, click Save, verify skill appears in list
    Evidence: .sisyphus/evidence/task-14-create-skill.png

  Scenario: Delete skill with confirmation
    Tool: Playwright
    Steps: Select a skill, click Delete, verify confirmation modal, confirm, verify skill removed
    Evidence: .sisyphus/evidence/task-14-delete-skill.png
  ```

  **Commit**: NO (groups with Wave 3)

- [ ] 15. Settings Page

  **What to do**:
  - Create `src/renderer/src/pages/SettingsPage.tsx`:
    - **Appearance**: Theme toggle (dark/light) with live preview, accent color picker (optional)
    - **Paths**: Default config directory (TextInput + folder picker dialog), bun path override (TextInput + file picker)
    - **Terminal**: Default shell selector (dropdown from detected shells), font size
    - **General**: Language selector (English/Indonesian for now), auto-backup toggle
    - **About**: App version, links to OpenCode docs, oh-my-openagent docs
    - All settings persisted via settings-store (Zustand persist to localStorage)
    - Changes apply immediately (no save button needed)

  **Must NOT do**: No complex i18n system, no cloud sync, no account management.

  **Recommended Agent Profile**: `visual-engineering`, Skills: [`playwright`]

  **Parallelization**: Wave 3, parallel with Tasks 10-14. Blocks: none. Blocked By: Tasks 3, 4, 8, 9.

  **References**:
  - `src/renderer/src/stores/settings-store.ts` - Settings state and persistence
  - `src/renderer/src/lib/theme.ts` - Theme application
  - `src/main/services/shell-service.ts` - Available shells for dropdown

  **Acceptance Criteria**:
  - [ ] Theme toggle switches between dark and light immediately
  - [ ] Path settings saved and persisted across app restart
  - [ ] Shell selector shows detected shells
  - [ ] Settings persist in localStorage

  **QA Scenarios**:
  ```
  Scenario: Toggle theme
    Tool: Playwright
    Steps: Navigate to /settings, click theme toggle to "light", verify background changes to white, toggle back to "dark", verify dark background
    Evidence: .sisyphus/evidence/task-15-theme-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(pages): add Plugin Manager, Skill Manager, and Settings pages`
  - Files: `src/renderer/src/pages/PluginsPage.tsx`, `src/renderer/src/pages/SkillsPage.tsx`, `src/renderer/src/pages/SettingsPage.tsx`, `src/main/services/skill-service.ts`, `src/main/ipc/skill-ipc.ts`

- [ ] 16. Integrated Terminal (xterm.js + node-pty + IPC)

  **What to do**:
  - Install and configure `xterm`, `@xterm/addon-fit`, `node-pty` (native module — needs electron-rebuild)
  - Create `src/main/services/terminal-service.ts`:
    - `createTerminal(shell: ShellInfo, cwd?: string): string` — Spawn node-pty process, return terminal ID
    - `writeToTerminal(id: string, data: string): void` — Send input to terminal
    - `resizeTerminal(id: string, cols: number, rows: number): void` — Resize pty
    - `destroyTerminal(id: string): void` — Kill pty process
    - Support multiple terminal instances
    - Add bun to PATH env if detected (from package-manager-service)
  - Create `src/main/ipc/terminal-ipc.ts`: IPC handlers terminal:create, terminal:write, terminal:resize, terminal:destroy, terminal:data (stream output back to renderer)
  - Create `src/renderer/src/components/Terminal/TerminalPanel.tsx`:
    - xterm.js instance with fit addon for auto-resize
    - Shell selector dropdown (from detected shells)
    - Tab bar for multiple terminal instances (create new, close)
    - Toggle panel visibility (slide up from bottom, resizable height)
    - Dark theme matching app theme (xterm theme config)
  - Update preload to expose terminal IPC

  **Must NOT do**: No SSH/remote terminals, no terminal multiplexer beyond tabs, no recording/playback.

  **Recommended Agent Profile**: `deep`, Skills: [`playwright`]

  **Parallelization**: Wave 4, parallel with Tasks 17-19. Blocks: none. Blocked By: Tasks 7, 8.

  **References**:
  - xterm.js docs: `https://xtermjs.org/docs/` — Terminal setup and theming
  - node-pty: `https://github.com/nicedoc/node-pty` — PTY spawning on Windows
  - `src/main/services/shell-service.ts` — Shell detection for selector
  - `src/main/services/package-manager-service.ts` — Bun path for PATH env

  **Acceptance Criteria**:
  - [ ] Terminal panel opens from bottom of app
  - [ ] PowerShell prompt appears and accepts commands
  - [ ] Shell selector shows detected shells
  - [ ] Multiple terminal tabs work
  - [ ] Terminal resizes correctly with window

  **QA Scenarios**:
  ```
  Scenario: Open terminal and run command
    Tool: Playwright
    Steps: Click terminal toggle, verify terminal panel appears, type "echo hello" + Enter, verify "hello" appears in output
    Evidence: .sisyphus/evidence/task-16-terminal.png

  Scenario: Switch shells
    Tool: Playwright
    Steps: Open terminal, click shell selector, switch to cmd.exe, verify cmd prompt appears
    Evidence: .sisyphus/evidence/task-16-shell-switch.png
  ```

  **Commit**: YES
  - Message: `feat(terminal): add integrated terminal with xterm.js and multi-shell support`
  - Files: `src/main/services/terminal-service.ts`, `src/main/ipc/terminal-ipc.ts`, `src/renderer/src/components/Terminal/*`

- [ ] 17. Backup & Restore System

  **What to do**:
  - Create `src/main/services/backup-service.ts`:
    - `createBackup(configPaths: string[], outputPath: string): Promise<string>` — Collect all config files (opencode.json, oh-my-openagent.json[c], skill .md files) into a .zip archive using `archiver`. Include metadata.json with timestamp, app version, file list.
    - `restoreBackup(zipPath: string, targetDir: string): Promise<{ restored: string[]; skipped: string[] }>` — Extract .zip using `extract-zip`. Show preview of files before restoring. Backup existing files before overwriting.
    - `listBackups(backupDir: string): Promise<BackupInfo[]>` — List available backups with date, size, file count.
  - Create `src/main/ipc/backup-ipc.ts`: IPC handlers backup:create, backup:restore, backup:list, backup:preview
  - Create `src/renderer/src/components/BackupRestore/BackupDialog.tsx`:
    - Backup: Select which configs to include (checkboxes), choose save location (file dialog), progress bar, success message.
    - Restore: Choose .zip file (file dialog), preview contents, confirm restore, progress bar.
  - Integrate into Dashboard (Quick Action) and Settings page

  **Must NOT do**: No cloud backup, no scheduled backups, no incremental backups.

  **Recommended Agent Profile**: `unspecified-high`, Skills: []

  **Parallelization**: Wave 4, parallel with Tasks 16, 18, 19. Blocks: none. Blocked By: Task 5.

  **References**:
  - archiver npm: `https://www.npmjs.com/package/archiver` — ZIP creation
  - extract-zip npm: `https://www.npmjs.com/package/extract-zip` — ZIP extraction
  - `src/main/services/config-service.ts` — Config file locations

  **Acceptance Criteria**:
  - [ ] Backup creates .zip with all selected config files
  - [ ] Restore extracts and overwrites with pre-backup
  - [ ] Preview shows file list before restore
  - [ ] Metadata.json included in backup

  **QA Scenarios**:
  ```
  Scenario: Backup and restore round-trip
    Tool: Bash
    Steps: Create backup of current configs, delete a config file, restore from backup, verify file restored
    Evidence: .sisyphus/evidence/task-17-backup-restore.txt
  ```

  **Commit**: NO (groups with Wave 4)

- [ ] 18. File Browser & Project Auto-Detection

  **What to do**:
  - Create `src/main/services/project-service.ts`:
    - `detectProjects(searchPaths: string[]): Promise<ProjectInfo[]>` — Scan common directories for OpenCode projects (look for .opencode/ dir, opencode.json, or .kilo/ dir). Search in: user home, recent projects from settings, common dev dirs.
    - `selectProjectDir(): Promise<string>` — Open native folder picker dialog
    - `getProjectConfig(projectPath: string): Promise<{ opencode?: object; agent?: object }>` — Read project-level configs
  - Create `src/main/ipc/project-ipc.ts`: IPC handlers project:detect, project:select, project:config
  - Create `src/renderer/src/components/ProjectSelector.tsx`:
    - Dropdown/modal showing detected projects + manual browse button
    - Shows project path, config status (has opencode.json? has agent config?)
    - Integrated into sidebar bottom or header area
  - When project selected, load both global and project configs, show which level is active

  **Must NOT do**: No git integration, no project creation wizard, no workspace management.

  **Recommended Agent Profile**: `unspecified-high`, Skills: [`playwright`]

  **Parallelization**: Wave 4, parallel with Tasks 16, 17, 19. Blocks: Task 10 (dashboard needs project info). Blocked By: Tasks 5, 8.

  **References**:
  - Electron dialog: `https://www.electronjs.org/docs/latest/api/dialog` — Native folder picker
  - `src/main/services/config-service.ts` — Config reading
  - `src/renderer/src/stores/settings-store.ts` — Recent projects list

  **Acceptance Criteria**:
  - [ ] Auto-detects projects in common directories
  - [ ] Manual folder picker works
  - [ ] Project selector shows in sidebar/header
  - [ ] Selecting project loads project-level configs

  **QA Scenarios**:
  ```
  Scenario: Select project directory manually
    Tool: Playwright
    Steps: Click project selector, click Browse, select a directory, verify config loads
    Evidence: .sisyphus/evidence/task-18-project-select.png
  ```

  **Commit**: NO (groups with Wave 4)

- [ ] 19. JSON Preview Panel (Live Preview with Syntax Highlighting)

  **What to do**:
  - Enhance `src/renderer/src/components/ui/JsonEditor.tsx` (from Task 9):
    - Add proper syntax highlighting via CSS classes (strings=green, numbers=blue, keys=purple, booleans=orange, null=gray)
    - Line numbers column
    - Copy-to-clipboard button
    - Search/find within JSON (Ctrl+F)
    - Collapsible sections for large objects
  - Create `src/renderer/src/components/JsonPreviewPanel.tsx`:
    - Standalone panel that subscribes to config store
    - Updates in real-time as form fields change
    - Shows diff indicator (changed lines highlighted) compared to saved version
    - Can be toggled as side panel or tab

  **Must NOT do**: No Monaco editor, no inline editing in preview, no diff view (just highlight changed lines).

  **Recommended Agent Profile**: `visual-engineering`, Skills: [`playwright`]

  **Parallelization**: Wave 4, parallel with Tasks 16-18. Blocks: none. Blocked By: Tasks 11, 12.

  **References**:
  - `src/renderer/src/components/ui/JsonEditor.tsx` — Base component to enhance
  - `src/renderer/src/stores/config-store.ts` — Config state for live preview

  **Acceptance Criteria**:
  - [ ] JSON syntax highlighted with colors
  - [ ] Line numbers visible
  - [ ] Copy-to-clipboard works
  - [ ] Updates live as form changes
  - [ ] Changed lines highlighted

  **QA Scenarios**:
  ```
  Scenario: Live preview updates
    Tool: Playwright
    Steps: Open config editor, change a field, verify JSON preview updates immediately with the change highlighted
    Evidence: .sisyphus/evidence/task-19-live-preview.png
  ```

  **Commit**: YES
  - Message: `feat(advanced): add terminal, backup/restore, project detection, JSON preview`
  - Files: Terminal/*, backup-service.ts, project-service.ts, JsonPreviewPanel.tsx

- [ ] 20. Cross-Page Integration (Dashboard reads from all stores)

  **What to do**:
  - Wire Dashboard to real data from all stores (replace any mock data)
  - Ensure config changes on editor pages reflect immediately on Dashboard
  - Add global config reload mechanism (re-read all configs from disk)
  - Add unsaved changes warning when navigating away from dirty editor pages
  - Ensure project selector updates all stores when project changes

  **Recommended Agent Profile**: `unspecified-high`, Skills: []

  **Parallelization**: Wave 5, parallel with Tasks 21-23. Blocked By: Tasks 10-14, 18.

  **Acceptance Criteria**:
  - [ ] Dashboard shows real data from all stores
  - [ ] Config changes reflect on Dashboard immediately
  - [ ] Unsaved changes warning on navigation
  - [ ] Project switch reloads all data

  **QA Scenarios**:
  ```
  Scenario: Config change reflects on Dashboard
    Tool: Playwright
    Steps: Edit a plugin on Plugins page, navigate to Dashboard, verify plugin count updated
    Evidence: .sisyphus/evidence/task-20-integration.png
  ```

  **Commit**: NO (groups with Wave 5)

- [ ] 21. Error Handling & Toast Notifications

  **What to do**:
  - Create global error boundary component wrapping the app
  - Wire Toast component (from Task 9) to ui-store toast actions
  - Add error handling to all IPC calls (try/catch with user-friendly messages)
  - Add toast notifications for: config saved, config load error, plugin installed/failed, backup created, restore completed
  - Add loading states for all async operations

  **Recommended Agent Profile**: `quick`, Skills: []

  **Parallelization**: Wave 5, parallel with Tasks 20, 22, 23. Blocked By: Task 8.

  **Acceptance Criteria**:
  - [ ] Error boundary catches React errors gracefully
  - [ ] Toast notifications appear for all major actions
  - [ ] IPC errors show user-friendly messages
  - [ ] Loading states visible during async ops

  **Commit**: NO (groups with Wave 5)

- [ ] 22. Window Chrome (Title Bar, Menu, Tray)

  **What to do**:
  - Configure custom title bar (frameless window with custom drag region)
  - Add app menu: File (Open Config, Save, Import, Export, Quit), Edit (Undo, Redo, Cut, Copy, Paste), View (Toggle Sidebar, Toggle Terminal, Zoom), Help (About, Docs)
  - Add window controls (minimize, maximize, close) in custom title bar
  - Set app icon (create simple icon or use placeholder)
  - Add keyboard shortcuts: Ctrl+S (save), Ctrl+O (open), Ctrl+` (toggle terminal)

  **Recommended Agent Profile**: `quick`, Skills: []

  **Parallelization**: Wave 5, parallel with Tasks 20, 21, 23. Blocked By: Task 1.

  **Acceptance Criteria**:
  - [ ] Custom title bar with drag region
  - [ ] Window controls work (min/max/close)
  - [ ] Menu items functional
  - [ ] Keyboard shortcuts work

  **Commit**: NO (groups with Wave 5)

- [ ] 23. Final Build Config (electron-builder, Icons, Metadata)

  **What to do**:
  - Configure electron-builder in package.json for Windows build:
    - Output: NSIS installer + portable exe
    - App name: "OpenCode Manager"
    - App ID: "com.opencode.manager"
    - Icon: app icon (create or use placeholder .ico)
    - File associations: .json (optional)
  - Add build scripts: `npm run build` (production build), `npm run dist` (create installer)
  - Verify production build works: `npm run build && npm run dist`
  - Add .gitignore for dist/, node_modules/, out/

  **Recommended Agent Profile**: `quick`, Skills: []

  **Parallelization**: Wave 5, parallel with Tasks 20-22. Blocked By: Task 22.

  **Acceptance Criteria**:
  - [ ] `npm run build` produces production bundle
  - [ ] `npm run dist` creates Windows installer
  - [ ] App launches from built executable
  - [ ] .gitignore covers build artifacts

  **QA Scenarios**:
  ```
  Scenario: Production build succeeds
    Tool: Bash
    Steps: Run `npm run build`, verify exit code 0, verify dist/ directory created
    Evidence: .sisyphus/evidence/task-23-build.txt
  ```

  **Commit**: YES
  - Message: `feat(polish): add error handling, window chrome, build config, cross-page integration`
  - Files: Various

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + lint. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`npm install && npm run dev`). Execute EVERY QA scenario from EVERY task. Test cross-page navigation, config load/save cycle, plugin install/uninstall, terminal open/type, backup/restore round-trip. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Files |
|------|---------------|-------|
| 1 | `feat(scaffold): init electron-vite project with React, TS, Tailwind, Zustand` | All scaffolding files |
| 2 | `feat(core): add config service, bun/shell detection, layout, form components` | src/main/services/*, src/renderer/components/*, src/renderer/layouts/* |
| 3 | `feat(pages): add all 6 main pages with config editors and managers` | src/renderer/pages/* |
| 4 | `feat(advanced): add terminal, backup/restore, file browser, JSON preview` | src/main/services/terminal*, src/renderer/components/Terminal*, backup* |
| 5 | `feat(polish): integration, error handling, window chrome, build config` | Various |

---

## Success Criteria

### Verification Commands
```bash
npm install          # Expected: no errors
npm run dev          # Expected: Electron window opens with dark theme
npm run build        # Expected: produces dist/ with executable
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] App launches without errors
- [ ] All 6 pages accessible via sidebar
- [ ] Config files can be loaded and saved
- [ ] Terminal functional
- [ ] Backup/restore works
- [ ] Dark/light theme toggle works
