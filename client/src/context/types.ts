import { BagItem, TargetMealItem } from "@shared/types/FoodItem";
import { LeaderboardEntry } from "@shared/types/DataObjects";
export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
export const SET_BROWN_BAG = "SET_BROWN_BAG";
export const SET_TARGET_MEAL = "SET_TARGET_MEAL";
export const SET_COMPLETED = "SET_COMPLETED";
export const SET_DAILY_BUFF = "SET_DAILY_BUFF";
export const SET_FOOD_ITEMS_IN_WORLD = "SET_FOOD_ITEMS_IN_WORLD";

export type BadgeType = {
  id: string;
  icon: string;
  description?: string;
  name: string;
};

export type VisitorInventoryType = {
  badges: { [name: string]: BadgeType };
};

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export interface InitialState {
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  isFirstPlay?: boolean;
  brownBag?: BagItem[];
  targetMeal?: TargetMealItem[];
  completedToday?: boolean;
  nutritionScore?: number | null;
  nutritionBreakdown?: {
    proteinScore: number;
    fiberScore: number;
    vitaminDiversity: number;
    balanceScore: number;
  };
  superCombosFound?: string[];
  xp?: number;
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
  dailyBuff?: string | null;
  hotStreakActive?: boolean;
  pickupStreak?: number;
  badges?: { [name: string]: BadgeType };
  visitorInventory?: VisitorInventoryType;
  leaderboard?: LeaderboardEntry[];
  dropRadiusMin?: number;
  dropRadiusMax?: number;
  foodItemsInWorld?: FoodItemInWorld[];
  isNewStreakRecord?: boolean;
}

export type FoodItemInWorld = {
  itemId: string;
  name: string;
  foodGroup: string;
  rarity: string;
  countInWorld: number;
};

export type ActionType = {
  type: string;
  payload: Partial<InitialState>;
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };

export type PostPickupResponseType = {
  brownBag: BagItem[];
  pickedUpItem: BagItem | null;
  matchesTargetMeal: boolean;
  xpEarned: number;
  xp: number;
  level: number;
  hotStreakActive: boolean;
  pickupStreak: number;
  funFact: string | null;
  isMystery: boolean;
  visitorInventory?: VisitorInventoryType;
};
