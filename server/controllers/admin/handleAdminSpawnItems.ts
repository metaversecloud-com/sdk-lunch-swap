import { Request, Response } from "express";
import { errorHandler, getCredentials, getKeyAsset, Visitor, World, dropFoodItem } from "../../utils/index.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";

export const handleAdminSpawnItems = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!(visitor as any).isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const count = Math.min(req.body.count || 10, 50); // Cap at 50

    // Get key asset position as spawn center
    const droppedAsset = await getKeyAsset(credentials);
    const centerX = droppedAsset.position?.x ?? 0;
    const centerY = droppedAsset.position?.y ?? 0;

    // Get world data for spawn radius
    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    const radius = worldData.spawnRadiusMax || 2000;

    // Spawn random items
    const allItemIds = Array.from(FOOD_ITEMS_BY_ID.keys());
    const spawnedItems: { itemId: string; name: string; rarity: string }[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const randomId = allItemIds[Math.floor(Math.random() * allItemIds.length)];
        const foodDef = FOOD_ITEMS_BY_ID.get(randomId);
        if (!foodDef) continue;

        await dropFoodItem({
          credentials,
          position: { x: centerX, y: centerY },
          itemId: foodDef.itemId,
          rarity: foodDef.rarity,
          offsetRange: radius,
        });

        spawnedItems.push({ itemId: foodDef.itemId, name: foodDef.name, rarity: foodDef.rarity });
      } catch (err) {
        console.warn("Failed to spawn item:", err);
      }
    }

    return res.json({
      success: true,
      spawnedCount: spawnedItems.length,
      spawnedItems,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAdminSpawnItems",
      message: "Error spawning items",
      req,
      res,
    });
  }
};
