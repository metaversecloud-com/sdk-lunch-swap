import { Request, Response } from "express";
import { getFoodItemsById, errorHandler, getCredentials, Visitor, World } from "../utils/index.js";
import { VISITOR_DATA_DEFAULTS, WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { NearbyItem } from "@shared/types/NearbyItem.js";

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
    const allFoodAssets = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "lunch-swap-food",
      isPartial: true,
    });

    const foodItemsById = await getFoodItemsById(credentials);

    const now = Date.now();
    const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    const idealItemIds = new Set(visitorData.idealMeal?.map((i: any) => i.itemId) || []);

    const nearbyItems: NearbyItem[] = [];

    for (const asset of allFoodAssets) {
      // Parse uniqueName for metadata (cast needed: SDK types don't expose uniqueName on DroppedAsset class)
      const parts = ((asset as any).uniqueName || "").split("|");
      if (parts.length < 4) continue;

      const [, itemId, , timestampStr] = parts;
      const timestamp = parseInt(timestampStr, 10);

      // Check 24h TTL
      if (now - timestamp > TTL_MS) {
        // Delete expired item (fire and forget)
        try {
          if (asset.deleteDroppedAsset) {
            asset.deleteDroppedAsset().catch(() => {});
          }
        } catch {
          // Non-critical: ignore deletion failures
        }
        continue;
      }

      // Parse mystery flag from 5th segment (backward-compatible: default to "0")
      const mysteryFlag = parts.length >= 5 ? parts[4] : "0";
      const isMystery = mysteryFlag === "1";

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
