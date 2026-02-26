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
  getDroppedAsset: jest.fn(),
  Visitor: { get: jest.fn() },
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));

function setupMocks(opts: {
  visitorData?: any;
  dropReturns?: any;
  assetCreateReturns?: any;
} = {}) {
  const {
    visitorData = {
      brownBag: [
        { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
        { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
      ],
      idealMeal: [],
      completedToday: false,
      pickupsToday: 0,
      dropsToday: 0,
    },
    dropReturns = { id: "new-dropped-asset" },
    assetCreateReturns = { id: "new-asset" },
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
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.User.create.mockReturnValue(mockUser);
  mockUtils.World.create.mockReturnValue(mockWorld);
  mockUtils.Asset.create.mockResolvedValue(assetCreateReturns);
  mockUtils.DroppedAsset.drop.mockResolvedValue(dropReturns);

  return { mockVisitor, mockUser, mockWorld };
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
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        brownBag: expect.arrayContaining([
          expect.objectContaining({ itemId: "banana" }),
        ]),
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

  test("increments visitor dropsToday and user totalDrops", async () => {
    const { mockVisitor, mockUser } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "apple" });

    expect(mockVisitor.incrementDataObjectValue).toHaveBeenCalledWith("dropsToday", 1);
    expect(mockUser.incrementDataObjectValue).toHaveBeenCalledWith("totalDrops", 1);
  });

  test("dropped asset created with correct position near visitor moveTo", async () => {
    setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "apple" });

    // Asset.create should have been called
    expect(mockUtils.Asset.create).toHaveBeenCalledWith("webImageAsset", expect.any(Object));

    // DroppedAsset.drop should have been called with position near moveTo (100, 200)
    expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledWith(
      { id: "new-asset" },
      expect.objectContaining({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
        urlSlug: "my-world",
        isInteractive: true,
      }),
    );

    // Verify position is within offset range of moveTo (100 +/- 50, 200 +/- 50)
    const dropCall = mockUtils.DroppedAsset.drop.mock.calls[0];
    const dropPosition = dropCall[1].position;
    expect(dropPosition.x).toBeGreaterThanOrEqual(50);
    expect(dropPosition.x).toBeLessThanOrEqual(150);
    expect(dropPosition.y).toBeGreaterThanOrEqual(150);
    expect(dropPosition.y).toBeLessThanOrEqual(250);
  });
});
