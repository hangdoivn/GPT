// Đọc/ghi cấu hình đồng bộ định kỳ (singleton trong DB).
import { prisma } from "./db";

export interface SyncConfigData {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncAt: Date | null;
  lastStatus: string | null;
  lastMessage: string | null;
}

// Các chu kỳ cho phép (phút). Giới hạn để tránh gọi Facebook quá dày.
export const INTERVAL_OPTIONS = [15, 30, 60, 180, 360, 720, 1440];

export async function getSyncConfig() {
  const c = await prisma.syncConfig.findUnique({ where: { id: "singleton" } });
  return c ?? (await prisma.syncConfig.create({ data: { id: "singleton" } }));
}

export async function updateSyncConfig(data: {
  enabled?: boolean;
  intervalMinutes?: number;
  lastSyncAt?: Date;
  lastStatus?: string;
  lastMessage?: string;
}) {
  return prisma.syncConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}
