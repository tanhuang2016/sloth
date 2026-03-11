# Tauri + Vue + TypeScript

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Dual target: Desktop + Web

This repo supports:
- **Desktop app**: Tauri v2 (Rust) + Vue 3 (Vite)
- **Web app (B/S)**: Vue 3 (Vite) calling a standalone **Axum** server over HTTP

The Rust business logic is shared in `crates/core`. Tauri commands and Axum handlers are just adapters.

### Rust crates

- `crates/core`: shared business logic + shared request/response types
- `crates/server`: Axum HTTP server (`/api/*`)
- `crates/desktop`: desktop adapter (pure Rust, used by `src-tauri` command wrappers)

### Run Desktop (Tauri)

```bash
npm install
npm run app:dev
```

### Run Web (frontend + Axum backend)

Start backend:

```bash
# default: 127.0.0.1:3001
npm run server:dev

# or customize listen address
SLOTH_SERVER_ADDR=127.0.0.1:3001 cargo run -p sloth-server
```

Start frontend (separately hosted):

```bash
# point the frontend to the Axum API base
VITE_API_BASE_URL=http://127.0.0.1:3001 npm run dev
```

If `VITE_API_BASE_URL` is not set, the frontend defaults to `http://127.0.0.1:3001`.

### API

- `POST /api/greet`
  - request: `{ "name": "..." }`
  - response: `{ "message": "..." }`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
