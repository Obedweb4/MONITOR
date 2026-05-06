const config = require("./config");
const app = require("./lib/server");
const { initDB } = require("./lib/db");
const { startPingEngine } = require("./lib/ping");

async function start() {
  await initDB();
  app.listen(config.PORT, "0.0.0.0", () => {
    console.log(`\n🚀 OBEDTECH MONITOR API live on port ${config.PORT}`);
    console.log(`🔁 Ping check every ${config.PING_CHECK_INTERVAL_SECS}s`);
    console.log(`📌 Min ping interval: ${config.MIN_PING_INTERVAL_MINS} mins\n`);
    startPingEngine();
  });
}

process.on("SIGINT",  () => { console.log("\n🛑 Stopping..."); process.exit(0); });
process.on("SIGTERM", () => { console.log("\n🛑 Stopping..."); process.exit(0); });

start().catch((err) => {
  console.error("❌ Startup failed:", err.message);
  process.exit(1);
});
