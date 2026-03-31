import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getKeyAsset,
  Visitor,
  World,
  dropFoodItem,
  getFoodItemsInWorld,
} from "@utils/index.js";
import { getFoodItemsById } from "@utils/foodItemLookup.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { VisitorInterface, WorldInterface } from "@rtsdk/topia";

export const handleAdminDropItems = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const itemIds: string[] | undefined = req.body.itemIds;
    const count = Math.min(req.body.count || 10, 60); // Cap at 60

    // Get key asset position as drop center
    const droppedAsset = await getKeyAsset(credentials);
    const centerX = droppedAsset.position?.x ?? 0;
    const centerY = droppedAsset.position?.y ?? 0;

    // Get world data for drop radius
    const world: WorldInterface = World.create(urlSlug, { credentials });
    await world.fetchDetails();
    const { width, height } = world;
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    const radius = worldData.dropRadiusMax || 2000;

    const foodItemsById = await getFoodItemsById(credentials);

    let dropList: { itemId: string; name: string; rarity: string }[];

    if (itemIds && itemIds.length > 0) {
      // Drop specific items selected by admin
      dropList = itemIds
        .map((id) => foodItemsById.get(id))
        .filter(Boolean)
        .map((def) => ({ itemId: def!.itemId, name: def!.name, rarity: def!.rarity }));
    } else {
      // Drop random items weighted by rarity: 50% common, 30% rare, 20% epic
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

      const tempList: typeof allItems = [];
      const usedIds = new Set<string>();

      const targetCounts = rarityWeights.map(({ rarity, weight }) => ({
        rarity,
        target: Math.round(count * weight),
        pool: [...(itemsByRarity[rarity] || [])].sort(() => Math.random() - 0.5),
      }));

      for (const { target, pool } of targetCounts) {
        let picked = 0;
        for (const item of pool) {
          if (picked >= target || tempList.length >= count) break;
          if (!usedIds.has(item.itemId)) {
            usedIds.add(item.itemId);
            tempList.push(item);
            picked++;
          }
        }
      }

      if (tempList.length < count) {
        const remaining = allItems.filter((i) => !usedIds.has(i.itemId)).sort(() => Math.random() - 0.5);
        for (const item of remaining) {
          if (tempList.length >= count) break;
          usedIds.add(item.itemId);
          tempList.push(item);
        }
      }

      tempList.sort(() => Math.random() - 0.5);
      dropList = tempList;
    }

    // Drop in batches of 30
    const BATCH_SIZE = 30;
    const results: PromiseSettledResult<{ itemId: string; name: string; rarity: string }>[] = [];
    for (let i = 0; i < dropList.length; i += BATCH_SIZE) {
      const batch = dropList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((foodDef) =>
          dropFoodItem({
            credentials,
            position: { x: centerX, y: centerY },
            itemId: foodDef.itemId,
            offsetRange: radius,
            minOffset: worldData.dropRadiusMin,
            mystery: Math.random() < 0.05,
            host: req.hostname,
            worldSize: width && height ? { width, height } : undefined,
          }).then(() => ({ itemId: foodDef.itemId, name: foodDef.name, rarity: foodDef.rarity })),
        ),
      );
      results.push(...batchResults);
    }

    const droppedItems = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ itemId: string; name: string; rarity: string }>).value);

    for (const r of results) {
      if (r.status === "rejected") console.warn("Failed to drop item:", r.reason);
    }

    const foodItemsInWorld = await getFoodItemsInWorld(world, credentials);

    return res.json({
      success: true,
      droppedCount: droppedItems.length,
      droppedItems,
      foodItemsInWorld,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAdminDropItems",
      message: "Error dropping items",
      req,
      res,
    });
  }
};
