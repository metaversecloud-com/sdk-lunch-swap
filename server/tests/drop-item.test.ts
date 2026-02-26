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
jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockReturnValue([]),
  generateBrownBag: jest.fn().mockReturnValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
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
  dropFoodItem: jest.fn().mockResolvedValue({ id: "new-dropped-asset" }),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));

function setupMocks(opts: {
  brownBag?: any[];
  visitorData?: any;
  dropReturns?: any;
} = {}) {
  const {
    brownBag = [
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
    ],
    visitorData = {
      idealMeal: [],
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
  mockUtils.getVisitorBag.mockResolvedValue(brownBag.filter(i => i.itemId !== "apple"));
  mockUtils.dropFoodItem.mockResolvedValue(dropReturns);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockVisitor, mockWorld };
}

describe("POST /api/drop-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful drop: item removed from bag, returns updated bag and dropped asset ID", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "apple" });

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
        idealPickupStreak: 0,
        dropsToday: 1,
        totalDrops: 1,
      }),
    );
  });

  test("item not in bag: returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "water" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Item not found in bag");
  });

  test("missing itemId: returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing itemId");
  });

  test("updates world totalDrops", async () => {
    const { mockWorld } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "apple" });

    expect(mockWorld.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({ totalDrops: 1 }),
    );
  });

  test("dropped asset created via dropFoodItem with correct position and item data", async () => {
    setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "apple" });

    expect(mockUtils.dropFoodItem).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: baseCreds,
        position: { x: 100, y: 200 },
        itemId: "apple",
        rarity: "common",
      }),
    );
  });
});
