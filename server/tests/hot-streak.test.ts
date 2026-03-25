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

// Mock game logic (required by handleGetGameState which shares the route file)
jest.mock("@utils/gameLogic/index.js", () => ({
  generateMeal: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  getCurrentWeekMT: jest.fn().mockReturnValue("2026-W06"),
  getPreviousWeekMT: jest.fn().mockReturnValue("2026-W05"),
  isNewDay: jest.fn().mockReturnValue(false),
}));

jest.mock("@utils/foodItemLookup.js", () => ({
  getFoodItemsById: jest.fn().mockResolvedValue(
    new Map([
      [
        "apple",
        {
          itemId: "apple",
          name: "Apple",
          foodGroup: "fruit",
          rarity: "common",
          nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] },
          funFact: "Apple fact",
          superComboPairs: [],
        },
      ],
      [
        "banana",
        {
          itemId: "banana",
          name: "Banana",
          foodGroup: "fruit",
          rarity: "common",
          nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] },
          funFact: "Banana fact",
          superComboPairs: [],
        },
      ],
      [
        "water",
        {
          itemId: "water",
          name: "Water",
          foodGroup: "drink",
          rarity: "common",
          nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] },
          funFact: "Water fact",
          superComboPairs: [],
        },
      ],
      [
        "milk",
        {
          itemId: "milk",
          name: "Milk",
          foodGroup: "drink",
          rarity: "common",
          nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] },
          funFact: "Milk fact",
          superComboPairs: [],
        },
      ],
      [
        "sandwich",
        {
          itemId: "sandwich",
          name: "Sandwich",
          foodGroup: "main",
          rarity: "common",
          nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] },
          funFact: "Sandwich fact",
          superComboPairs: [],
        },
      ],
      [
        "granola-bar",
        {
          itemId: "granola-bar",
          name: "Granola Bar",
          foodGroup: "snack",
          rarity: "common",
          nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] },
          funFact: "Granola fact",
          superComboPairs: [],
        },
      ],
    ]),
  ),
  getFoodItemsByGroup: jest.fn().mockResolvedValue({
    drink: [
      { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
      { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common" },
    ],
    fruit: [
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common" },
    ],
    veggie: [{ itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" }],
    main: [{ itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" }],
    snack: [{ itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" }],
  }),
  getAllFoodItems: jest.fn().mockResolvedValue([]),
}));

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue({ id: "new-dropped-asset" }),
  resolveFoodAsset: jest.fn(),
  pickupFoodAsset: jest.fn().mockResolvedValue({ pickedUp: true }),
  buildBagItemFromDef: jest.fn(),
  calculatePickupXp: jest.fn().mockReturnValue(10),
  grantXp: jest.fn().mockResolvedValue(0),
  updateWorldStats: jest.fn().mockResolvedValue(undefined),
  checkPickupBadges: jest.fn().mockResolvedValue(undefined),
  checkLevelBadges: jest.fn().mockResolvedValue(undefined),
  getVisitorBadges: jest.fn().mockReturnValue({ badges: {} }),
  Visitor: { get: jest.fn(), create: jest.fn() },
  World: { create: jest.fn(), deleteDroppedAssets: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function setupPickupMocks(
  opts: {
    brownBag?: any[];
    visitorData?: any;
    foodAssetExists?: boolean;
    foodAssetUniqueName?: string;
  } = {},
) {
  const {
    brownBag = [],
    visitorData = {
      targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
      completedToday: false,
      pickupsToday: 0,
      pickupStreak: 0,
      hotStreakActive: false,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `LunchSwap_foodItem|apple|common|${Date.now()}|0`,
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const foodDef = {
    itemId: "apple",
    name: "Apple",
    foodGroup: "fruit",
    rarity: "common",
    nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] },
    funFact: "Apple fact",
    superComboPairs: [],
  };

  const isMystery = foodAssetUniqueName.split("|")[4] === "1";

  const mockFoodAsset = foodAssetExists
    ? {
        id: "food-asset-1",
        uniqueName: foodAssetUniqueName,
        position: { x: 110, y: 210 },
        updateDataObject: jest.fn().mockResolvedValue(undefined),
        dataObject: {},
      }
    : null;

  mockUtils.resolveFoodAsset.mockResolvedValue(
    foodAssetExists
      ? { success: true, foodAsset: mockFoodAsset, foodDef, isMystery }
      : { success: false, status: 404, message: "Food asset not found" },
  );

  const matchesTarget = visitorData.targetMeal?.some((i: any) => i.itemId === "apple") ?? false;
  const bagItem = {
    itemId: "apple",
    name: "Apple",
    foodGroup: "fruit",
    rarity: "common",
    matchesTargetMeal: matchesTarget,
  };

  mockUtils.buildBagItemFromDef.mockReturnValue({ bagItem, matchesTargetMeal: matchesTarget });

  // calculatePickupXp: controller does calculatePickupXp(rarity, matchesTargetMeal, xpMultiplier) * buffMultiplier
  // For hot streak consuming (wasHotStreak=true), xpMultiplier=3
  // For normal, xpMultiplier=1
  const wasHotStreak = visitorData.hotStreakActive || false;
  const currentStreak = visitorData.pickupStreak || 0;
  const hotStreakActivated = matchesTarget && currentStreak + 1 >= 3;
  const xpMultiplier = wasHotStreak ? 3 : 1;

  // Base XP: 10 for non-matching, 35 for matching (10 + 25 ideal bonus)
  const baseXp = matchesTarget ? 35 : 10;
  mockUtils.calculatePickupXp.mockReturnValue(baseXp * xpMultiplier);

  mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: true });
  mockUtils.grantXp.mockResolvedValue(0);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fireToast: jest.fn().mockReturnValue(Promise.resolve()),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    inventoryItems: [],
    dataObject: visitorData,
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, visitorInventory: [], brownBag });

  // After pickup, bag has the new item
  mockUtils.getVisitorBag.mockResolvedValue([...brownBag, bagItem]);

  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockFoodAsset, mockVisitor, mockWorld };
}

function setupDropMocks(
  opts: {
    brownBag?: any[];
    visitorData?: any;
  } = {},
) {
  const {
    brownBag = [
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesTargetMeal: false },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: true },
    ],
    visitorData = {
      targetMeal: [],
      completedToday: false,
      pickupsToday: 0,
      dropsToday: 0,
      totalDrops: 0,
      pickupStreak: 2,
      hotStreakActive: false,
    },
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fireToast: jest.fn().mockReturnValue(Promise.resolve()),
    dataObject: visitorData,
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = {};
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, brownBag });
  mockUtils.getVisitorBag.mockResolvedValue(brownBag.filter((i) => i.itemId !== "apple"));
  mockUtils.dropFoodItem.mockResolvedValue({ id: "new-dropped-asset" });
  mockUtils.grantXp.mockResolvedValue(0);
  mockUtils.updateWorldStats.mockResolvedValue(undefined);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockVisitor, mockWorld };
}

