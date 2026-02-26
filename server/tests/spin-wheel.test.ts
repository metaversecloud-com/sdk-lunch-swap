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

// Mock game logic (required because routes.ts imports controllers that use it)
jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockReturnValue([]),
  generateBrownBag: jest.fn().mockReturnValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
  calculateNutritionScore: jest.fn().mockReturnValue({
    score: 0,
    breakdown: {},
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: 0,
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

function setupMocks(opts: { visitorData?: any } = {}) {
  const {
    visitorData = {
      dailyBuff: null,
      hasRewardToken: true,
      brownBag: [],
      idealMeal: [],
      completedToday: false,
    },
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);

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

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);

  return { mockVisitor };
}

describe("POST /api/spin-wheel", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful spin: returns buff data and updates visitor data with dailyBuff", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/spin-wheel")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.buff).toBeDefined();
    expect(res.body.buff.id).toBeDefined();
    expect(res.body.buff.name).toBeDefined();
    expect(res.body.buff.description).toBeDefined();

    // Verify updateDataObject was called with a dailyBuff value and hasRewardToken: false
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyBuff: expect.any(String),
        hasRewardToken: false,
      }),
    );
  });

  test("already spun today: returns 400 with 'Already spun today' when dailyBuff is set", async () => {
    setupMocks({
      visitorData: {
        dailyBuff: "double-xp",
        hasRewardToken: true,
        brownBag: [],
        idealMeal: [],
        completedToday: false,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/spin-wheel")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Already spun today");
  });

  test("no Reward Token: returns 400 with 'No Reward Tokens available' when hasRewardToken is false", async () => {
    setupMocks({
      visitorData: {
        dailyBuff: null,
        hasRewardToken: false,
        brownBag: [],
        idealMeal: [],
        completedToday: false,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/spin-wheel")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No Reward Tokens available");
  });

  test("buff consumed: verifies updateDataObject called with hasRewardToken: false", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/spin-wheel")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    expect(mockVisitor.updateDataObject).toHaveBeenCalledTimes(1);
    expect(mockVisitor.updateDataObject).toHaveBeenCalledWith(
      expect.objectContaining({
        hasRewardToken: false,
      }),
    );
  });

  test("returned buff is one of the valid wheel buffs", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/spin-wheel")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(200);
    const validBuffIds = ["double-xp", "rare-start", "big-bag", "combo-finder", "epic-drop"];
    expect(validBuffIds).toContain(res.body.buff.id);
  });
});
