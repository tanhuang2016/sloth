# Sloth 项目结构与设计说明

本项目是一个 **双端适配（Tauri 桌面端 + Web B/S）** 的 HelloWorld 示例：

- **前端**：Vue 3 + Vite + TypeScript（同一套 UI 代码同时用于桌面端与 Web 端）
- **后端**：Rust
  - **桌面端**：通过 **Tauri Commands** 调用 Rust（不走 HTTP）
  - **Web 端**：通过 **Axum HTTP API** 调用 Rust（走 `/api/*`）
- **核心要求**：桌面端与 Web 端的后端业务逻辑 **共用同一份 Rust 代码**，仅入口/传输层不同

## 设计目标

- **一套前端**：不分叉 UI，不写两套页面
- **一份后端逻辑**：业务逻辑只写在 `crates/core`，桌面端与 Web 端只是“适配层”
- **可扩展**：后续加入更多 API、状态管理、持久化（SQLite/文件/网络）时仍然保持分层清晰

## 目录结构（重点）

```text
sloth/
  src/                         # Vue 前端（桌面+Web共用）
    api/
      index.ts                 # 运行时适配：Tauri invoke / Web fetch
    App.vue
    main.ts

  src-tauri/                   # Tauri 壳工程（Rust）
    tauri.conf.json            # Tauri 配置（窗口/打包/Dev命令等）
    capabilities/default.json  # Tauri capability/permissions
    src/
      main.rs                  # 入口：调用 sloth_lib::run()
      lib.rs                   # Tauri Builder + command wrapper（注册命令）

  crates/                      # Rust workspace：共享逻辑与两端适配
    core/                      # 业务逻辑与共享 DTO（不依赖 tauri/axum）
      src/lib.rs
    desktop/                   # 桌面端适配（纯 Rust，给 src-tauri 使用）
      src/lib.rs
    server/                    # Web 后端（Axum）
      src/main.rs              # HTTP 路由：/api/*

  Cargo.toml                   # Rust workspace 根
  package.json                 # 前端脚本 + 并行启动脚本
  README.md
```

## Rust 分层与依赖关系

### crates/core（共享业务逻辑）

- **职责**：业务逻辑（usecase/domain）与共享请求/响应类型（DTO）
- **约束**：尽量不依赖 tauri/axum；只做“纯逻辑”

当前示例：
- `GreetRequest { name }`
- `GreetResponse { message }`
- `greet(name) -> GreetResponse`

### crates/server（Axum 适配层）

- **职责**：把 HTTP 请求映射到 `core` 调用
- **路由**：
  - `POST /api/greet`：JSON 请求/响应
  - `GET /api/heartbeat`：心跳接口，返回当前 Unix 时间（ms/s）
- **监听地址**：通过环境变量 `SLOTH_SERVER_ADDR` 配置；默认 `127.0.0.1:3001`

### crates/desktop（桌面适配层）

- **职责**：提供给桌面端调用的“适配函数”（纯 Rust），内部调用 `core`
- **说明**：Tauri 的 `#[command]` 宏与 `generate_handler!` 更稳妥的用法是：
  - **command wrapper 写在 `src-tauri` crate 内**
  - `crates/desktop` 提供纯 Rust 函数供 wrapper 调用

### src-tauri（Tauri 壳工程）

- **职责**：Tauri Builder、插件、权限、窗口等配置，以及 `#[tauri::command]` 的注册
- **为什么 command wrapper 在这里**：避免 Tauri 宏跨 crate 注册导致的符号/配置定位问题（例如 `generate_context!()` 读取 `tauri.conf.json` 的路径约束）

## 前端调用适配（关键）

前端不直接关心“桌面/网页”，只调用统一的 API 函数。

### `src/api/index.ts`

- `isDesktopTauri()`：判断当前是否在 Tauri WebView 环境
- `greet(name)`：
  - **桌面端**：`invoke("greet", { name })`
  - **Web 端**：`fetch(`${VITE_API_BASE_URL}/api/greet`)`

Web 端 API Base：
- 读取 `VITE_API_BASE_URL`
- 未设置则默认 `http://127.0.0.1:3001`

## 端到端数据流（示意）

```mermaid
flowchart LR
  subgraph Frontend[VueApp]
    UI[App.vue] --> ApiClient[src/api/index.ts]
  end

  ApiClient -->|"Desktop: invoke(greet)"| TauriCmd[src-tauri command]
  ApiClient -->|"Web: POST /api/greet"| AxumHttp[crates/server (Axum)]

  TauriCmd --> Core[crates/core]
  AxumHttp --> Core
```

## 接口约定（当前）

### 1) Web HTTP

- `POST /api/greet`
  - request: `{ "name": "..." }`
  - response: `{ "message": "..." }`

- `GET /api/heartbeat`
  - response: `{ "now_unix_ms": number, "now_unix_s": number }`

### 2) Desktop（Tauri command）

- `greet(name: string) -> { message: string }`

> 约定：尽量保持与 HTTP 的响应结构一致，方便前端类型复用。

## 本地开发与常用命令

### Web（前后端分离）

启动后端（Axum）：

```bash
npm run dev:backend
# 或自定义监听
SLOTH_SERVER_ADDR=127.0.0.1:3001 cargo run -p sloth-server
```

启动前端（Vite）：

```bash
VITE_API_BASE_URL=http://127.0.0.1:3001 npm run dev:frontend
```

一条命令同时启动（并行）：

```bash
npm run dev:full
```

### Desktop（Tauri）

```bash
npm run app:dev
```

## 后续扩展建议（保持可维护性）

- **新增业务能力**：先在 `crates/core` 增加函数/类型，再分别在：
  - `crates/server` 加 HTTP 路由/handler
  - `src-tauri` 加 command wrapper（调用 `crates/desktop` 或直接调用 `core`）
- **错误处理**：建议在 `core` 定义错误类型（例如 `thiserror`），在 server/desktop 分别映射为 HTTP 状态码或可读错误消息
- **持久化**：在 `core` 定义 repository trait，在 server/desktop 提供实现（例如 SQLite/文件）；避免把 IO 逻辑塞进 `core`

