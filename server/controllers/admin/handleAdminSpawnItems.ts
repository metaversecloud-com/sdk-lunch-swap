import { Request, Response } from "express";
import { errorHandler, getCredentials, getKeyAsset, Visitor, World, dropFoodItem } from "../../utils/index.js";
import { getFoodItemsById } from "../../utils/foodItemLookup.js";
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

    // Spawn items weighted by rarity: 50% common, 30% rare, 20% epic
    const foodItemsById = await getFoodItemsById(credentials);
    const allItems = Array.from(foodItemsById.values());
    const itemsByRarity: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      (itemsByRarity[item.rarity] ??= []).push(item);
    }

    const rarityWeights = [
      { rarity: "common", weight: 0.5 },
      { rarity: "rare", weight: 0.3 },
      { rarity: "epic", weight: 0.2 },
    ];

    // Build a unique spawn list: pick items by rarity weight, no duplicates
    const spawnList: typeof allItems = [];
    const usedIds = new Set<string>();

    // Determine how many from each rarity bucket
    const targetCounts = rarityWeights.map(({ rarity, weight }) => ({
      rarity,
      target: Math.round(count * weight),
      pool: [...(itemsByRarity[rarity] || [])].sort(() => Math.random() - 0.5),
    }));

    for (const { target, pool } of targetCounts) {
      let picked = 0;
      for (const item of pool) {
        if (picked >= target || spawnList.length >= count) break;
        if (!usedIds.has(item.itemId)) {
          usedIds.add(item.itemId);
          spawnList.push(item);
          picked++;
        }
      }
    }

    // If we still need more (e.g. not enough items in weighted buckets), fill from remaining
    if (spawnList.length < count) {
      const remaining = allItems.filter((i) => !usedIds.has(i.itemId)).sort(() => Math.random() - 0.5);
      for (const item of remaining) {
        if (spawnList.length >= count) break;
        usedIds.add(item.itemId);
        spawnList.push(item);
      }
    }

    // Shuffle final list
    spawnList.sort(() => Math.random() - 0.5);

    const results = await Promise.allSettled(
      spawnList.map((foodDef) =>
        dropFoodItem({
          credentials,
          position: { x: centerX, y: centerY },
          itemId: foodDef.itemId,
          rarity: foodDef.rarity,
          offsetRange: radius,
        }).then(() => ({ itemId: foodDef.itemId, name: foodDef.name, rarity: foodDef.rarity })),
      ),
    );

    const spawnedItems = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ itemId: string; name: string; rarity: string }>).value);

    for (const r of results) {
      if (r.status === "rejected") console.warn("Failed to spawn item:", r.reason);
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
