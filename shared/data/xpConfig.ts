export const BAG_CAPACITY = 8;
export const BAG_CAPACITY_POST_COMPLETION = 3;
export const IDEAL_MEAL_SIZE = 5;

export const XP_ACTIONS = {
  PICKUP: 10,
  DROP: 5,
  COLLECT_IDEAL_ITEM: 25,
  SUBMIT_MEAL: 100,
  BALANCED_MEAL_BONUS: 50,
  SUPER_COMBO: 30,
  STREAK_PER_DAY: 10,
  STREAK_CAP: 100,
} as const;

export const LEVEL_THRESHOLDS: number[] = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

export function getLevelForXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}
