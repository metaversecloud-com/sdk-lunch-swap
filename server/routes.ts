import express from "express";
import {
  handleGetGameState,
  handleGetItemDetails,
  handleGetNearbyItems,
  handlePickupItem,
  handleDropItem,
  handleDropAllNonMatches,
  handleSwapItem,
  handleSubmitMeal,
  handleSpinWheel,
  handleAdminRemoveAllItems,
  handleAdminSpawnItems,
  handleAdminGetStats,
  handleUpdateSettings,
  handleTeleportPlayer,
} from "./controllers/index.js";
import { getVersion } from "@utils/getVersion.js";

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
router.get("/item-details", handleGetItemDetails);
router.post("/spin-wheel", handleSpinWheel);
router.get("/nearby-items", handleGetNearbyItems);
router.post("/pickup-item", handlePickupItem);
router.post("/drop-item", handleDropItem);
router.post("/drop-all-non-matches", handleDropAllNonMatches);
router.post("/swap-item", handleSwapItem);
router.post("/submit-meal", handleSubmitMeal);
router.post("/teleport-player", handleTeleportPlayer);

// Admin routes
router.post("/admin/remove-all-items", handleAdminRemoveAllItems);
router.post("/admin/spawn-items", handleAdminSpawnItems);
router.get("/admin/stats", handleAdminGetStats);
router.post("/admin/update-settings", handleUpdateSettings);

export default router;