describe("Hot Streaks", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/pickup-item — streak logic", () => {
    test("picking up ideal-meal-matching item increments pickupStreak", async () => {
      const { mockVisitor } = setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 1,
          hotStreakActive: false,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.pickupStreak).toBe(2);
      expect(res.body.hotStreakActive).toBe(false);
      expect(res.body.xpMultiplier).toBe(1);

      // Verify visitor data update includes streak increment
      expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupStreak: 2,
          hotStreakActive: false,
        }),
        expect.anything(),
      );
    });

    test("picking up non-matching item resets pickupStreak to 0", async () => {
      const { mockVisitor } = setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 2,
          hotStreakActive: false,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.pickupStreak).toBe(0);
      expect(res.body.xpMultiplier).toBe(1);

      expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupStreak: 0,
        }),
        expect.anything(),
      );
    });

    test("when pickupStreak reaches 3, hotStreakActive is set to true", async () => {
      const { mockVisitor } = setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 2,
          hotStreakActive: false,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.pickupStreak).toBe(3);
      expect(res.body.hotStreakActive).toBe(true);
      expect(res.body.xpMultiplier).toBe(1); // Not consumed yet

      expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupStreak: 3,
          hotStreakActive: true,
        }),
        expect.anything(),
      );
    });

    test("next pickup with hotStreakActive gets 3x XP, then resets", async () => {
      const { mockVisitor } = setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 3,
          hotStreakActive: true,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      // apple doesn't match target meal (water is target), so base XP = 10
      // With 3x multiplier: 10 * 3 = 30
      expect(res.body.xpEarned).toBe(30);
      expect(res.body.xpMultiplier).toBe(3);
      expect(res.body.hotStreakActive).toBe(false);
      expect(res.body.pickupStreak).toBe(0);

      expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
        expect.objectContaining({
          hotStreakActive: false,
          pickupStreak: 0,
        }),
        expect.anything(),
      );
    });

    test("hot streak 3x multiplier applies to ideal meal bonus XP too", async () => {
      setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 3,
          hotStreakActive: true,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      // Base XP = 10 (pickup) + 25 (ideal match) = 35
      // With 3x multiplier: 35 * 3 = 105
      expect(res.body.xpEarned).toBe(105);
      expect(res.body.xpMultiplier).toBe(3);
    });

    test("first ideal pickup starts streak at 1", async () => {
      setupPickupMocks({
        visitorData: {
          targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
          completedToday: false,
          pickupsToday: 0,
          pickupStreak: 0,
          hotStreakActive: false,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.pickupStreak).toBe(1);
      expect(res.body.hotStreakActive).toBe(false);
    });
  });

  describe("POST /api/drop-item — streak reset", () => {
    test("dropping an item resets pickupStreak to 0", async () => {
      const { mockVisitor } = setupDropMocks({
        brownBag: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesTargetMeal: false }],
        visitorData: {
          targetMeal: [],
          completedToday: false,
          pickupsToday: 0,
          dropsToday: 0,
          totalDrops: 0,
          pickupStreak: 2,
          hotStreakActive: false,
        },
      });

      const app = makeApp();
      const res = await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "apple" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupStreak: 0,
        }),
        expect.anything(),
      );
    });
  });
});
