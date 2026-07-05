import { seedDemo } from "../src/lib/seed-demo";

seedDemo()
  .then((r) => {
    console.log(`✓ Đã nạp demo: ${r.campaigns} chiến dịch, ${r.leads} lead (${r.junk} rác).`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed lỗi:", e);
    process.exit(1);
  });
