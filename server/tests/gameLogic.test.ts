import { generateIdealMeal } from "../utils/gameLogic/generateMeal.js";
import { generateBrownBag } from "../utils/gameLogic/generateBrownBag.js";
import { calculateNutritionScore } from "../utils/gameLogic/calculateNutritionScore.js";
import { detectSuperCombos } from "../utils/gameLogic/detectSuperCombos.js";
import { getCurrentDateMT, isNewDay } from "../utils/gameLogic/dateUtils.js";

// Mock inventory cache to return test food items
jest.mock("../utils/inventoryCache.js", () => ({
  getCachedInventoryItems: jest.fn().mockResolvedValue([
    // DRINKS
    { type: "ITEM", name: "Water", metadata: { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] }, funFact: "Water fact", superComboPairs: [] } },
    { type: "ITEM", name: "Milk", metadata: { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common", nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] }, funFact: "Milk fact", superComboPairs: ["granola-bar"] } },
    { type: "ITEM", name: "Orange Juice", metadata: { itemId: "orange-juice", name: "Orange Juice", foodGroup: "drink", rarity: "common", nutrition: { calories: 110, protein: 2, carbs: 26, fiber: 0, vitamins: ["C", "A"] }, funFact: "OJ fact", superComboPairs: [] } },
    // FRUITS
    { type: "ITEM", name: "Apple", metadata: { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] }, funFact: "Apple fact", superComboPairs: ["cheese-stick"] } },
    { type: "ITEM", name: "Banana", metadata: { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] }, funFact: "Banana fact", superComboPairs: ["yogurt"] } },
    { type: "ITEM", name: "Grapes", metadata: { itemId: "grapes", name: "Grapes", foodGroup: "fruit", rarity: "common", nutrition: { calories: 62, protein: 1, carbs: 16, fiber: 1, vitamins: ["C", "K"] }, funFact: "Grapes fact", superComboPairs: [] } },
    { type: "ITEM", name: "Strawberry", metadata: { itemId: "strawberry", name: "Strawberry", foodGroup: "fruit", rarity: "common", nutrition: { calories: 50, protein: 1, carbs: 12, fiber: 3, vitamins: ["C", "B9"] }, funFact: "Strawberry fact", superComboPairs: [] } },
    // VEGGIES
    { type: "ITEM", name: "Carrots", metadata: { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", nutrition: { calories: 35, protein: 1, carbs: 8, fiber: 3, vitamins: ["A", "K", "B6"] }, funFact: "Carrots fact", superComboPairs: ["hummus"] } },
    { type: "ITEM", name: "Broccoli", metadata: { itemId: "broccoli", name: "Broccoli", foodGroup: "veggie", rarity: "common", nutrition: { calories: 55, protein: 4, carbs: 11, fiber: 5, vitamins: ["C", "K", "A"] }, funFact: "Broccoli fact", superComboPairs: [] } },
    { type: "ITEM", name: "Corn", metadata: { itemId: "corn", name: "Corn", foodGroup: "veggie", rarity: "common", nutrition: { calories: 90, protein: 3, carbs: 19, fiber: 2, vitamins: ["B1", "B5", "C"] }, funFact: "Corn fact", superComboPairs: [] } },
    // MAINS
    { type: "ITEM", name: "Sandwich", metadata: { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] }, funFact: "Sandwich fact", superComboPairs: [] } },
    { type: "ITEM", name: "Pizza Slice", metadata: { itemId: "pizza-slice", name: "Pizza Slice", foodGroup: "main", rarity: "common", nutrition: { calories: 285, protein: 12, carbs: 36, fiber: 2, vitamins: ["A", "B12", "Iron"] }, funFact: "Pizza fact", superComboPairs: [] } },
    { type: "ITEM", name: "Pasta", metadata: { itemId: "pasta", name: "Pasta", foodGroup: "main", rarity: "common", nutrition: { calories: 220, protein: 8, carbs: 43, fiber: 3, vitamins: ["B1", "B9", "Iron"] }, funFact: "Pasta fact", superComboPairs: [] } },
    // SNACKS
    { type: "ITEM", name: "Granola Bar", metadata: { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] }, funFact: "Granola fact", superComboPairs: ["milk"] } },
    { type: "ITEM", name: "Popcorn", metadata: { itemId: "popcorn", name: "Popcorn", foodGroup: "snack", rarity: "common", nutrition: { calories: 93, protein: 3, carbs: 19, fiber: 4, vitamins: ["B1", "B3", "B6"] }, funFact: "Popcorn fact", superComboPairs: [] } },
    { type: "ITEM", name: "Yogurt", metadata: { itemId: "yogurt", name: "Yogurt", foodGroup: "snack", rarity: "common", nutrition: { calories: 150, protein: 12, carbs: 17, fiber: 0, vitamins: ["B12", "B2", "D"] }, funFact: "Yogurt fact", superComboPairs: ["banana"] } },
  ]),
  clearInventoryCache: jest.fn(),
}));

