import express from "express";
import { handleGetGameState, handleGetNearbyItems, handlePickupItem, handleDropItem, handleSwapItem, handleSubmitMeal, handleSpinWheel, handleAdminRemoveAllItems, handleAdminSpawnItems, handleAdminGetStats } from "./controllers/index.js";
import { getVersion } from "./utils/getVersion.js";
import { requireDevMode } from "./middleware/requireDevMode.js";
import devRouter from "./routes.dev.js";

const router = express.Router();
const SERVER_START_DATE = new Date();

router.get("/", (req, res) => {
  res.json({ message: "Hello from server!" });
});

router.get("/system/health", (req, res) => {
  return res.json({
    appVersion: getVersion(),
    status: "OK",
    serverStartDate: SERVER_START_DATE,
    envs: {
      NODE_ENV: process.env.NODE_ENV,
      INSTANCE_DOMAIN: process.env.INSTANCE_DOMAIN,
      INTERACTIVE_KEY: process.env.INTERACTIVE_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
    },
  });
});

router.get("/game-state", handleGetGameState);
router.get("/nearby-items", handleGetNearbyItems);
router.post("/pickup-item", handlePickupItem);
router.post("/drop-item", handleDropItem);
router.post("/swap-item", handleSwapItem);
router.post("/submit-meal", handleSubmitMeal);
router.post("/spin-wheel", handleSpinWheel);

// Admin routes
router.post("/admin/remove-all-items", handleAdminRemoveAllItems);
router.post("/admin/spawn-items", handleAdminSpawnItems);
router.get("/admin/stats", handleAdminGetStats);

// Dev routes — only available in development with API_KEY configured
if (process.env.NODE_ENV === "development" && process.env.API_KEY) {
  router.use("/dev", requireDevMode, devRouter);
  console.log("🔧 Dev routes available at /api/dev/*");
}

export default router;
