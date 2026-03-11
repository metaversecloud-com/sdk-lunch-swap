import { FoodGroup, Rarity } from "./FoodItem.js";

export interface NearbyItem {
  droppedAssetId: string;
  itemId: string;
  name: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
  distance: number;
  matchesIdealMeal: boolean;
  isMystery?: boolean;
  isComboMatch?: boolean;
  comboMatchPartner?: string;
}
