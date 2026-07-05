// Bộ hẹn giờ chạy đồng bộ định kỳ ngay trong tiến trình Node (khi dùng `next start`).
// Timer lưu trên globalThis để không bị nhân đôi khi hot-reload ở dev.

import { syncAll } from "./sync";
import { getSyncConfig, updateSyncConfig } from "./sync-config";

interface SchedulerState {
  timer?: ReturnType<typeof setTimeout>;
  running: boolean;
}

const g = globalThis as unknown as { __syncScheduler?: SchedulerState };
const state: SchedulerState = (g.__syncScheduler ??= { running: false });

/** Chạy một lần đồng bộ và ghi lại kết quả vào cấu hình. */
export async function runScheduledSync() {
  if (state.running) return; // tránh chồng lần chạy nếu lần trước chưa xong
  state.running = true;
  try {
    const r = await syncAll();
    await updateSyncConfig({
      lastSyncAt: new Date(),
      lastStatus: r.skipped ? "skipped" : "ok",
      lastMessage: r.message,
    });
    return r;
  } catch (e) {
    await updateSyncConfig({
      lastSyncAt: new Date(),
      lastStatus: "error",
      lastMessage: e instanceof Error ? e.message : String(e),
    });
  } finally {
    state.running = false;
  }
}

/** Khởi động (hoặc khởi động lại) bộ hẹn giờ theo cấu hình hiện tại. */
export async function startScheduler() {
  stopScheduler();
  const cfg = await getSyncConfig();
  if (!cfg.enabled) return;

  const ms = Math.max(1, cfg.intervalMinutes) * 60_000;
  const tick = async () => {
    await runScheduledSync();
    state.timer = setTimeout(tick, ms);
  };
  state.timer = setTimeout(tick, ms);
}

export function stopScheduler() {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
}

export async function restartScheduler() {
  await startScheduler();
}
