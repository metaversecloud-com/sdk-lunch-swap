import { generateIdealMeal } from "../utils/gameLogic/generateMeal.js";
import { generateBrownBag } from "../utils/gameLogic/generateBrownBag.js";
import { calculateNutritionScore } from "../utils/gameLogic/calculateNutritionScore.js";
import { detectSuperCombos } from "../utils/gameLogic/detectSuperCombos.js";
import { getCurrentDateMT, isNewDay } from "../utils/gameLogic/dateUtils.js";

describe("generateIdealMeal", () => {
  test("returns 5 items: 1 drink, 1 main, 3 from fruit/veggie/snack", () => {
    const meal = generateIdealMeal();
    expect(meal).toHaveLength(5);
    expect(meal.filter(i => i.foodGroup === "drink")).toHaveLength(1);
    expect(meal.filter(i => i.foodGroup === "main")).toHaveLength(1);
    const others = meal.filter(i => ["fruit", "veggie", "snack"].includes(i.foodGroup));
    expect(others).toHaveLength(3);
  });

  test("all items have collected: false", () => {
    const meal = generateIdealMeal();
    expect(meal.every(i => i.collected === false)).toBe(true);
  });

  test("returns different meals on multiple calls (randomized)", () => {
    const meals = Array.from({ length: 10 }, () => generateIdealMeal());
    const ids = meals.map(m => m.map(i => i.itemId).sort().join(","));
    const unique = new Set(ids);
    expect(unique.size).toBeGreaterThan(1);
  });

  test("other 3 slots include at least 2 distinct food groups (D6)", () => {
    for (let i = 0; i < 20; i++) {
      const meal = generateIdealMeal();
      const others = meal.filter(i => ["fruit", "veggie", "snack"].includes(i.foodGroup));
      const distinctGroups = new Set(others.map(i => i.foodGroup));
      expect(distinctGroups.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("generateBrownBag", () => {
  test("returns 8 items with exactly 1 matching the ideal meal", () => {
    const idealMeal = generateIdealMeal();
    const bag = generateBrownBag(idealMeal);
    expect(bag).toHaveLength(8);
    const matches = bag.filter(i => i.matchesIdealMeal);
    expect(matches).toHaveLength(1);
  });

  test("the matching item is in the ideal meal", () => {
    const idealMeal = generateIdealMeal();
    const bag = generateBrownBag(idealMeal);
    const match = bag.find(i => i.matchesIdealMeal)!;
    expect(idealMeal.some(i => i.itemId === match.itemId)).toBe(true);
  });
});

describe("calculateNutritionScore", () => {
  test("returns score 0-100 with 4 breakdown categories 0-25 each", () => {
    const idealMeal = generateIdealMeal();
    const result = calculateNutritionScore(idealMeal.map(i => i.itemId));
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
