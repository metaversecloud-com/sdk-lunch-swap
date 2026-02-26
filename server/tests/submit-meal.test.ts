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
  generateIdealMeal: jest.fn().mockReturnValue([]),
  generateBrownBag: jest.fn().mockReturnValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
  calculateNutritionScore: jest.fn().mockReturnValue({
    score: 85,
    breakdown: { proteinScore: 20, fiberScore: 20, vitaminDiversity: 20, balanceScore: 25 },
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: 50,
  }),
  detectSuperCombos: jest.fn().mockReturnValue([]),
}));

jest.mock("../utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  Visitor: { get: jest.fn() },
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));
const mockGameLogic = jest.mocked(require("../utils/gameLogic/index.js"));

// Build a complete ideal meal (5 items from different food groups, all common)
const idealMeal = [
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: true },
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: true },
  { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", collected: true },
  { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", collected: true },
  { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", collected: true },
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
  visitorData?: any;
  userData?: any;
  worldData?: any;
} = {}) {
  const {
    visitorData = {
      brownBag: [...completeBag],
      idealMeal: [...idealMeal],
      completedToday: false,
      pickupsToday: 5,
      nutritionScore: null,
      superCombosFound: [],
    },
    userData = {
      totalXp: 0,
      level: 1,
      totalMealsCompleted: 0,
      totalPickups: 5,
      totalDrops: 0,
      totalSuperCombos: 0,
      bestNutritionScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: "",
      uniqueItemsCollected: [],
    },
    worldData = {
      totalCompletionsToday: 0,
    },
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getDroppedAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = visitorData;
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
  };

  const mockUser = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = userData;
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: userData,
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: worldData,
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.User.create.mockReturnValue(mockUser);
  mockUtils.World.create.mockReturnValue(mockWorld);
  mockUtils.Asset.create.mockResolvedValue({ id: "new-asset-id" });
  mockUtils.DroppedAsset.drop.mockResolvedValue(undefined);

  return { mockVisitor, mockUser, mockWorld };
}

describe("POST /api/submit-meal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset game logic mocks to defaults
    mockGameLogic.calculateNutritionScore.mockReturnValue({
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
    const { mockVisitor, mockUser } = setupMocks();

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

    // Visitor data updated with completedToday
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        completedToday: true,
        nutritionScore: 85,
        superCombosFound: [],
        brownBag: [],
      }),
    );

    // User data updated
    expect(mockUser.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        totalXp: 160,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: "2026-02-07",
        bestNutritionScore: 85,
      }),
    );

    // Atomic increments on user
    expect(mockUser.incrementDataObjectValue).toHaveBeenCalledWith("totalMealsCompleted", 1);
    expect(mockUser.incrementDataObjectValue).toHaveBeenCalledWith("totalSuperCombos", 0);
  });

  test("incomplete meal: missing items returns 400", async () => {
    // Bag only has 3 of the 5 ideal meal items
    const incompleteBag = [
      { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
      { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", matchesIdealMeal: true },
    ];

    setupMocks({
      visitorData: {
        brownBag: incompleteBag,
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 3,
        nutritionScore: null,
        superCombosFound: [],
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
        brownBag: [...completeBag],
        idealMeal: [...idealMeal],
        completedToday: true,
        pickupsToday: 5,
        nutritionScore: 85,
        superCombosFound: [],
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
      userData: {
        totalXp: 500,
        level: 3,
        totalMealsCompleted: 5,
        totalPickups: 25,
        totalDrops: 0,
        totalSuperCombos: 1,
        bestNutritionScore: 80,
        currentStreak: 3,
        longestStreak: 5,
        lastCompletionDate: yesterdayStr,
        uniqueItemsCollected: [],
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
      userData: {
        totalXp: 500,
        level: 3,
        totalMealsCompleted: 5,
        totalPickups: 25,
        totalDrops: 0,
        totalSuperCombos: 1,
        bestNutritionScore: 80,
        currentStreak: 7,
        longestStreak: 7,
        lastCompletionDate: "2026-01-01", // Long ago
        uniqueItemsCollected: [],
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
      visitorData: {
        brownBag: bagWithExtras,
        idealMeal: [...idealMeal],
        completedToday: false,
        pickupsToday: 7,
        nutritionScore: null,
        superCombosFound: [],
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    // 2 remaining non-meal items should be auto-dropped
    expect(mockUtils.Asset.create).toHaveBeenCalledTimes(2);
    expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledTimes(2);
    // Each drop should have a unique name with the item's id
    expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        uniqueName: expect.stringContaining("lunch-swap-food|popcorn|common|"),
        urlSlug: "my-world",
        isInteractive: true,
      }),
    );
    expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        uniqueName: expect.stringContaining("lunch-swap-food|banana|common|"),
      }),
    );
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
