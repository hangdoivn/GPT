// Chạy khi server Next.js khởi động — bật scheduler đồng bộ định kỳ nếu đã cấu hình.
export async function register() {
  // Chỉ chạy ở runtime Node (không phải Edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    await startScheduler().catch((e) => {
      console.error("Không khởi động được scheduler:", e);
    });
  }
}
