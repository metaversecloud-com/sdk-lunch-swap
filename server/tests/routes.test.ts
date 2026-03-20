const topiaMock = require("../mocks/@rtsdk/topia").__mock;

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
  displayName: "TestPlayer",
};

// Mock game logic
jest.mock("@utils/gameLogic/index.js", () => ({
  generateMeal: jest.fn().mockResolvedValue([
    { itemId: "water", name: "Water Bottle", foodGroup: "drink", rarity: "common" },
    { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" },
    { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
    { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" },
    { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" },
  ]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  getCurrentWeekMT: jest.fn().mockReturnValue("2026-W06"),
  getPreviousWeekMT: jest.fn().mockReturnValue("2026-W05"),
  isNewDay: jest.fn(),
}));

jest.mock("@utils/foodItemLookup.js", () => ({
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

const mockGameLogic = jest.mocked(require("@utils/gameLogic/index.js"));

// Mock the utils
jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  getFoodItemsById: jest.fn().mockResolvedValue(new Map()),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue(undefined),
  getBadges: jest.fn().mockResolvedValue([]),
  getVisitorBadges: jest.fn().mockReturnValue([]),
  getFoodItemsInWorld: jest.fn().mockResolvedValue([]),
  parseLeaderboard: jest.fn().mockReturnValue([]),
  updateLeaderboard: jest.fn().mockResolvedValue(undefined),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn(), create: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

async function setupMocks(overrides: { isNewDay?: boolean; brownBag?: any[]; visitorData?: any; userData?: any; worldData?: any } = {}) {
  const { isNewDay: newDay = true, brownBag = [], visitorData = {}, worldData = {} } = overrides;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({
    id: "dropped-asset-123",
    position: { x: 100, y: 200 },
  });

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    fireToast: jest.fn().mockResolvedValue(undefined),
    setDataObject: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    inventoryItems: [],
    dataObject: visitorData,
  };

  const mockWorld = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = worldData;
      return Promise.resolve();
    }),
    fetchDetails: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue([]),
    dataObject: worldData,
  };

  mockUtils.getVisitor.mockResolvedValue({
    visitor: mockVisitor,
    visitorData,
    brownBag,
    visitorInventory: [],
    xp: visitorData.totalXp || 0,
    level: visitorData.level || 1,
    newDay,
    hasRewardToken: visitorData.hasRewardToken || false,
  });
  mockUtils.World.create.mockReturnValue(mockWorld);

  // For new day, getVisitorBag returns empty (bag starts empty on new day)
  mockUtils.getVisitorBag.mockResolvedValue([]);

  mockGameLogic.isNewDay.mockReturnValue(newDay);

  return { mockVisitor, mockWorld };
}

describe("routes", () => {
  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();
  });

  test("GET /system/health returns status OK and env keys", async () => {
    const app = makeApp();
    const res = await request(app).get("/api/system/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
    expect(res.body).toHaveProperty("envs");
  });

  describe("GET /game-state", () => {
    test("new day: returns isNewDay true with empty bag and generated target meal", async () => {
      const { mockVisitor } = await setupMocks({ isNewDay: true });

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNewDay).toBe(true);
      expect(res.body.brownBag).toHaveLength(0);
      expect(res.body.targetMeal).toHaveLength(5);
      expect(res.body.completedToday).toBe(false);
      expect(mockVisitor.updateDataObject).toHaveBeenCalled();
    });

    test("resume same day: returns existing state", async () => {
      const existingBag = [
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesTargetMeal: true },
      ];
      const existingMeal = [
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
      ];

      await setupMocks({
        isNewDay: false,
        brownBag: existingBag,
        visitorData: {
          lastPlayedDate: "2026-02-07",
          targetMeal: existingMeal,
          completedToday: false,
          nutritionScore: null,
          superCombosFound: [],
          totalXp: 50,
          level: 1,
          currentStreak: 2,
          lastCompletionWeek: "2026-W05",
        },
      });

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.isNewDay).toBe(false);
      expect(res.body.brownBag).toEqual(existingBag);
      expect(res.body.targetMeal).toEqual(existingMeal);
      expect(res.body.xp).toBe(50);
    });

    test("completed today: returns completion data", async () => {
      await setupMocks({
        isNewDay: false,
        visitorData: {
          lastPlayedDate: "2026-02-07",
          targetMeal: [
            { itemId: "water", name: "Water Bottle", foodGroup: "drink", rarity: "common" },
          ],
          completedToday: true,
          nutritionScore: 85,
          superCombosFound: ["Classic Combo"],
          totalXp: 200,
          level: 2,
          currentStreak: 3,
          lastCompletionWeek: "2026-W06",
        },
      });

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.completedToday).toBe(true);
      expect(res.body.nutritionScore).toBe(85);
      expect(res.body.superCombosFound).toContain("Classic Combo");
    });

    test("handles errors gracefully", async () => {
      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.getKeyAsset.mockRejectedValue(new Error("Asset not found"));

      const app = makeApp();
      await request(app).get("/api/game-state").query(baseCreds);

      expect(mockUtils.errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "handleGetGameState",
          message: "Error getting game state",
        }),
      );
    });
  });
});
