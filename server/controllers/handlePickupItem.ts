import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getVisitor,
  grantFoodToVisitor,
  getVisitorBag,
  grantXp,
  resolveFoodAsset,
  updateWorldStats,
  pickupFoodAsset,
  buildBagItemFromDef,
  calculatePickupXp,
  checkPickupBadges,
  checkLevelBadges,
  getVisitorBadges,
} from "@utils/index.js";
import { BAG_CAPACITY, BAG_CAPACITY_POST_COMPLETION, getLevelForXp } from "@shared/data/xpConfig.js";

export const handlePickupItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;
    const { droppedAssetId } = req.body;

    if (!droppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing droppedAssetId" });
    }

    // Resolve the food asset (fetch, parse uniqueName, look up definition)
    const resolved = await resolveFoodAsset(droppedAssetId, urlSlug, credentials);
    if (!resolved.success) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }
    const { foodAsset, foodDef, isMystery } = resolved;

    // Lock the asset while we process the pickup to prevent race conditions
    try {
      await foodAsset.updateDataObject(
        {},
        {
          lock: {
            lockId: `${urlSlug}-${droppedAssetId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`,
          },
        },
      );
    } catch {
      return res.status(409).json({ success: false, message: "This item is already being picked up" });
    }

    // Fetch visitor with data and bag
    const { visitor, visitorData, visitorInventory, brownBag } = await getVisitor(credentials, true);

    // Prevent picking up a duplicate item already in the bag
    if (brownBag.some((item) => item.itemId === foodDef.itemId)) {
      return res.status(400).json({
        success: false,
        message: `You already have ${foodDef.name} in your bag!`,
      });
    }

    // Check bag capacity (8 pre-completion, 3 post-completion; big-bag buff adds 2)
    const bigBagBonus = visitorData.dailyBuff === "big-bag" ? 2 : 0;
    const maxCapacity = (visitorData.completedToday ? BAG_CAPACITY_POST_COMPLETION : BAG_CAPACITY) + bigBagBonus;
    if (brownBag.length >= maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Bag is full (${brownBag.length}/${maxCapacity})`,
      });
    }

    // Build bag item and grant to inventory
    const { bagItem: newBagItem, matchesTargetMeal } = buildBagItemFromDef(foodDef, visitorData.targetMeal);
    await grantFoodToVisitor(visitor, credentials, newBagItem);

    // Hot streak logic
    let xpMultiplier = 1;
    const currentItemStreak = visitorData.pickupStreak || 0;
    const wasHotStreak = visitorData.hotStreakActive || false;
    const hotStreakActivated = matchesTargetMeal && currentItemStreak + 1 >= 3;

    // Track mystery reveals and rarity collection
    const prevRarity = visitorData.totalItemsCollectedByRarity || { common: 0, rare: 0, epic: 0 };
    const newMysteryTotal = (visitorData.totalMysteryItemsRevealed || 0) + (isMystery ? 1 : 0);
    const newRarityTotals = {
      ...prevRarity,
      [foodDef.rarity]: (prevRarity[foodDef.rarity as keyof typeof prevRarity] || 0) + 1,
    };

    const updatedData = {
      pickupsToday: (visitorData.pickupsToday || 0) + 1,
      totalPickups: (visitorData.totalPickups || 0) + 1,
      pickupStreak: matchesTargetMeal ? currentItemStreak + 1 : 0,
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
      analytics: [{ analyticName: "pickups", profileId, urlSlug, uniqueKey: profileId }],
    });

    // Calculate and grant XP (double-xp buff doubles all XP)
    const buffMultiplier = visitorData.dailyBuff === "double-xp" ? 2 : 1;
    const xpEarned = calculatePickupXp(foodDef.rarity, matchesTargetMeal, xpMultiplier) * buffMultiplier;
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world stats
    await updateWorldStats(urlSlug, credentials, { pickups: 1 });

    // Award badges and re-fetch inventory so client can update UI
    try {
      await checkPickupBadges({
        credentials,
        visitor,
        visitorInventory,
        totalMysteryItemsRevealed: newMysteryTotal,
        totalEpicItemsCollected: newRarityTotals.epic || 0,
      });
      await checkLevelBadges({ credentials, visitor, visitorInventory, level: newLevel });
    } catch (err) {
      console.warn("Badge check failed:", err);
    }

    // Re-fetch inventory to include any newly awarded badges
    await visitor.fetchInventoryItems();
    const updatedVisitorInventory = getVisitorBadges(visitor.inventoryItems || []);

    // Fire toast with fun fact
    let title = `Picked up ${foodDef.name}!`;
    if (isMystery) title = `Mystery revealed: ${foodDef?.name ?? "item"}!`;
    if (matchesTargetMeal) title += " Perfect match!";
    if (xpEarned) title += ` (+${xpEarned} XP)`;
    visitor
      .fireToast({
        title,
        text: foodDef.funFact,
      })
      .catch(() => {});

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, visitorData.targetMeal, credentials);

    // Delete the dropped asset from world (race condition guard)
    const { pickedUp } = await pickupFoodAsset(foodAsset, urlSlug, credentials);
    if (!pickedUp) {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    return res.json({
      success: true,
      brownBag: updatedBag,
      pickedUpItem: newBagItem,
      matchesTargetMeal,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
      funFact: foodDef.funFact,
      isMystery,
      hotStreakActive: updatedData.hotStreakActive,
      pickupStreak: updatedData.pickupStreak,
      xpMultiplier,
      visitorInventory: updatedVisitorInventory,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePickupItem",
      message: "Error picking up item",
      req,
      res,
    });
  }
};
