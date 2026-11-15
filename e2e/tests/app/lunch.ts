// Lunch Swap test data: the mock's food catalog (mock-topia/catalog.json), inventory seeds, food assets
// and the visitor data of a game in progress.
import catalog from "../../mock-topia/catalog.json" with { type: "json" };
import type { OwnedItem, SeedOptions, TopiaWorld } from "../../fixtures";

type CatalogItem = (typeof catalog)[number];
export type FoodId =
  | "milk"
  | "apple-juice"
  | "coconut-water"
  | "burrito"
  | "pasta"
  | "sushi-roll"
  | "apple"
  | "banana"
  | "mango"
  | "carrots"
  | "broccoli"
  | "corn"
  | "granola-bar"
  | "cheese-stick"
  | "popcorn"
  | "yogurt";

export const FOOD_IDS = catalog.filter((i) => i.metadata?.itemId).map((i) => i.metadata.itemId as FoodId);
export const BADGE_NAMES = catalog.filter((i) => i.type === "BADGE").map((i) => i.name);

export const food = (itemId: FoodId) => {
  const item = catalog.find((i) => i.metadata?.itemId === itemId) as CatalogItem;
  const m = item.metadata as { itemId: string; name: string; foodGroup: string; rarity: string; funFact: string };
  return { ...m, item };
};

const XP = catalog.find((i) => i.name === "Experience Points")!;

/** The visitor's inventory (seed's `inventory`): bag items, XP and badges. */
export const inventory = ({ bag = [], xp = 0, badges = [] }: { bag?: FoodId[]; xp?: number; badges?: string[] }): OwnedItem[] => [
  ...bag.map((id) => ({ item: food(id).item.id })),
  ...(xp ? [{ item: XP.id, quantity: xp }] : []),
  ...badges.map((name) => ({ item: name })),
];

/** Today in Mountain Time, the app's game day (getCurrentDateMT). */
export const todayMT = (offsetDays = 0) => {
  const date = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** The app's week key (getCurrentWeekMT / getPreviousWeekMT), weeksAgo weeks back. */
export const weekMT = (weeksAgo = 0) => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const then = new Date(now.getTime() - weeksAgo * 7 * 86400000);
  const jan1 = new Date(then.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((then.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + (jan1.getDay() || 7) - 1) / 7);
  return `${then.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

export const meal = (ids: FoodId[]) =>
  ids.map((id) => {
    const { itemId, name, foodGroup, rarity, item } = food(id);
    return { itemId, name, foodGroup, rarity, image: item.image_path };
  });

/** A meal of six commons: drink, main, fruit, veggie, snack + a bonus snack. */
export const MEAL: FoodId[] = ["milk", "burrito", "apple", "carrots", "granola-bar", "popcorn"];

/** Visitor data of a player who already started today's game. */
export const playing = (fields: Record<string, unknown> = {}) => ({
  lastPlayedDate: todayMT(),
  targetMeal: meal(MEAL),
  completedToday: false,
  pickupsToday: 0,
  dropsToday: 0,
  pickupStreak: 0,
  hotStreakActive: false,
  dailyBuff: null,
  totalMealsCompleted: 0,
  totalPickups: 0,
  totalDrops: 0,
  currentStreak: 0,
  longestStreak: 0,
  bestNutritionScore: 0,
  lastCompletionWeek: "",
  ...fields,
});

export const KEY_ASSET = {
  uniqueName: "LunchSwap_keyAsset",
  assetName: "Food Truck",
  position: { x: 1000, y: 800 },
};
export const KEY_ASSET_DATA = { appName: "lunch-swap", appVersion: 1, initialized: true };

/** A food item dropped in the world, as dropFoodItem names it. */
export const foodAsset = (itemId: FoodId, { mystery = false, x = 300, y = 300 } = {}) => ({
  uniqueName: `LunchSwap_foodItem_${itemId}_${mystery ? "1" : "0"}`,
  assetName: "webImageAsset",
  position: { x, y },
  sceneDropId: "scene-1",
});

/** World data that keeps the background "one of everything" replenish from running during the test. */
export const QUIET_WORLD = () => ({ lastReplenishedDate: new Date().toISOString() });

/**
 * Seeds a player mid-game: key asset (food truck), a started game, bag, XP. `assets` are extra dropped
 * food items keyed by asset id.
 */
export const seedGame = (
  world: TopiaWorld,
  {
    bag = [],
    xp = 0,
    badges = [],
    visitorData = {},
    worldData = {},
    assets = {},
    ...rest
  }: {
    bag?: FoodId[];
    xp?: number;
    badges?: string[];
    visitorData?: Record<string, unknown>;
    worldData?: Record<string, unknown>;
    assets?: Record<string, Record<string, unknown>>;
  } & SeedOptions = {},
) =>
  world.seed({
    asset: KEY_ASSET,
    assetData: KEY_ASSET_DATA,
    worldData: { ...QUIET_WORLD(), ...worldData },
    visitorData: playing(visitorData),
    extraAssets: Object.fromEntries(Object.entries(assets).map(([id, a]) => [id, { id, ...a }])),
    inventory: inventory({ bag, xp, badges }),
    ...rest,
    visitor: { moveTo: { x: 640, y: 480 }, ...rest.visitor },
  });

/** The bag (food itemIds with quantity) and XP in the visitor's inventory. */
export const visitorInventory = async (world: TopiaWorld, visitorId = 42) => {
  // Like the platform's reads, entries at quantity 0 or below don't count; the food id is catalog metadata.
  const items: any[] = ((await world.state()).visitors[visitorId].inventory ?? []).filter((i: any) => i.quantity > 0);
  const bag = items.filter((i) => i.item.metadata?.itemId).map((i) => i.item.metadata.itemId as string).sort();
  const xp = items.find((i) => i.name === "Experience Points")?.quantity ?? 0;
  const badges = items.filter((i) => i.type === "BADGE").map((i) => i.name as string);
  const quantities = Object.fromEntries(items.filter((i) => i.item.metadata?.itemId).map((i) => [i.item.metadata.itemId, i.quantity]));
  return { bag, xp, badges, quantities };
};

/** Food items dropped in the world: { assetId: itemId }. */
export const foodInWorld = async (world: TopiaWorld) => {
  const { assets } = await world.state();
  return Object.values(assets)
    .filter((a: any) => String(a.uniqueName ?? "").startsWith("LunchSwap_foodItem_"))
    .map((a: any) => ({ id: a.id as string, itemId: String(a.uniqueName).split("_")[2], asset: a }));
};

/**
 * Waits until the app's per-minute lock ids (lockId ends in the time rounded to the nearest minute, so they
 * change at :30 of every minute) won't change in the next few seconds: two calls that must share a lock id
 * would otherwise straddle the rollover and get different ones.
 */
export const awayFromLockRollover = async (marginMs = 5000) => {
  const untilRollover = (90_000 - (Date.now() % 60_000)) % 60_000;
  if (untilRollover < marginMs) await new Promise((resolve) => setTimeout(resolve, untilRollover + 100));
};
