import { Request, Response } from "express";
import { errorHandler, getCredentials, getKeyAsset, World, dropFoodItem, getVisitor, getVisitorBag, grantFoodToVisitor, removeFoodFromVisitor } from "../utils/index.js";
import { generateIdealMeal, generateBrownBag, getCurrentDateMT, isNewDay } from "../utils/gameLogic/index.js";
import { VISITOR_DATA_DEFAULTS, WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId } = credentials;

    // Fetch key asset, visitor (with data + inventory), and world in parallel
    const [droppedAsset, { visitor, visitorData, brownBag: currentBag }, world] = await Promise.all([
      getKeyAsset(credentials),
      getVisitor(credentials, true),
      World.create(credentials.urlSlug, { credentials }),
    ]);
    const isAdmin = (visitor as any).isAdmin || false;

    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

    // Check for new day
    const currentDate = getCurrentDateMT();
    const newDay = isNewDay(visitorData.lastPlayedDate, currentDate);

    let idealMeal = visitorData.idealMeal;
    let completedToday = visitorData.completedToday;

    if (newDay) {
      // B4: Auto-drop yesterday's bag items into world at key asset position
      if (currentBag.length > 0) {
        const center = {
          x: droppedAsset.position?.x ?? 0,
          y: droppedAsset.position?.y ?? 0,
        };
        for (const bagItem of currentBag) {
          const foodDef = FOOD_ITEMS_BY_ID.get(bagItem.itemId);
          if (foodDef) {
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
      }

      // Generate new ideal meal and brown bag
      idealMeal = generateIdealMeal();
      const newBagItems = generateBrownBag(idealMeal);
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
      const newVisitorData = {
        ...VISITOR_DATA_DEFAULTS,
        lastPlayedDate: currentDate,
        idealMeal,
      };
      await visitor.setDataObject(newVisitorData);

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
        worldData.currentDate = currentDate;
      }

      // Update world data object
      worldData.totalStartsToday = (worldData.totalStartsToday || 0) + 1;
      await world.updateDataObject(worldData);
    }

    // Read current bag from inventory (re-fetch after mutations on new day)
    const brownBag = newDay ? await getVisitorBag(visitor, idealMeal) : currentBag;

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

    // Build response
    return res.json({
      success: true,
      isNewDay: newDay,
      brownBag,
      idealMeal,
      completedToday,
      nutritionScore: visitorData.nutritionScore,
      superCombosFound: visitorData.superCombosFound || [],
      xp: visitorData.totalXp,
      level: visitorData.level,
      currentStreak: displayStreak,
      isAdmin,
      hasRewardToken: false, // TODO: check inventory when ecosystem is configured
      dailyBuff: (visitorData as any).dailyBuff || null,
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
