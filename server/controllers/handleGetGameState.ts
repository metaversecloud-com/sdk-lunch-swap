import { Request, Response } from "express";
import { errorHandler, getCredentials, getKeyAsset, Visitor, World, dropFoodItem } from "../utils/index.js";
import { generateIdealMeal, generateBrownBag, getCurrentDateMT, isNewDay } from "../utils/gameLogic/index.js";
import { VISITOR_DATA_DEFAULTS, WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId } = credentials;

    // Fetch key asset, visitor, world, user
    const [droppedAsset, visitor, world] = await Promise.all([
      getKeyAsset(credentials),
      Visitor.get(visitorId, urlSlug, { credentials }),
      World.create(urlSlug, { credentials }),
    ]);
    const isAdmin = (visitor as any).isAdmin || false;

    // Fetch data objects (initialize with defaults if empty)
    await visitor.fetchDataObject();
    const visitorData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

    // Check for new day
    const currentDate = getCurrentDateMT();
    const newDay = isNewDay(visitorData.lastPlayedDate, currentDate);

    let brownBag = visitorData.brownBag;
    let idealMeal = visitorData.idealMeal;
    let completedToday = visitorData.completedToday;

    if (newDay) {
      // B4: Auto-drop yesterday's bag items into world at key asset position
      if (visitorData.brownBag.length > 0) {
        const center = {
          x: droppedAsset.position?.x ?? 0,
          y: droppedAsset.position?.y ?? 0,
        };
        for (const bagItem of visitorData.brownBag) {
          const foodDef = FOOD_ITEMS_BY_ID.get(bagItem.itemId);
          if (foodDef) {
            try {
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
      brownBag = generateBrownBag(idealMeal);
      completedToday = false;

      // Update visitor data for new day
      const newVisitorData = {
        ...VISITOR_DATA_DEFAULTS,
        lastPlayedDate: currentDate,
        brownBag,
        idealMeal,
      };
      await visitor.setDataObject(newVisitorData);

      // Spawn items into world for this player (skip if already spawned today)
      const spawnedByPlayer = worldData.spawnedItemsByPlayer || {};
      if (!spawnedByPlayer[profileId]?.length) {
        // Spawn logic: create food items in world near key asset
        const itemsToSpawn = brownBag.filter((item) => !item.matchesIdealMeal).slice(0, 3);
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
