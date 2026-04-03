import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getKeyAsset,
  getFoodItemsById,
  parseLeaderboard,
  World,
  dropFoodItem,
  getVisitor,
  getVisitorBag,
  removeFoodFromVisitor,
  getBadges,
  getVisitorBadges,
  getFoodItemsInWorld,
  DroppedAsset,
} from "@utils/index.js";
import { generateMeal, getCurrentDateMT, getCurrentWeekMT, getPreviousWeekMT } from "@utils/gameLogic/index.js";
import { VisitorInterface, WorldInterface } from "@rtsdk/topia";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { Credentials } from "../types/Credentials.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    // Fetch key asset, visitor (with data + inventory), and world in parallel
    const [
      droppedAsset,
      { visitor, visitorData, brownBag: currentBag, newDay, isFirstPlay, xp, level },
      world,
      badges,
    ] = await Promise.all([
      getKeyAsset(credentials),
      getVisitor(credentials, true),
      World.create(credentials.urlSlug, { credentials }),
      getBadges(credentials, forceRefreshInventory),
    ]);
    const isAdmin = (visitor as VisitorInterface).isAdmin || false;

    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

    // Parse leaderboard from key asset
    const leaderboard = parseLeaderboard(droppedAsset);

    // Check for new day
    const currentDate = getCurrentDateMT();

    let { targetMeal, completedToday, nutritionScore, superCombosFound, longestStreak, hotStreakActive, dailyBuff } =
      visitorData;
    let brownBag = currentBag;

    // If new day or no target meal, reset progress and generate new meal
    if (newDay || !targetMeal || targetMeal.length === 0) {
      if (currentBag.length > 0) {
        // Clear bag items from inventory
        for (const bagItem of currentBag) {
          await removeFoodFromVisitor(visitor, credentials, bagItem.itemId);
        }
      }

      // Generate new target meal and brown bag
      targetMeal = await generateMeal(credentials);

      completedToday = false;
      dailyBuff = null;
      nutritionScore = null;
      superCombosFound = [];

      // Update visitor data for new day
      await visitor.updateDataObject(
        {
          lastPlayedDate: currentDate,
          targetMeal,
          completedToday: false,
          completionTimestamp: null,
          pickupsToday: 0,
          dropsToday: 0,
          itemsMatchedToday: 0,
          nutritionScore,
          superCombosFound,
          dailyBuff,
        },
        {
          analytics: [{ analyticName: "starts", profileId, urlSlug, uniqueKey: profileId }],
        },
      );

      // Update world data object
      if (worldData.currentDate !== currentDate) {
        // reset if new day
        worldData.totalCompletionsToday = 0;
        worldData.totalStartsToday = 1;
        worldData.currentDate = currentDate;
      } else {
        worldData.totalStartsToday = (worldData.totalStartsToday || 0) + 1;
      }
      await world.updateDataObject(worldData);

      // Read current bag from inventory (re-fetch after mutations on new day)
      brownBag = await getVisitorBag(visitor, targetMeal, credentials);
    } else {
      await visitor.updateDataObject(
        {},
        {
          analytics: [{ analyticName: "joins", profileId, urlSlug, uniqueKey: profileId }],
        },
      );
    }

    // Enrich target meal items with images (for meals stored before image field existed)
    if (targetMeal?.length && !targetMeal[0].image) {
      const foodItemsById = await getFoodItemsById(credentials);
      for (const item of targetMeal) {
        const def = foodItemsById.get(item.itemId);
        if (def?.image) item.image = def.image;
      }
    }

    // Calculate display streak — weekly: streak is active if last completion was this week or last week
    let displayStreak = visitorData.currentStreak;
    const lastCompletionWeek = visitorData.lastCompletionWeek || "";
    if (lastCompletionWeek) {
      const currentWeek = getCurrentWeekMT();
      const previousWeek = getPreviousWeekMT();
      if (lastCompletionWeek !== currentWeek && lastCompletionWeek !== previousWeek) {
        displayStreak = 0; // Show 0 but don't write to user data
      }
    } else {
      displayStreak = 0;
    }

    const foodItemsInWorld = isAdmin ? await getFoodItemsInWorld(world, credentials) : [];

    res.json({
      success: true,
      isNewDay: newDay,
      isFirstPlay,
      brownBag,
      targetMeal,
      completedToday,
      nutritionScore,
      superCombosFound,
      xp,
      level,
      currentStreak: displayStreak,
      longestStreak,
      hotStreakActive,
      isAdmin,
      dailyBuff,
      dropRadiusMin: worldData.dropRadiusMin,
      dropRadiusMax: worldData.dropRadiusMax,
      badges,
      visitorInventory: getVisitorBadges(visitor.inventoryItems || []),
      leaderboard,
      foodItemsInWorld,
    });

    // Fire-and-forget: deduplicate items and drop missing ones in the background
    if (newDay || !visitorData.targetMeal || visitorData.targetMeal.length === 0) {
      ensureOneOfEverything(world, credentials, urlSlug, worldData, droppedAsset, req.hostname).catch((err) =>
        console.warn("Background item cleanup failed:", err),
      );
    }
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error getting game state",
      req,
      res,
    });
  }
};

/**
 * Background task: ensure exactly one of every food item exists in the world.
 * Deletes duplicates and drops missing items.
 */
async function ensureOneOfEverything(
  world: WorldInterface,
  credentials: Credentials,
  urlSlug: string,
  worldData: { dropRadiusMin?: number; dropRadiusMax?: number },
  droppedAsset: { position?: { x: number; y: number } },
  hostname: string,
) {
  const inWorldData = await getFoodItemsInWorld(world, credentials);

  // Delete duplicates — for items with countInWorld > 1, remove extras
  const deletePromises: Promise<unknown>[] = [];
  for (const item of inWorldData) {
    if (item.countInWorld > 1) {
      for (const assetId of item.droppedAssetIds.slice(1)) {
        deletePromises.push(
          DroppedAsset.create(assetId, urlSlug, { credentials })
            .deleteDroppedAsset()
            .catch(() => {}),
        );
      }
    }
  }
  await Promise.allSettled(deletePromises);

  // Drop missing items — items with countInWorld === 0
  const missingItems = inWorldData.filter((item) => item.countInWorld === 0);
  if (missingItems.length === 0) return;

  await world.fetchDetails();
  const { width, height } = world as WorldInterface;
  const dropCenter = {
    x: droppedAsset.position?.x ?? 0,
    y: droppedAsset.position?.y ?? 0,
  };

  const dropPromises = missingItems.map((item) =>
    dropFoodItem({
      credentials,
      position: dropCenter,
      itemId: item.itemId,
      minOffset: worldData.dropRadiusMin,
      offsetRange: worldData.dropRadiusMax || 2000,
      mystery: Math.random() < 0.15,
      host: hostname,
      worldSize: width && height ? { width, height } : undefined,
    }).catch((err) => console.warn("Failed to drop item:", item.itemId, err)),
  );
  await Promise.allSettled(dropPromises);
}
