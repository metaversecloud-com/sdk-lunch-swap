import { DroppedAssetInterface } from "@rtsdk/topia";
import { BagItem, IdealMealItem } from "@shared/types/FoodItem";
import { LeaderboardEntry } from "@shared/types/DataObjects";
import { NearbyItem } from "@shared/types/NearbyItem";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
export const SET_BROWN_BAG = "SET_BROWN_BAG";
export const SET_IDEAL_MEAL = "SET_IDEAL_MEAL";
export const SET_NEARBY_ITEMS = "SET_NEARBY_ITEMS";
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
  // Existing
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  droppedAsset?: DroppedAssetInterface;
  // Game state (from server)
  isNewDay?: boolean;
  brownBag?: BagItem[];
  idealMeal?: IdealMealItem[];
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
  // Nearby items (from polling)
  nearbyItems?: NearbyItem[];
  // Engagement
  hasRewardToken?: boolean;
  dailyBuff?: string | null;
  hotStreakActive?: boolean;
  idealPickupStreak?: number;
  // Badges
  badges?: { [name: string]: BadgeType };
  visitorInventory?: VisitorInventoryType;
  // Leaderboard
  leaderboard?: LeaderboardEntry[];
  // Admin settings (world data)
  spawnRadiusMin?: number;
  spawnRadiusMax?: number;
  proximityRadius?: number;
  // Admin food items in world
  foodItemsInWorld?: FoodItemInWorld[];
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
  matchesIdealMeal: boolean;
  xpEarned: number;
  xp: number;
  level: number;
  hotStreakActive: boolean;
  idealPickupStreak: number;
  funFact: string | null;
  isMystery: boolean;
  visitorInventory?: VisitorInventoryType;
};
