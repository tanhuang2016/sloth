import * as tauriCore from "@tauri-apps/api/core";

export type GreetRequest = {
  name: string;
};

export type GreetResponse = {
  message: string;
};

function isDesktopTauri(): boolean {
  if (typeof window === "undefined") return false;

  // Prefer official detection when available (Tauri v2).
  const isTauriFn = (tauriCore as unknown as { isTauri?: () => boolean }).isTauri;
  if (typeof isTauriFn === "function") return isTauriFn();

  // Fallback heuristics for different runtimes/builds.
  const w = window as unknown as Record<string, unknown>;
  if ("__TAURI__" in w) return true;
  if ("__TAURI_INTERNALS__" in w) return true;

  const protocol = window.location?.protocol ?? "";
  if (protocol === "tauri:" || protocol === "asset:") return true;

  return false;
}

function apiBaseUrl(): string {
  const base = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (base ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
}

export async function greet(name: string): Promise<GreetResponse> {
  if (isDesktopTauri()) {
    return await tauriCore.invoke<GreetResponse>("greet", { name });
  }

  const res = await fetch(`${apiBaseUrl()}/api/greet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name } satisfies GreetRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return (await res.json()) as GreetResponse;
}

