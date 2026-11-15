// Rules a player can't get around by calling the API directly: double submits, races between players,
// forged display names, failed Topia calls.
import { expect, test } from "../../fixtures";
import { forgeDisplayName } from "../../helpers/leaderboardForgery";
import { FoodId, MEAL, foodAsset, foodInWorld, playing, seedGame, visitorInventory } from "./lunch";

const FULL: FoodId[] = ["milk", "burrito", "apple", "carrots", "mango", "corn", "yogurt", "pasta"];

test.describe("races", () => {
  test("two players grabbing the same item: only one gets it", async ({ request, world }) => {
    await seedGame(world, { otherVisitors: { 43: { visitorData: playing() } }, assets: { "food-1": foodAsset("mango") }, latencyMs: 20 });

    const [a, b] = await Promise.all([
      request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } }),
      request.post(world.apiAs(43, "/pickup-item"), { data: { droppedAssetId: "food-1" } }),
    ]);

    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const bags = [(await visitorInventory(world, 42)).bag, (await visitorInventory(world, 43)).bag];
    expect(bags.flat()).toEqual(["mango"]);
  });

  test("a double-click picks the item up once", async ({ request, world }) => {
    await seedGame(world, { assets: { "food-1": foodAsset("mango") }, latencyMs: 20 });

    const responses = await Promise.all([
      request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } }),
      request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } }),
    ]);

    expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(await visitorInventory(world)).toMatchObject({ quantities: { mango: 1 }, xp: 25 });
  });

  test("submitting the meal twice at once awards it once", async ({ request, world }) => {
    test.fail(true, "EXP-456: concurrent submits both pay out");
    await seedGame(world, { bag: MEAL, delays: { "/update-visitor-inventory-item-quantity": 300 } });

    const responses = await Promise.all([request.post(world.api("/submit-meal")), request.post(world.api("/submit-meal"))]);

    expect(responses.map((r) => r.status()).sort()).toEqual([200, 400]);
    expect((await visitorInventory(world)).xp).toBe(140);
    expect((await world.state()).dataObject.totalCompletionsToday).toBe(1);
  });

  test("spinning the wheel twice at once gives one buff", async ({ request, world }) => {
    test.fail(true, "EXP-456: concurrent spins both succeed");
    await seedGame(world, { delays: { "/visitors/42/update-data-object": 300 } });

    const responses = await Promise.all([request.post(world.api("/spin-wheel")), request.post(world.api("/spin-wheel"))]);

    expect(responses.map((r) => r.status()).sort()).toEqual([200, 400]);
  });

  test("pickups by two players at once both count in the world stats", async ({ request, world }) => {
    test.fail(true, "EXP-456: world stats read-modify-write loses counts");
    await seedGame(world, {
      otherVisitors: { 43: { visitorData: playing() } },
      assets: { "food-1": foodAsset("mango"), "food-2": foodAsset("corn") },
      // Hold the world-stats write so both pickups read the stats before either writes them.
      delays: { [`PUT /api/v1/world/${world.urlSlug}/update-data-object`]: 500 },
    });

    const responses = await Promise.all([
      request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } }),
      request.post(world.apiAs(43, "/pickup-item"), { data: { droppedAssetId: "food-2" } }),
    ]);

    expect(responses.map((r) => r.status())).toEqual([200, 200]);
    expect((await world.state()).dataObject.totalPickups).toBe(2);
  });
});

test.describe("item locks", () => {
  test("a pickup refused for a full bag doesn't block the item for other players", async ({ request, world }) => {
    test.fail(true, "EXP-456: refused pickup keeps the item lock");
    await seedGame(world, { bag: FULL, otherVisitors: { 43: { visitorData: playing() } }, assets: { "food-1": foodAsset("granola-bar") } });

    const refused = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });
    expect(refused.status()).toBe(400);

    const other = await request.post(world.apiAs(43, "/pickup-item"), { data: { droppedAssetId: "food-1" } });
    expect(other.status()).toBe(200);
  });

  test("a pickup refused for a duplicate doesn't block the item for other players", async ({ request, world }) => {
    test.fail(true, "EXP-456: refused pickup keeps the item lock");
    await seedGame(world, { bag: ["mango"], otherVisitors: { 43: { visitorData: playing() } }, assets: { "food-1": foodAsset("mango") } });

    const refused = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });
    expect(refused.status()).toBe(400);

    const other = await request.post(world.apiAs(43, "/pickup-item"), { data: { droppedAssetId: "food-1" } });
    expect(other.status()).toBe(200);
  });

  test("a swap refused for an item not in the bag doesn't block the item", async ({ request, world }) => {
    test.fail(true, "EXP-456: refused swap keeps the item lock");
    await seedGame(world, { bag: FULL, assets: { "food-1": foodAsset("granola-bar") } });

    const refused = await request.post(world.api("/swap-item"), { data: { dropItemId: "popcorn", pickupDroppedAssetId: "food-1" } });
    expect(refused.status()).toBe(400);

    const retry = await request.post(world.api("/swap-item"), { data: { dropItemId: "mango", pickupDroppedAssetId: "food-1" } });
    expect(retry.status()).toBe(200);
  });
});

test.describe("failures", () => {
  test("picking up an item that's already gone says so", async ({ request, world }) => {
    test.fail(true, "EXP-456: gone item answers 404 instead of 409");
    await seedGame(world);

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-gone" } });

    expect(response.status()).toBe(409);
    expect((await response.json()).message).toBe("This item was already picked up");
  });

  test("if the item can't be removed from the world, the player doesn't keep it", async ({ request, world }) => {
    test.fail(true, "EXP-456: item and XP granted before the asset is deleted");
    await seedGame(world, {
      xp: 10,
      assets: { "food-1": foodAsset("mango") },
      failures: { [`DELETE /api/v1/world/${world.urlSlug}/assets/food-1`]: 404 },
    });

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });

    expect(response.status()).toBe(409);
    expect(await visitorInventory(world)).toMatchObject({ bag: [], xp: 10 });
  });
});

test.describe("leaderboard", () => {
  test("a display name with | can't forge meals or streak", async ({ request, world }) => {
    test.fail(true, "EXP-456: name|meals|streak leaderboard forgery");
    await seedGame(world, { bag: MEAL });
    const forged = await forgeDisplayName(world, [999, 99]);

    await request.post(world.api("/submit-meal", forged));

    const board = await (await request.get(world.api("/game-state"))).json();
    const row = board.leaderboard.find((r: any) => r.profileId === world.profileId);
    expect(row).toMatchObject({ totalMealsCompleted: 1, longestStreak: 1 });
  });
});

test("dropped items keep their place in the world for others", async ({ request, world }) => {
  await seedGame(world, { bag: ["mango"], otherVisitors: { 43: { visitorData: playing() } } });

  await request.post(world.api("/drop-item"), { data: { itemId: "mango" } });
  const [dropped] = await foodInWorld(world);
  const response = await request.post(world.apiAs(43, "/pickup-item"), { data: { droppedAssetId: dropped.id } });

  expect(response.status()).toBe(200);
  expect((await visitorInventory(world, 43)).bag).toEqual(["mango"]);
});
