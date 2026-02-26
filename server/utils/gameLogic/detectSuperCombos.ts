import { SuperCombo } from "@shared/types/NutritionScore.js";
import { SUPER_COMBOS } from "@shared/data/superCombos.js";

export function detectSuperCombos(itemIds: string[]): SuperCombo[] {
  const idSet = new Set(itemIds);
  return SUPER_COMBOS.filter((combo) => combo.items.every((id) => idSet.has(id))).map((combo) => ({
    name: combo.name,
    items: combo.items,
    bonusXp: combo.bonusXp,
    description: combo.description,
  }));
}
