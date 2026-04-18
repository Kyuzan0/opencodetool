# Learnings

## 2026-04-19 Session 1
- Project is greenfield at D:\laragon\www\app\opencodetool
- Bun at C:\Apps\bun\bin\bun.exe v1.3.12 (NOT in system PATH)
- npm at C:\Apps\nodejs\npx
- Real opencode.json at C:\Users\PC1\.config\opencode\opencode.json (332 lines)
- oh-my-openagent not yet installed on system
- Agent delegation (task()) is BROKEN in this environment - all calls fail with "{} is not iterable" or "Model not configured for category". Must execute all work directly.
- electron-vite build works: main (8 modules), preload (2), renderer (1610+)
- Git initialized, first commit 434ed3b (71 files, 12968 insertions)
- T1-T10 complete (Wave 1 + Wave 2 + Dashboard)
- Remaining: T11-T23 (pages, terminal, backup, polish) + F1-F4 (final verification)
- Pages T11-T15 have placeholder content, need full implementation
- Context limit is a major constraint - large file writes hit JSON parse errors

## 2026-04-19 Session 3
- task() delegation still BROKEN - "Model not configured for category" for all categories
- All T11-T23 implemented directly (no delegation)
- Wave 3 (T11-T15): All 5 pages fully implemented with form editing, IPC integration
- Wave 4 (T16-T19): Terminal (child_process based, no node-pty), Backup/Restore (archiver/extract-zip), Project detection, JSON Preview with syntax highlighting
- Wave 5 (T20-T23): Cross-page integration, Error boundary + Toast container, App menu with keyboard shortcuts, electron-builder config
- New backend services: skill-service.ts, terminal-service.ts, backup-service.ts, project-service.ts
- New IPC modules: skill-ipc.ts, terminal-ipc.ts, backup-ipc.ts, project-ipc.ts
- Preload updated with terminal/backup/project/skill namespaces
- Build passes: main (16 modules, 33.76KB), preload (2 modules, 5.87KB), renderer (1615 modules, 393KB)
- TypeScript compiles with zero errors throughout
