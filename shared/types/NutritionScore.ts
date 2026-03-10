export interface NutritionScoreResult {
  score: number;
  breakdown: {
    proteinScore: number;
    fiberScore: number;
    vitaminDiversity: number;
    balanceScore: number;
  };
  superCombos: SuperCombo[];
  totalXpEarned: number;
  bonusXp: number;
}

export interface SuperCombo {
  name: string;
  items: string[];
  bonusXp: number;
  description: string;
}
