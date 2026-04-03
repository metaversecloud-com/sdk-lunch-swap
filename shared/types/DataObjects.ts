import { FoodGroup, TargetMealItem, Rarity } from "./FoodItem.js";

// --- Visitor Data Object ---
export interface VisitorGameData {
  lastPlayedDate: string;
  targetMeal: TargetMealItem[];
  completedToday: boolean;
  completionTimestamp: string | null;
  pickupsToday: number;
  dropsToday: number;
  itemsMatchedToday: number;
  nutritionScore: number | null;
  superCombosFound: string[];
  pickupStreak: number;
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
  lastCompletionWeek: string;
  totalMysteryItemsRevealed: number;
  totalItemsCollectedByRarity: {
    common: number;
    rare: number;
    epic: number;
  };
}

export const VISITOR_DATA_DEFAULTS: VisitorGameData = {
  lastPlayedDate: "",
  targetMeal: [],
  completedToday: false,
  completionTimestamp: null,
  pickupsToday: 0,
  dropsToday: 0,
  itemsMatchedToday: 0,
  nutritionScore: null,
  superCombosFound: [],
  pickupStreak: 0,
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
  lastCompletionWeek: "",
  totalMysteryItemsRevealed: 0,
  totalItemsCollectedByRarity: {
    common: 0,
    rare: 0,
    epic: 0,
  },
};

// --- World Data Object ---
export interface WorldGameData {
  gameVersion: number;
  dropRadiusMin: number;
  dropRadiusMax: number;
  currentDate: string;
  totalStartsToday: number;
  totalCompletionsToday: number;
  totalPickups: number;
  totalDrops: number;
  totalMealSubmissions: number;
}

export const WORLD_DATA_DEFAULTS: WorldGameData = {
  gameVersion: 1,
  dropRadiusMin: 200,
  dropRadiusMax: 2000,
  currentDate: "",
  totalStartsToday: 0,
  totalCompletionsToday: 0,
  totalPickups: 0,
  totalDrops: 0,
  totalMealSubmissions: 0,
};

// --- Key Asset Data Object ---
export interface KeyAssetData {
  appVersion: number;
  appName: string;
  initialized: boolean;
  leaderboard?: Record<string, string>;
}

export type LeaderboardEntry = {
  profileId: string;
  name: string;
  totalMealsCompleted: number;
  longestStreak: number;
};

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
  lastDroppedDateTime: string;
  droppedBySystem: boolean;
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
  lastDroppedDateTime: "",
  droppedBySystem: false,
  pickupCount: 0,
};
