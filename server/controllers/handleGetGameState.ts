import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getKeyAsset,
  World,
  dropFoodItem,
  getVisitor,
  getVisitorBag,
  grantFoodToVisitor,
  removeFoodFromVisitor,
  getBadges,
  getVisitorBadges,
} from "@utils/index.js";
import { generateIdealMeal, generateBrownBag, getCurrentDateMT } from "@utils/gameLogic/index.js";
import { VisitorInterface } from "@rtsdk/topia";
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

    // Check for new day
    const currentDate = getCurrentDateMT();

    let idealMeal = visitorData.idealMeal;
    let completedToday = visitorData.completedToday;

    if (newDay) {
      // Auto-drop yesterday's bag items into world at key asset position
      if (currentBag.length > 0) {
        const center = {
          x: droppedAsset.position?.x ?? 0,
          y: droppedAsset.position?.y ?? 0,
        };
        for (const bagItem of currentBag) {
          try {
            await removeFoodFromVisitor(visitor, credentials, bagItem.itemId);
            await dropFoodItem({
              credentials,
              position: center,
              itemId: bagItem.itemId,
              rarity: bagItem.rarity,
              offsetRange: 200,
            });
          } catch (err) {
            console.warn("Failed to auto-drop bag item:", bagItem.itemId, err);
          }
        }
      }

      // Generate new ideal meal and brown bag
      idealMeal = await generateIdealMeal(credentials);
      const newBagItems = await generateBrownBag(credentials, idealMeal);
      completedToday = false;

      // Grant new bag items to visitor inventory
      for (const bagItem of newBagItems) {
        try {
          await grantFoodToVisitor(visitor, credentials, bagItem);
        } catch (err) {
          console.warn("Failed to grant bag item:", bagItem.itemId, err);
        }
      }

      // Update visitor data for new day
      await visitor.updateDataObject(
        {
          lastPlayedDate: currentDate,
          dayStartTimestamp: new Date().toISOString(),
          idealMeal,
          completedToday: false,
          completionTimestamp: null,
          pickupsToday: 0,
          dropsToday: 0,
          itemsMatchedToday: 0,
          nutritionScore: null,
          superCombosFound: [],
          dailyBuff: null,
        },
        {
          analytics: [
            { analyticName: "starts", profileId, urlSlug, uniqueKey: profileId },
            { analyticName: "joins", profileId, urlSlug, uniqueKey: profileId },
          ],
        },
      );

      // Spawn items into world for this player (skip if already spawned today)
      const spawnedByPlayer = worldData.spawnedItemsByPlayer || {};
      if (!spawnedByPlayer[profileId]?.length) {
        const itemsToSpawn = newBagItems.filter((item) => !item.matchesIdealMeal).slice(0, 3);
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
              rarity: item.rarity,
              offsetRange: worldData.spawnRadiusMax || 2000,
              mystery: Math.random() < 0.15,
            });
            spawnedIds.push(item.itemId);
          } catch (err) {
            console.warn("Failed to spawn item:", item.itemId, err);
          }
        }

        // Track spawned items
        worldData.spawnedItemsByPlayer = { ...spawnedByPlayer, [profileId]: spawnedIds };
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
    }

    // Track joins for non-new-day loads (new day loads are tracked above)
    if (!newDay) {
      await visitor.updateDataObject(
        {},
        {
          analytics: [{ analyticName: "joins", profileId, urlSlug, uniqueKey: profileId }],
        },
      );
    }

    // Read current bag from inventory (re-fetch after mutations on new day)
    const brownBag = newDay ? await getVisitorBag(visitor, idealMeal, credentials) : currentBag;

    // Calculate display streak
    let displayStreak = visitorData.currentStreak;
    if (visitorData.lastCompletionDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
      if (visitorData.lastCompletionDate < yesterdayStr) {
        displayStreak = 0; // Show 0 but don't write to user data
      }
    } else {
      displayStreak = 0;
    }

    return res.json({
      success: true,
      isNewDay: newDay,
      brownBag,
      idealMeal,
      completedToday,
      nutritionScore: visitorData.nutritionScore,
      superCombosFound: visitorData.superCombosFound || [],
      xp,
      level,
      currentStreak: displayStreak,
      longestStreak: visitorData.longestStreak,
      hotStreakActive: visitorData.hotStreakActive || false,
      isAdmin,
      hasRewardToken,
      dailyBuff: (visitorData as any).dailyBuff || null,
      spawnRadiusMin: worldData.spawnRadiusMin,
      spawnRadiusMax: worldData.spawnRadiusMax,
      proximityRadius: worldData.proximityRadius,
      badges,
      visitorInventory: getVisitorBadges((visitor as any).inventoryItems || []),
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
