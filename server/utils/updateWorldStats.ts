import { Credentials } from "../types/index.js";
import { World } from "./topiaInit.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";

/**
 * Increment world-level stats (totalPickups, totalDrops, etc.) in one call.
 */
export const updateWorldStats = async (
  urlSlug: string,
  credentials: Credentials,
  stats: { pickups?: number; drops?: number },
): Promise<void> => {
  const world = await World.create(urlSlug, { credentials });
  await world.fetchDataObject();
  const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

  const update: Record<string, number> = {};
  if (stats.pickups) update.totalPickups = worldData.totalPickups + stats.pickups;
  if (stats.drops) update.totalDrops = worldData.totalDrops + stats.drops;

  if (Object.keys(update).length > 0) {
    await world.updateDataObject(update);
  }
};
