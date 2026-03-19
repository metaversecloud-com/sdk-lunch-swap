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

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;
    const forceRefreshInventory = req.query.forceRefreshInventory === "true";

    // Fetch key asset, visitor (with data + inventory), and world in parallel
    const [
      droppedAsset,
      { visitor, visitorData, brownBag: currentBag, newDay, xp, level, hasRewardToken },
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

    if (newDay || !targetMeal || targetMeal.length === 0) {
      // Auto-drop yesterday's bag items into world at key asset position
      if (currentBag.length > 0) {
        for (const bagItem of currentBag) {
          try {
            await removeFoodFromVisitor(visitor, credentials, bagItem.itemId);
            await dropFoodItem({
              credentials,
              position: {
                x: visitor.moveTo?.x ?? 0,
                y: visitor.moveTo?.y ?? 0,
              },
              itemId: bagItem.itemId,
              offsetRange: 200,
              host: req.hostname,
            });
          } catch (err) {
            console.warn("Failed to auto-drop bag item:", bagItem.itemId, err);
          }
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

      // Pick up to 3 items to spawn into the world, maximizing ecosystem diversity.
      // - Prioritize items not currently in world (countInWorld === 0)
      // - Include target meal items if they're missing from the world
      // - For duplicates already in world, delete one existing copy and spawn the new item
      const inWorldData = await getFoodItemsInWorld(world, credentials);
      const inWorldMap = new Map(inWorldData.map((item) => [item.itemId, item]));

      // Build spawn candidates from ecosystem items NOT in visitor's bag
      const notInWorld = inWorldData.filter((item) => item.countInWorld === 0).sort(() => Math.random() - 0.5);

      // Also check if any target meal items are missing from the world
      const targetMissing = (targetMeal || [])
        .filter((m) => !inWorldMap.get(m.itemId)?.countInWorld)
        .map((m) => inWorldData.find((i) => i.itemId === m.itemId))
        .filter(Boolean);

      // Priority: target meal items missing from world, then other missing items
      const spawnIds = new Set<string>();
      const itemsToSpawn: { itemId: string; name: string; foodGroup: string; rarity: string }[] = [];

      for (const item of targetMissing) {
        if (itemsToSpawn.length >= 3) break;
        if (!spawnIds.has(item!.itemId)) {
          itemsToSpawn.push(item!);
          spawnIds.add(item!.itemId);
        }
      }
      for (const item of notInWorld) {
        if (itemsToSpawn.length >= 3) break;
        if (!spawnIds.has(item.itemId)) {
          itemsToSpawn.push(item);
          spawnIds.add(item.itemId);
        }
      }

      // If still not enough, pick duplicate items and remove one existing copy from world
      if (itemsToSpawn.length < 3) {
        const duplicatesInWorld = inWorldData
          .filter((item) => item.countInWorld > 1 && !spawnIds.has(item.itemId))
          .sort((a, b) => b.countInWorld - a.countInWorld) // most duplicated first
          .sort(() => Math.random() - 0.3);

        for (const dup of duplicatesInWorld) {
          if (itemsToSpawn.length >= 3) break;
          // Try to delete one existing copy of this duplicate
          const assetIdToRemove = dup.droppedAssetIds[0];
          if (assetIdToRemove) {
            try {
              const dupAsset = DroppedAsset.create(assetIdToRemove, urlSlug, { credentials });
              await dupAsset.deleteDroppedAsset();
            } catch {
              // Asset may already be deleted — continue anyway
            }
          }
          // Find a replacement item not in world (and not yet in our spawn list)
          const replacement = inWorldData.find((item) => item.countInWorld === 0 && !spawnIds.has(item.itemId));
          if (replacement) {
            itemsToSpawn.push(replacement);
            spawnIds.add(replacement.itemId);
          }
        }
      }

      if (itemsToSpawn.length > 0) {
        await world.fetchDetails();
        const { width, height } = world as WorldInterface;

        const spawnedIds: string[] = [];
        const spawnCenter = {
          x: droppedAsset.position?.x ?? 0,
          y: droppedAsset.position?.y ?? 0,
        };
        for (const item of itemsToSpawn) {
          try {
            await dropFoodItem({
              credentials,
              position: spawnCenter,
              itemId: item.itemId,
              minOffset: worldData.spawnRadiusMin,
              offsetRange: worldData.spawnRadiusMax || 2000,
              mystery: Math.random() < 0.15,
              host: req.hostname,
              worldSize: width && height ? { width, height } : undefined,
            });
            spawnedIds.push(item.itemId);
          } catch (err) {
            console.warn("Failed to spawn item:", item.itemId, err);
          }
        }
      }

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

    return res.json({
      success: true,
      isNewDay: newDay,
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
      hasRewardToken,
      dailyBuff,
      spawnRadiusMin: worldData.spawnRadiusMin,
      spawnRadiusMax: worldData.spawnRadiusMax,
      proximityRadius: worldData.proximityRadius,
      badges,
      visitorInventory: getVisitorBadges(visitor.inventoryItems || []),
      leaderboard,
      foodItemsInWorld,
    });
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
