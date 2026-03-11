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

export const LEVEL_THRESHOLDS: number[] = [
  0,
  100,
  300,
  600,
  1000,
  1500,
  2100,
  2800,
  3600,
  4500, // 10
  5500,
  6600,
  7800,
  9100,
  10500,
  12000,
  13600,
  15300,
  17100,
  19000, // 20
  21000,
  23100,
  25300,
  27600,
  30000,
  32500,
  35100,
  37800,
  40600,
  43500, // 30
  46500,
  49600,
  52800,
  56100,
  59500,
  63000,
  66600,
  70300,
  74100,
  78000, // 40
  82000,
  86100,
  90300,
  94600,
  99000,
  103500,
  108100,
  112800,
  117600,
  122500, // 50
  127500,
  132600,
  137800,
  143100,
  148500,
  154000,
  159600,
  165300,
  171100,
  177000, // 60
  183000,
  189100,
  195300,
  201600,
  208000,
  214500,
  221100,
  227800,
  234600,
  241500, // 70
  248500,
  255600,
  262800,
  270100,
  277500, // 75
];

export function getLevelForXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

const LEVEL_TITLES: [number, string][] = [
  [75, "Cafeteria Boss"],
  [60, "Golden Fork"],
  [45, "Master Chef"],
  [36, "Meal MVP"],
  [28, "Lunch Hero"],
  [20, "Tray Superstar"],
  [14, "Bag Pro"],
  [8, "Lunch Legend"],
  [4, "Snack Stacker"],
  [0, "First-Time Luncher"],
];

export function getLevelTitle(level: number): string {
  for (const [minLevel, title] of LEVEL_TITLES) {
    if (level >= minLevel) return title;
  }
  return LEVEL_TITLES[LEVEL_TITLES.length - 1][1];
}
