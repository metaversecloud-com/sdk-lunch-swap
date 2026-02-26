import { BagItem, FoodGroup, IdealMealItem, Rarity } from "./FoodItem.js";

// --- Visitor Data Object ---
export interface VisitorGameData {
  lastPlayedDate: string;
  brownBag: BagItem[];
  idealMeal: IdealMealItem[];
  completedToday: boolean;
  completionTimestamp: string | null;
  pickupsToday: number;
  dropsToday: number;
  itemsMatchedToday: number;
  nutritionScore: number | null;
  superCombosFound: string[];
  idealPickupStreak: number;
  hotStreakActive: boolean;
  dailyBuff: string | null;
  totalXp: number;
  level: number;
  totalMealsCompleted: number;
  totalPickups: number;
  totalDrops: number;
  totalSuperCombos: number;
  bestNutritionScore: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string;
  uniqueItemsCollected: string[];
}

export const VISITOR_DATA_DEFAULTS: VisitorGameData = {
  lastPlayedDate: "",
  brownBag: [],
  idealMeal: [],
  completedToday: false,
  completionTimestamp: null,
  pickupsToday: 0,
  dropsToday: 0,
  itemsMatchedToday: 0,
  nutritionScore: null,
  superCombosFound: [],
  idealPickupStreak: 0,
  hotStreakActive: false,
  dailyBuff: null,
  totalXp: 0,
  level: 1,
  totalMealsCompleted: 0,
  totalPickups: 0,
  totalDrops: 0,
  totalSuperCombos: 0,
  bestNutritionScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletionDate: "",
  uniqueItemsCollected: [],
};

// --- World Data Object ---
export interface WorldGameData {
  gameVersion: number;
  spawnRadiusMin: number;
  spawnRadiusMax: number;
  proximityRadius: number;
  currentDate: string;
  totalStartsToday: number;
  totalCompletionsToday: number;
  spawnedItemsByPlayer: Record<string, string[]>;
  totalPickups: number;
  totalDrops: number;
  totalMealSubmissions: number;
}

export const WORLD_DATA_DEFAULTS: WorldGameData = {
  gameVersion: 1,
  spawnRadiusMin: 200,
  spawnRadiusMax: 2000,
  proximityRadius: 150,
  currentDate: "",
  totalStartsToday: 0,
  totalCompletionsToday: 0,
  spawnedItemsByPlayer: {},
  totalPickups: 0,
  totalDrops: 0,
  totalMealSubmissions: 0,
};

// --- Key Asset Data Object ---
export interface KeyAssetData {
  appVersion: number;
  appName: string;
  initialized: boolean;
}

export const KEY_ASSET_DATA_DEFAULTS: KeyAssetData = {
  appVersion: 1,
  appName: "lunch-swap",
  initialized: false,
};

// --- Food Item Data Object (on dropped assets) ---
export interface FoodItemAssetData {
  itemId: string;
  itemName: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
  isMystery: boolean;
  firstDroppedBy: string;
  firstDroppedByName: string;
  firstDroppedDateTime: string;
  lastDroppedBy: string;
  lastDroppedByName: string;
  lastDroppedDateTime: string;
  spawnedBySystem: boolean;
  pickupCount: number;
}

export const FOOD_ITEM_ASSET_DATA_DEFAULTS: FoodItemAssetData = {
  itemId: "",
  itemName: "",
  foodGroup: "snack",
  rarity: "common",
  isMystery: false,
  firstDroppedBy: "",
  firstDroppedByName: "",
  firstDroppedDateTime: "",
  lastDroppedBy: "",
  lastDroppedByName: "",
  lastDroppedDateTime: "",
  spawnedBySystem: false,
  pickupCount: 0,
};
