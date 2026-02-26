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
jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockReturnValue([
    { itemId: "water", name: "Water Bottle", foodGroup: "drink", rarity: "common", collected: false },
    { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", collected: false },
    { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: false },
    { itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common", collected: false },
    { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", collected: false },
  ]),
  generateBrownBag: jest.fn().mockReturnValue([
    { itemId: "water", name: "Water Bottle", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
    { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common", matchesIdealMeal: false },
    { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
    { itemId: "broccoli", name: "Broccoli", foodGroup: "veggie", rarity: "common", matchesIdealMeal: false },
    { itemId: "pizza-slice", name: "Pizza Slice", foodGroup: "main", rarity: "common", matchesIdealMeal: false },
    { itemId: "grapes", name: "Grapes", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
    { itemId: "pretzels", name: "Pretzels", foodGroup: "snack", rarity: "common", matchesIdealMeal: false },
    { itemId: "corn", name: "Corn", foodGroup: "veggie", rarity: "common", matchesIdealMeal: false },
  ]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn(),
}));

const mockGameLogic = jest.mocked(require("../utils/gameLogic/index.js"));

// Mock the utils
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

function setupMocks(overrides: { isNewDay?: boolean; visitorData?: any; userData?: any; worldData?: any } = {}) {
  const { isNewDay: newDay = true, visitorData = {}, userData = {}, worldData = {} } = overrides;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getDroppedAsset.mockResolvedValue({
    id: "dropped-asset-123",
    position: { x: 100, y: 200 },
  });

  const mockVisitor = {
    isAdmin: false,
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = visitorData;
      return Promise.resolve();
    }),
    setDataObject: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
  };

  const mockWorld = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = worldData;
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue([]),
    dataObject: worldData,
  };

  const mockUser = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = userData;
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: userData,
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.World.create.mockReturnValue(mockWorld);
  mockUtils.User.create.mockReturnValue(mockUser);
  mockUtils.Asset.create.mockResolvedValue({ id: "new-asset" });
  mockUtils.DroppedAsset.drop.mockResolvedValue({ id: "new-dropped" });

  mockGameLogic.isNewDay.mockReturnValue(newDay);

  return { mockVisitor, mockWorld, mockUser };
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
    test("new day: returns isNewDay true with generated bag and meal", async () => {
      const { mockVisitor } = setupMocks({ isNewDay: true });

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNewDay).toBe(true);
      expect(res.body.brownBag).toHaveLength(8);
      expect(res.body.idealMeal).toHaveLength(5);
      expect(res.body.completedToday).toBe(false);
      expect(mockVisitor.setDataObject).toHaveBeenCalled();
    });

    test("resume same day: returns existing state", async () => {
      const existingBag = [
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
      ];
      const existingMeal = [
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: true },
      ];

      setupMocks({
        isNewDay: false,
        visitorData: {
          lastPlayedDate: "2026-02-07",
          brownBag: existingBag,
          idealMeal: existingMeal,
          completedToday: false,
          nutritionScore: null,
          superCombosFound: [],
        },
        userData: { totalXp: 50, level: 1, currentStreak: 2, lastCompletionDate: "2026-02-06" },
      });

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.isNewDay).toBe(false);
      expect(res.body.brownBag).toEqual(existingBag);
      expect(res.body.idealMeal).toEqual(existingMeal);
      expect(res.body.xp).toBe(50);
    });

    test("completed today: returns completion data", async () => {
      setupMocks({
        isNewDay: false,
        visitorData: {
          lastPlayedDate: "2026-02-07",
          brownBag: [],
          idealMeal: [],
          completedToday: true,
          nutritionScore: 85,
          superCombosFound: ["Classic Combo"],
        },
        userData: { totalXp: 200, level: 2, currentStreak: 3, lastCompletionDate: "2026-02-07" },
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
      mockUtils.getDroppedAsset.mockRejectedValue(new Error("Asset not found"));

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
