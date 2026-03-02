export type FoodGroup = "drink" | "fruit" | "veggie" | "main" | "snack";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  vitamins: string[];
}

export interface FoodItemDefinition {
  itemId: string;
  name: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
  nutrition: NutritionInfo;
  funFact: string;
  superComboPairs: string[];
  sortOrder: number;
}

export interface BagItem {
  itemId: string;
  name: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
  matchesIdealMeal: boolean;
  nutrition?: NutritionInfo;
  funFact?: string;
}

export interface IdealMealItem {
  itemId: string;
  name: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
}

export const FOOD_GROUP_COLORS: Record<FoodGroup, string> = {
  drink: "#4A90D9",
  fruit: "#E8564A",
  veggie: "#5CB85C",
  main: "#F0AD4E",
  snack: "#9B59B6",
};

export const RARITY_CONFIG: Record<
  Rarity,
  {
    label: string;
    color: string;
    spawnMultiplier: number;
    xpMultiplier: number;
  }
> = {
  common: { label: "Common", color: "#8E8E93", spawnMultiplier: 3, xpMultiplier: 1.0 },
  rare: { label: "Rare", color: "#4A90D9", spawnMultiplier: 2, xpMultiplier: 1.5 },
  epic: { label: "Epic", color: "#9B59B6", spawnMultiplier: 1, xpMultiplier: 2.5 },
  legendary: { label: "Legendary", color: "#F5A623", spawnMultiplier: 0, xpMultiplier: 5.0 },
};
