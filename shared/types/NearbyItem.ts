import { FoodGroup, Rarity } from "./FoodItem.js";

export interface NearbyItem {
  droppedAssetId: string;
  itemId: string;
  name: string;
  foodGroup: FoodGroup;
  rarity: Rarity;
  distance: number;
  matchesTargetMeal: boolean;
  isMystery?: boolean;
  isComboMatch?: boolean;
  comboMatchPartner?: string;
}
