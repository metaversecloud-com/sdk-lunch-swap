import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  pickupFoodAsset,
  dropFoodItem,
  getVisitor,
  grantFoodToVisitor,
  removeFoodFromVisitor,
  getVisitorBag,
  grantXp,
  resolveFoodAsset,
  updateWorldStats,
  buildBagItemFromDef,
  calculatePickupXp,
  checkPickupBadges,
  checkLevelBadges,
  getVisitorBadges,
} from "@utils/index.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";

export const handleSwapItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;
    const { dropItemId, pickupDroppedAssetId } = req.body;

    if (!dropItemId || !pickupDroppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing dropItemId or pickupDroppedAssetId" });
    }

    // Resolve the pickup target (fail fast if gone)
    const resolved = await resolveFoodAsset(pickupDroppedAssetId, urlSlug, credentials);
    if (!resolved.success) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }
    const { foodAsset, foodDef, wasMystery } = resolved;

    // Lock the asset while we process the pickup to prevent race conditions
    try {
      await foodAsset.updateDataObject(
        {},
        {
          lock: {
            lockId: `${urlSlug}-${pickupDroppedAssetId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`,
          },
        },
      );
    } catch {
      return res.status(409).json({ success: false, message: "This item is already being picked up" });
    }

    // Fetch visitor with data and bag
    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);
    const visitorInventory = getVisitorBadges((visitor as any).inventoryItems || []);

    // Find drop item in bag
    const droppedItem = brownBag.find((i) => i.itemId === dropItemId);
    if (!droppedItem) {
      return res.status(400).json({ success: false, message: "Item not found in bag" });
    }

    // --- DROP phase (mirrors handleDropItem) ---

    // Remove the dropped item from inventory and drop into world
    await removeFoodFromVisitor(visitor, credentials, droppedItem.itemId);
    await dropFoodItem({
      credentials,
      position: {
        x: (visitor as any).moveTo?.x ?? 0,
        y: (visitor as any).moveTo?.y ?? 0,
      },
      itemId: droppedItem.itemId,
      rarity: droppedItem.rarity,
      shouldTriggerParticle: true,
      host: req.hostname,
    });

    // --- PICKUP phase (mirrors handlePickupItem) ---

    // Build bag item and grant to inventory
    const { bagItem: newBagItem, matchesIdealMeal } = buildBagItemFromDef(foodDef, visitorData.idealMeal);
    await grantFoodToVisitor(visitor, credentials, newBagItem);

    // Hot streak logic (mirrors handlePickupItem)
    let xpMultiplier = 1;
    const currentIdealStreak = visitorData.idealPickupStreak || 0;
    const wasHotStreak = visitorData.hotStreakActive || false;
    const hotStreakActivated = matchesIdealMeal && currentIdealStreak + 1 >= 3;

    // Track mystery reveals and rarity collection
    const prevRarity = visitorData.totalItemsCollectedByRarity || { common: 0, rare: 0, epic: 0 };
    const newMysteryTotal = (visitorData.totalMysteryItemsRevealed || 0) + (wasMystery ? 1 : 0);
    const newRarityTotals = {
      ...prevRarity,
      [foodDef.rarity]: (prevRarity[foodDef.rarity as keyof typeof prevRarity] || 0) + 1,
    };

    const updatedData = {
      dropsToday: (visitorData.dropsToday || 0) + 1,
      totalDrops: (visitorData.totalDrops || 0) + 1,
      pickupsToday: (visitorData.pickupsToday || 0) + 1,
      totalPickups: (visitorData.totalPickups || 0) + 1,
      idealPickupStreak: matchesIdealMeal ? currentIdealStreak + 1 : 0,
      hotStreakActive: wasHotStreak ? false : hotStreakActivated,
      totalMysteryItemsRevealed: newMysteryTotal,
      totalItemsCollectedByRarity: newRarityTotals,
    };

    if (wasHotStreak) {
      xpMultiplier = 3;
    } else if (hotStreakActivated) {
      visitor
        .fireToast({
          title: "HOT STREAK!",
          text: "Your next pickup gets 3x XP!",
        })
        .catch(() => {});
    }

    await visitor.updateDataObject(updatedData, {
      analytics: [
        { analyticName: "pickups", profileId, urlSlug, uniqueKey: profileId },
        { analyticName: "drops", profileId, urlSlug, uniqueKey: profileId },
      ],
    });

    // Calculate XP: DROP + PICKUP (with rarity multiplier, ideal meal bonus, hot streak multiplier)
    const buffMultiplier = visitorData.dailyBuff === "double-xp" ? 2 : 1;
    const xpEarned =
      (XP_ACTIONS.DROP + calculatePickupXp(foodDef.rarity, matchesIdealMeal, xpMultiplier)) * buffMultiplier;

    // Grant XP to visitor inventory
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world stats (both pickup and drop)
    await updateWorldStats(urlSlug, credentials, { pickups: 1, drops: 1 });

    // Award badges and re-fetch inventory so client can update UI
    try {
      await checkPickupBadges({
        credentials,
        visitor,
        visitorInventory: visitorInventory.badges,
        totalMysteryItemsRevealed: newMysteryTotal,
        totalEpicItemsCollected: newRarityTotals.epic || 0,
      });
      await checkLevelBadges({ credentials, visitor, visitorInventory: visitorInventory.badges, level: newLevel });
    } catch (err) {
      console.warn("Badge check failed:", err);
    }

    // Re-fetch inventory to include any newly awarded badges
    await visitor.fetchInventoryItems();
    const updatedVisitorInventory = getVisitorBadges((visitor as any).inventoryItems || []);

    // Fire toast
    visitor
      .fireToast({
        title: "Swapped!",
        text: `Dropped ${droppedItem.name}, picked up ${foodDef.name}!`,
      })
      .catch(() => {});

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, visitorData.idealMeal, credentials);

    // Delete the dropped asset from world (race condition guard)
    const { pickedUp } = await pickupFoodAsset(foodAsset, urlSlug, credentials);
    if (!pickedUp) {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    return res.json({
      success: true,
      brownBag: updatedBag,
      droppedItem,
      pickedUpItem: newBagItem,
      matchesIdealMeal,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
      funFact: foodDef.funFact,
      wasMystery,
      hotStreakActive: updatedData.hotStreakActive,
      idealPickupStreak: updatedData.idealPickupStreak,
      xpMultiplier,
      visitorInventory: updatedVisitorInventory,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSwapItem",
      message: "Error swapping item",
      req,
      res,
    });
  }
};
