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
  grantXp: jest.fn().mockResolvedValue(0),
  updateWorldStats: jest.fn().mockResolvedValue(undefined),
  getVisitorBadges: jest.fn().mockReturnValue({ badges: {} }),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function setupMocks(
  opts: {
    brownBag?: any[];
    visitorData?: any;
    dropReturns?: any;
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
    },
    dropReturns = { id: "new-dropped-asset" },
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
  // Default: after removing apple, only banana remains
  mockUtils.getVisitorBag.mockResolvedValue(brownBag.filter((i) => i.itemId !== "apple"));
  mockUtils.dropFoodItem.mockResolvedValue(dropReturns);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockVisitor, mockWorld };
}

describe("POST /api/drop-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful drop: item removed from bag, returns updated bag and dropped asset ID", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "apple" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Apple removed, only banana remains
    expect(res.body.brownBag).toHaveLength(1);
    expect(res.body.brownBag[0].itemId).toBe("banana");
    expect(res.body.droppedItem.itemId).toBe("apple");
    expect(res.body.droppedAssetId).toBe("new-dropped-asset");
    expect(res.body.xpEarned).toBe(5); // XP_ACTIONS.DROP
    expect(mockUtils.removeFoodFromVisitor).toHaveBeenCalledWith(mockVisitor, baseCreds, "apple");
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupStreak: 0,
        dropsToday: 1,
        totalDrops: 1,
      }),
      expect.anything(),
    );
  });

  test("item not in bag: returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "water" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Item not found in bag");
  });

  test("missing itemId: returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/drop-item").query(baseCreds).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing itemId");
  });

  test("updates world totalDrops", async () => {
    setupMocks();

    const app = makeApp();
    await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "apple" });

    expect(mockUtils.updateWorldStats).toHaveBeenCalledWith(baseCreds.urlSlug, baseCreds, { drops: 1 });
  });

  test("dropped asset created via dropFoodItem with correct position and item data", async () => {
    setupMocks();

    const app = makeApp();
    await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "apple" });

    expect(mockUtils.dropFoodItem).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: baseCreds,
        position: { x: 100, y: 200 },
        itemId: "apple",
      }),
    );
  });
});
