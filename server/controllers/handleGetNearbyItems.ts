import { Request, Response } from "express";
import { getFoodItemsById, errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { VISITOR_DATA_DEFAULTS, WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { NearbyItem } from "@shared/types/NearbyItem.js";
import { SUPER_COMBOS } from "@shared/data/superCombos.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

export const handleGetNearbyItems = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();
    const visitorData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    // Use visitor.moveTo for position (NOT visitor.position)
    const visitorX = (visitor as any).moveTo?.x ?? 0;
    const visitorY = (visitor as any).moveTo?.y ?? 0;

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    const proximityRadius = worldData.proximityRadius || 300;

    // Fetch all food items with isPartial to avoid loading data objects
    const allFoodAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "LunchSwap_foodItem",
      isPartial: true,
    });

    const foodItemsById = await getFoodItemsById(credentials);

    const now = Date.now();
    const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    const idealItemIds = new Set(visitorData.idealMeal?.map((i: any) => i.itemId) || []);

    // combo-finder buff: map nearby item IDs to the bag item name they combo with
    let comboTargetMap: Map<string, string> | null = null;
    if (visitorData.dailyBuff === "combo-finder") {
      await visitor.fetchInventoryItems();
      const allItems: any[] = (visitor as any).inventoryItems || [];
      const bagItemIds = new Set(
        allItems
          .filter(
            (item: any) =>
              item.type === "ITEM" &&
              item.status === "ACTIVE" &&
              (item.quantity ?? item.availableQuantity ?? 1) > 0 &&
              item.item?.name !== "Experience Points" &&
              item.item?.name !== "Reward Token",
          )
          .map((item: any) => item.metadata?.itemId ?? item.item?.metadata?.itemId ?? item.name),
      );
      comboTargetMap = new Map<string, string>();
      for (const combo of SUPER_COMBOS) {
        const [a, b] = combo.items;
        const nameA = foodItemsById.get(a)?.name ?? a;
        const nameB = foodItemsById.get(b)?.name ?? b;
        if (bagItemIds.has(a) && !bagItemIds.has(b)) comboTargetMap.set(b, nameA);
        if (bagItemIds.has(b) && !bagItemIds.has(a)) comboTargetMap.set(a, nameB);
      }
    }

    const nearbyItems: NearbyItem[] = [];

    for (const asset of allFoodAssets) {
      // Parse uniqueName: `LunchSwap_foodItem_${itemId}_${mysteryFlag}`
      const parts = (asset.uniqueName || "").split("_");

      let itemId = "";
      const dataObj = asset.dataObject as Record<string, any> | null | undefined;

      if (parts.length >= 3) {
        itemId = parts[2];
      } else if (dataObj?.itemId) {
        itemId = dataObj.itemId;
      }

      const isMystery = parts.length >= 4 ? parts[3] === "1" : false;

      // Look up item details from inventory cache
      const foodDef = foodItemsById.get(itemId);
      if (!foodDef) continue;

      // Calculate distance
      const assetX = asset.position?.x ?? 0;
      const assetY = asset.position?.y ?? 0;
      const dx = visitorX - assetX;
      const dy = visitorY - assetY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Filter to proximity radius
      if (distance > proximityRadius) continue;

      nearbyItems.push({
        droppedAssetId: asset.id || "",
        itemId: isMystery ? "mystery" : itemId,
        name: isMystery ? "???" : foodDef.name,
        foodGroup: foodDef.foodGroup, // Keep foodGroup as a hint even for mystery items
        rarity: isMystery ? ("mystery" as any) : foodDef.rarity,
        distance: Math.round(distance),
        matchesIdealMeal: isMystery ? false : idealItemIds.has(itemId),
        lastDroppedByName: "", // Would need data object; not critical for list view
        isMystery,
        isComboMatch: !isMystery && comboTargetMap ? comboTargetMap.has(itemId) : false,
        comboMatchPartner: (!isMystery && comboTargetMap?.get(itemId)) || undefined,
      });
    }

    // Sort by distance ascending
    nearbyItems.sort((a, b) => a.distance - b.distance);

    return res.json({ success: true, nearbyItems });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetNearbyItems",
      message: "Error getting nearby items",
      req,
      res,
    });
  }
};
