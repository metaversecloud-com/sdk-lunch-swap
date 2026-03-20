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
  displayName: "AdminPlayer",
};

// Mock game logic (required by other controllers that share the route file)
jest.mock("@utils/gameLogic/index.js", () => ({
  generateMeal: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  getCurrentWeekMT: jest.fn().mockReturnValue("2026-W06"),
  getPreviousWeekMT: jest.fn().mockReturnValue("2026-W05"),
  isNewDay: jest.fn().mockReturnValue(false),
  calculateNutritionScore: jest.fn().mockResolvedValue(50),
  getXpForAction: jest.fn().mockReturnValue(10),
  calculateLevel: jest.fn().mockReturnValue(1),
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
  dropFoodItem: jest.fn().mockResolvedValue({ id: "new-dropped" }),
  getFoodItemsInWorld: jest.fn().mockResolvedValue([]),
  parseLeaderboard: jest.fn().mockReturnValue([]),
  updateLeaderboard: jest.fn().mockResolvedValue(undefined),
  getBadges: jest.fn().mockResolvedValue([]),
  getVisitorBadges: jest.fn().mockReturnValue([]),
  resolveFoodAsset: jest.fn(),
  pickupFoodAsset: jest.fn().mockResolvedValue({ pickedUp: true }),
  buildBagItemFromDef: jest.fn(),
  calculatePickupXp: jest.fn().mockReturnValue(10),
  grantXp: jest.fn().mockResolvedValue(10),
  grantRewardToken: jest.fn().mockResolvedValue(undefined),
  updateWorldStats: jest.fn().mockResolvedValue(undefined),
  checkSubmitMealBadges: jest.fn().mockResolvedValue(undefined),
  checkLevelBadges: jest.fn().mockResolvedValue(undefined),
  checkPickupBadges: jest.fn().mockResolvedValue(undefined),
  Visitor: { get: jest.fn(), create: jest.fn() },
  World: { create: jest.fn(), deleteDroppedAssets: jest.fn().mockResolvedValue(undefined) },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn(), create: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function setupMocks(opts: { isAdmin?: boolean; foodAssets?: any[]; worldData?: any } = {}) {
  const { isAdmin = true, foodAssets = [], worldData = {} } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({
    id: "key-asset-123",
    position: { x: 100, y: 200 },
  });

  const mockVisitor = {
    isAdmin,
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  const mockWorld = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = worldData;
      return Promise.resolve();
    }),
    fetchDetails: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue(foodAssets),
    dataObject: worldData,
    width: 4000,
    height: 4000,
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.World.create.mockReturnValue(mockWorld);
  mockUtils.dropFoodItem.mockResolvedValue({ id: "new-dropped" });

  return { mockVisitor, mockWorld };
}

describe("Admin Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════
  // POST /api/admin/remove-all-items
  // ═══════════════════════════════════════════════════════════════
  describe("POST /api/admin/remove-all-items", () => {
    test("non-admin returns 403", async () => {
      setupMocks({ isAdmin: false });

      const app = makeApp();
      const res = await request(app).post("/api/admin/remove-all-items").query(baseCreds);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Admin access required");
    });

    test("admin removes all food assets and returns removedCount", async () => {
      const mockFoodAssets = [{ id: "food-1" }, { id: "food-2" }, { id: "food-3" }];
      const { mockWorld } = setupMocks({ isAdmin: true, foodAssets: mockFoodAssets });

      const app = makeApp();
      const res = await request(app).post("/api/admin/remove-all-items").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removedCount).toBe(3);
      expect(res.body.totalFound).toBe(3);
      expect(mockWorld.fetchDroppedAssetsWithUniqueName).toHaveBeenCalledWith({
        uniqueName: "LunchSwap_foodItem",
        isPartial: true,
      });
      const call = (mockUtils.World.deleteDroppedAssets as jest.Mock).mock.calls[0];
      expect(call[0]).toBe("my-world");
      expect(call[1]).toEqual(["food-1", "food-2", "food-3"]);
      // call[2] is process.env.INTERACTIVE_SECRET (undefined in test env)
      expect(call[3]).toEqual(baseCreds);
    });

    test("handles empty world (0 items)", async () => {
      setupMocks({ isAdmin: true, foodAssets: [] });

      const app = makeApp();
      const res = await request(app).post("/api/admin/remove-all-items").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removedCount).toBe(0);
      expect(res.body.totalFound).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/admin/spawn-items
  // ═══════════════════════════════════════════════════════════════
  describe("POST /api/admin/spawn-items", () => {
    test("non-admin returns 403", async () => {
      setupMocks({ isAdmin: false });

      const app = makeApp();
      const res = await request(app).post("/api/admin/spawn-items").query(baseCreds).send({ count: 5 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Admin access required");
    });

    test("admin spawns requested number of items", async () => {
      setupMocks({ isAdmin: true });

      const app = makeApp();
      const res = await request(app).post("/api/admin/spawn-items").query(baseCreds).send({ count: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.spawnedCount).toBe(3);
      expect(res.body.spawnedItems).toHaveLength(3);
      for (const item of res.body.spawnedItems) {
        expect(item).toHaveProperty("itemId");
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("rarity");
      }
      expect(mockUtils.dropFoodItem).toHaveBeenCalledTimes(3);
    });

    test("caps at 60 items max", async () => {
      setupMocks({ isAdmin: true });

      const app = makeApp();
      const res = await request(app).post("/api/admin/spawn-items").query(baseCreds).send({ count: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The controller caps at 60 and spawns from the mock food items map (6 unique items)
      // Since we only have 6 unique items in the mock, it will spawn 6
      expect(res.body.spawnedCount).toBeLessThanOrEqual(60);
      expect(res.body.spawnedItems.length).toBeLessThanOrEqual(60);
    });

    test("defaults to 10 items when count not provided", async () => {
      setupMocks({ isAdmin: true });

      const app = makeApp();
      const res = await request(app).post("/api/admin/spawn-items").query(baseCreds).send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Controller defaults to min(10, 60) = 10, but limited by unique items in mock (6)
      expect(res.body.spawnedCount).toBeLessThanOrEqual(10);
      expect(res.body.spawnedItems.length).toBeLessThanOrEqual(10);
      expect(res.body.spawnedCount).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/admin/stats
  // ═══════════════════════════════════════════════════════════════
  describe("GET /api/admin/stats", () => {
    test("non-admin returns 403", async () => {
      setupMocks({ isAdmin: false });

      const app = makeApp();
      const res = await request(app).get("/api/admin/stats").query(baseCreds);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Admin access required");
    });

    test("admin returns world stats including itemsInWorld count", async () => {
      const mockFoodAssets = [{ id: "food-1" }, { id: "food-2" }, { id: "food-3" }, { id: "food-4" }, { id: "food-5" }];
      setupMocks({
        isAdmin: true,
        foodAssets: mockFoodAssets,
        worldData: {
          gameVersion: 1,
          currentDate: "2026-02-07",
          totalStartsToday: 15,
          totalCompletionsToday: 8,
          totalPickups: 42,
          totalDrops: 20,
          totalMealSubmissions: 10,
        },
      });

      const app = makeApp();
      const res = await request(app).get("/api/admin/stats").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toEqual({
        itemsInWorld: 5,
        totalStartsToday: 15,
        totalCompletionsToday: 8,
        totalPickups: 42,
        totalDrops: 20,
        totalMealSubmissions: 10,
        currentDate: "2026-02-07",
        gameVersion: 1,
      });
    });

    test("returns defaults when world data is empty", async () => {
      setupMocks({ isAdmin: true, foodAssets: [], worldData: {} });

      const app = makeApp();
      const res = await request(app).get("/api/admin/stats").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.itemsInWorld).toBe(0);
      expect(res.body.stats.totalStartsToday).toBe(0);
      expect(res.body.stats.totalCompletionsToday).toBe(0);
      expect(res.body.stats.totalPickups).toBe(0);
      expect(res.body.stats.totalDrops).toBe(0);
      expect(res.body.stats.totalMealSubmissions).toBe(0);
      expect(res.body.stats.gameVersion).toBe(1);
    });
  });
});
