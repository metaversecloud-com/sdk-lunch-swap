import { BagItem, IdealMealItem } from "./FoodItem.js";

export interface GameState {
  isNewDay: boolean;
  brownBag: BagItem[];
  idealMeal: IdealMealItem[];
  completedToday: boolean;
  nutritionScore: number | null;
  superCombosFound: string[];
  xp: number;
  level: number;
  currentStreak: number;
  isAdmin: boolean;
}
