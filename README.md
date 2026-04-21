# OpenCode Manager

Desktop management tool untuk konfigurasi [OpenCode](https://opencode.ai). Dibangun dengan Electron + React + TypeScript + Tailwind CSS.

## Fitur Utama

- **Dashboard** — Overview status sistem: config, CLI, plugins, skills, package manager, dan runtime control
- **Config Editor** — Edit `opencode.json` / `opencode.jsonc` dengan GUI (provider, model, permission, compaction)
- **Agent Config** — Konfigurasi agent dan category model (hephaestus, oracle, librarian, dll.)
- **Plugin Manager** — Install, enable/disable plugin OpenCode (oh-my-china, opencode-dcp, dll.)
- **Skill Manager** — Buat, edit, reorder skill lokal + browse & install dari Smithery Store dan GitHub
- **Runtime Control** — Start/stop/restart OpenCode CLI dan Web mode langsung dari dashboard
- **Backup & Restore** — Backup semua config ke ZIP, restore kapan saja
- **Built-in Terminal** — Terminal terintegrasi di dalam aplikasi
- **Theme** — Light & dark mode

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Desktop | Electron 33 |
| Frontend | React 18, React Router 6, Zustand 5 |
| Styling | Tailwind CSS 3 |
| Build | electron-vite, Vite 5 |
| Language | TypeScript 5 |
| Icons | Lucide React |

## Prerequisites

- **Node.js** >= 18
- **npm** atau **bun**
- (Opsional) **OpenCode CLI** — `npm i -g opencode-ai`

## Instalasi & Development

```bash
# Clone repo
git clone <repo-url>
cd opencodetool

# Install dependencies
npm install

# Jalankan development mode
npm run dev
```

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Jalankan app dalam development mode (hot reload) |
| `npm run build` | Build app untuk production |
| `npm run dist` | Build + package sebagai installer Windows (NSIS + portable) |
| `npm run start` | Preview production build |
| `npm run typecheck` | Cek TypeScript errors (node + web) |

## Struktur Folder

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # Entry point, window & menu setup
│   ├── ipc/               # IPC handlers (config, skill, terminal, dll.)
│   └── services/          # Business logic (config, backup, runtime, dll.)
├── preload/               # Preload script (context bridge)
├── renderer/              # React frontend
│   └── src/
│       ├── App.tsx         # Root component & routing
│       ├── pages/          # Dashboard, Config, Agent, Plugin, Skill, Settings
│       ├── components/     # UI components (Sidebar, Terminal, BackupDialog, dll.)
│       ├── stores/         # Zustand stores (config, plugin, skill, settings, ui)
│       ├── hooks/          # Custom hooks (keyboard shortcuts, unsaved warning)
│       └── lib/            # Utilities (theme)
└── shared/                # Shared types antara main & renderer
    └── types/             # TypeScript type definitions
```

## Cara Penggunaan

### 1. Setup Awal

1. Buka aplikasi — dashboard akan otomatis mendeteksi OpenCode CLI dan config file
2. Jika CLI belum terinstall, klik **Install CLI (npm)** atau **Install CLI (bun)** di dashboard
3. Jika config belum ada, klik **Buat Config Default** untuk generate `opencode.json`

### 2. Edit Konfigurasi

1. Navigasi ke **OpenCode Config** via sidebar
2. Atur provider (API key, base URL, model)
3. Set permission (bash, read, edit)
4. Konfigurasi compaction settings
5. Klik **Save** untuk menyimpan

### 3. Kelola Plugin

1. Buka halaman **Plugins**
2. Tambah plugin dari daftar known plugins atau input manual
3. Enable/disable plugin sesuai kebutuhan
4. Install plugin via npm/bun langsung dari UI

### 4. Kelola Skill

1. Buka halaman **Skills**
2. Tab **My Skills** — buat, edit, hapus, dan reorder skill lokal
3. Tab **Smithery Store** — browse dan install skill dari registry
4. Tab **GitHub** — install skill langsung dari GitHub repository

### 5. Runtime Control

1. Di **Dashboard**, section **OpenCode Runtime**
2. **CLI Mode** — Start/Stop/Restart background OpenCode process
3. **Web Mode** — Start OpenCode web interface di port tertentu (default 3000)
4. Monitor status dan log runtime secara real-time

### 6. Backup & Restore

1. Klik **Backup** di Quick Actions
2. Pilih lokasi penyimpanan file ZIP
3. Untuk restore, buka dialog Backup dan pilih file ZIP yang sudah disimpan

## Build untuk Distribusi

```bash
# Build installer Windows (NSIS + portable)
npm run dist
```

Output akan tersedia di folder `dist/`.

## Lisensi

MIT