const fakeCredentials = {
  assetId: "test-asset",
  interactivePublicKey: "test-key",
  interactiveNonce: "test-nonce",
  visitorId: 1,
  urlSlug: "test-world",
  profileId: "test-profile",
  displayName: "Test User",
  identityId: "test-identity",
  sceneDropId: "test-scene-drop",
  uniqueName: "test-unique",
  username: "test-user",
} as const;

describe("generateIdealMeal", () => {
  test("returns 6 items: 1 drink, 1 main, 4 from fruit/veggie/snack", async () => {
    const meal = await generateIdealMeal(fakeCredentials);
    expect(meal).toHaveLength(6);
    expect(meal.filter((i) => i.foodGroup === "drink")).toHaveLength(1);
    expect(meal.filter((i) => i.foodGroup === "main")).toHaveLength(1);
    const others = meal.filter((i) => ["fruit", "veggie", "snack"].includes(i.foodGroup));
    expect(others).toHaveLength(4);
  });

  test("items do not have collected property", async () => {
    const meal = await generateIdealMeal(fakeCredentials);
    expect(meal.every((i) => !("collected" in i))).toBe(true);
  });

  test("returns different meals on multiple calls (randomized)", async () => {
    const meals = await Promise.all(Array.from({ length: 10 }, () => generateIdealMeal(fakeCredentials)));
    const ids = meals.map((m) =>
      m
        .map((i) => i.itemId)
        .sort()
        .join(","),
    );
    const unique = new Set(ids);
    expect(unique.size).toBeGreaterThan(1);
  });

  test("other 4 slots include at least 2 distinct food groups (D6)", async () => {
    for (let i = 0; i < 20; i++) {
      const meal = await generateIdealMeal(fakeCredentials);
      const others = meal.filter((i) => ["fruit", "veggie", "snack"].includes(i.foodGroup));
      const distinctGroups = new Set(others.map((i) => i.foodGroup));
      expect(distinctGroups.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("generateBrownBag", () => {
  test("returns 8 items with exactly 1 matching the ideal meal", async () => {
    const idealMeal = await generateIdealMeal(fakeCredentials);
    const bag = await generateBrownBag(fakeCredentials, idealMeal);
    expect(bag).toHaveLength(8);
    const matches = bag.filter((i) => i.matchesIdealMeal);
    expect(matches).toHaveLength(1);
  });

  test("the matching item is in the ideal meal", async () => {
    const idealMeal = await generateIdealMeal(fakeCredentials);
    const bag = await generateBrownBag(fakeCredentials, idealMeal);
    const match = bag.find((i) => i.matchesIdealMeal)!;
    expect(idealMeal.some((i) => i.itemId === match.itemId)).toBe(true);
  });
});

describe("calculateNutritionScore", () => {
  test("returns score 0-100 with 4 breakdown categories 0-25 each", async () => {
    const idealMeal = await generateIdealMeal(fakeCredentials);
    const result = await calculateNutritionScore(fakeCredentials, idealMeal.map((i) => i.itemId));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown.proteinScore).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.proteinScore).toBeLessThanOrEqual(25);
    expect(result.breakdown.fiberScore).toBeLessThanOrEqual(25);
    expect(result.breakdown.vitaminDiversity).toBeLessThanOrEqual(25);
    expect(result.breakdown.balanceScore).toBeLessThanOrEqual(25);
  });
});

describe("detectSuperCombos", () => {
  test("returns empty array when no combos match", () => {
    const combos = detectSuperCombos(["water", "apple"]);
    expect(combos).toEqual([]);
  });
});

describe("dateUtils", () => {
  test("getCurrentDateMT returns YYYY-MM-DD format", () => {
    const date = getCurrentDateMT();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("isNewDay returns true when dates differ", () => {
    expect(isNewDay("2026-01-01", "2026-01-02")).toBe(true);
  });

  test("isNewDay returns false when dates match", () => {
    const today = getCurrentDateMT();
    expect(isNewDay(today, today)).toBe(false);
  });
});
