import express from "express";
import request from "supertest";
import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
  profileId: "profile-1",
};

jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockResolvedValue([]),
  generateBrownBag: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
  calculateNutritionScore: jest.fn().mockResolvedValue({
    score: 85,
    breakdown: { proteinScore: 20, fiberScore: 20, vitaminDiversity: 20, balanceScore: 25 },
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: 50,
  }),
  detectSuperCombos: jest.fn().mockReturnValue([]),
}));

jest.mock("../utils/foodItemLookup.js", () => ({
  getFoodItemsById: jest.fn().mockResolvedValue(new Map([
    ["apple", { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] }, funFact: "Apple fact", superComboPairs: [] }],
    ["banana", { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] }, funFact: "Banana fact", superComboPairs: [] }],
    ["water", { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] }, funFact: "Water fact", superComboPairs: [] }],
    ["milk", { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common", nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] }, funFact: "Milk fact", superComboPairs: [] }],
    ["sandwich", { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] }, funFact: "Sandwich fact", superComboPairs: [] }],
    ["granola-bar", { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] }, funFact: "Granola fact", superComboPairs: [] }],
  ])),
  getFoodItemsByGroup: jest.fn().mockResolvedValue({
    drink: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }, { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common" }],
    fruit: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }, { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common" }],
    veggie: [{ itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" }],
    main: [{ itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" }],
    snack: [{ itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" }],
  }),
  getAllFoodItems: jest.fn().mockResolvedValue([]),
}));

jest.mock("../utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue(undefined),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));
const mockGameLogic = jest.mocked(require("../utils/gameLogic/index.js"));

// Build a complete ideal meal (5 items from different food groups, all common)
const idealMeal = [
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
  { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" },
  { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" },
  { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" },
];

// Brown bag that contains all ideal meal items (and optionally extras)
const completeBag = [
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
  { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", matchesIdealMeal: true },
  { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", matchesIdealMeal: true },
  { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", matchesIdealMeal: true },
];

function setupMocks(opts: {
  brownBag?: any[];
  visitorData?: any;
  worldData?: any;
} = {}) {
  const {
    brownBag = [...completeBag],
    visitorData = {
      idealMeal: [...idealMeal],
      completedToday: false,
      pickupsToday: 5,
      nutritionScore: null,
      superCombosFound: [],
      totalXp: 0,
      level: 1,
      totalMealsCompleted: 0,
      totalSuperCombos: 0,
      bestNutritionScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: "",
    },
    worldData = {
      totalCompletionsToday: 0,
    },
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: worldData,
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, brownBag });
  mockUtils.World.create.mockReturnValue(mockWorld);
  mockUtils.dropFoodItem.mockResolvedValue(undefined);

  return { mockVisitor, mockWorld };
}

describe("POST /api/submit-meal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset game logic mocks to defaults
    mockGameLogic.calculateNutritionScore.mockResolvedValue({
      score: 85,
      breakdown: { proteinScore: 20, fiberScore: 20, vitaminDiversity: 20, balanceScore: 25 },
      superCombos: [],
      totalXpEarned: 0,
      bonusXp: 50,
    });
    mockGameLogic.detectSuperCombos.mockReturnValue([]);
    mockGameLogic.getCurrentDateMT.mockReturnValue("2026-02-07");
  });

  test("successful submission: nutrition score calculated, XP awarded, completedToday set", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nutritionScore).toBe(85);
    expect(res.body.nutritionBreakdown).toEqual({
      proteinScore: 20,
      fiberScore: 20,
      vitaminDiversity: 20,
      balanceScore: 25,
    });
    expect(res.body.completedToday).toBe(true);
    expect(res.body.superCombosFound).toEqual([]);
    // XP: SUBMIT_MEAL(100) + rarity bonus(0 for common) + BALANCED_MEAL_BONUS(50) + streak(10 for day 1)
    expect(res.body.totalXpEarned).toBe(160);
    expect(res.body.newTotalXp).toBe(160);
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.longestStreak).toBe(1);

    // Visitor data updated with completedToday and XP
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        completedToday: true,
        nutritionScore: 85,
        superCombosFound: [],
        totalXp: 160,
        currentStreak: 1,
        longestStreak: 1,
        bestNutritionScore: 85,
        totalMealsCompleted: 1,
        totalSuperCombos: 0,
      }),
    );

    // All bag items removed from inventory
    expect(mockUtils.removeFoodFromVisitor).toHaveBeenCalledTimes(5);
  });

  test("incomplete meal: missing items returns 400", async () => {
    // Bag only has 3 of the 5 ideal meal items
    const incompleteBag = [
      { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
      { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", matchesIdealMeal: true },
    ];

    setupMocks({
      brownBag: incompleteBag,
      visitorData: {
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 3,
        nutritionScore: null,
        superCombosFound: [],
        totalXp: 0,
        level: 1,
        totalMealsCompleted: 0,
        totalSuperCombos: 0,
        bestNutritionScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: "",
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Meal incomplete");
    expect(res.body.missingItems).toHaveLength(2);
    expect(res.body.missingItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: "sandwich", name: "Sandwich", foodGroup: "main" }),
        expect.objectContaining({ itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack" }),
      ]),
    );
  });

  test("already completed today: returns 400", async () => {
    setupMocks({
      visitorData: {
        idealMeal: [...idealMeal],
        completedToday: true,
        pickupsToday: 5,
        nutritionScore: 85,
        superCombosFound: [],
        totalXp: 160,
        level: 1,
        totalMealsCompleted: 1,
        totalSuperCombos: 0,
        bestNutritionScore: 85,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: "2026-02-07",
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Already completed meal today");
  });

  test("super combos detected: appear in response and XP includes combo bonus", async () => {
    mockGameLogic.detectSuperCombos.mockReturnValue([
      { name: "Classic Snack Pack", items: ["apple", "cheese-stick"], bonusXp: 30, description: "Great combo!" },
    ]);

    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.superCombosFound).toEqual(["Classic Snack Pack"]);
    // XP: SUBMIT_MEAL(100) + rarity(0) + BALANCED_MEAL_BONUS(50) + combo(30) + streak(10)
    expect(res.body.totalXpEarned).toBe(190);
  });

  test("streak logic: continuing streak when lastCompletionDate is yesterday", async () => {
    // Calculate yesterday string in MT timezone to match controller logic
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Denver" });

    setupMocks({
      visitorData: {
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 5,
        nutritionScore: null,
        superCombosFound: [],
        totalXp: 500,
        level: 3,
        totalMealsCompleted: 5,
        totalSuperCombos: 1,
        bestNutritionScore: 80,
        currentStreak: 3,
        longestStreak: 5,
        lastCompletionDate: yesterdayStr,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    // currentStreak should be 3 + 1 = 4
    expect(res.body.currentStreak).toBe(4);
    // longestStreak stays at 5 since 4 < 5
    expect(res.body.longestStreak).toBe(5);
    // Streak XP: min(4 * 10, 100) = 40
    // Total: SUBMIT_MEAL(100) + rarity(0) + BALANCED_MEAL_BONUS(50) + streak(40) = 190
    expect(res.body.totalXpEarned).toBe(190);
    expect(res.body.newTotalXp).toBe(500 + 190);
  });

  test("streak logic: starting fresh when lastCompletionDate is older than yesterday", async () => {
    setupMocks({
      visitorData: {
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 5,
        nutritionScore: null,
        superCombosFound: [],
        totalXp: 500,
        level: 3,
        totalMealsCompleted: 5,
        totalSuperCombos: 1,
        bestNutritionScore: 80,
        currentStreak: 7,
        longestStreak: 7,
        lastCompletionDate: "2026-01-01", // Long ago
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    // Streak resets to 1
    expect(res.body.currentStreak).toBe(1);
    // longestStreak stays at 7 since 1 < 7
    expect(res.body.longestStreak).toBe(7);
    // Streak XP: min(1 * 10, 100) = 10
    // Total: SUBMIT_MEAL(100) + rarity(0) + BALANCED_MEAL_BONUS(50) + streak(10) = 160
    expect(res.body.totalXpEarned).toBe(160);
  });

  test("non-meal items auto-dropped into world", async () => {
    // Bag has ideal meal items plus 2 extra non-meal items
    const bagWithExtras = [
      ...completeBag,
      { itemId: "popcorn", name: "Popcorn", foodGroup: "snack", rarity: "common", matchesIdealMeal: false },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
    ];

    setupMocks({
      brownBag: bagWithExtras,
      visitorData: {
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 7,
        nutritionScore: null,
        superCombosFound: [],
        totalXp: 0,
        level: 1,
        totalMealsCompleted: 0,
        totalSuperCombos: 0,
        bestNutritionScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: "",
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    // All 7 bag items removed from inventory
    expect(mockUtils.removeFoodFromVisitor).toHaveBeenCalledTimes(7);
    // 2 remaining non-meal items should be auto-dropped via dropFoodItem
    expect(mockUtils.dropFoodItem).toHaveBeenCalledTimes(2);
  });

  test("world totalCompletionsToday incremented (B12)", async () => {
    const { mockWorld } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(mockWorld.incrementDataObjectValue).toHaveBeenCalledWith("totalCompletionsToday", 1);
  });

  test("fires celebration toast", async () => {
    const { mockWorld } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(mockWorld.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Meal Complete!",
        text: expect.stringContaining("Score: 85/100"),
      }),
    );
  });
});
