// The admin panel: world stats, drop radius settings, dropping and removing food items. Admin routes
// check Topia's isAdmin on the server.
import { expect, test } from "../../fixtures";
import { FOOD_IDS, KEY_ASSET, foodAsset, foodInWorld, seedGame } from "./lunch";

const ADMIN_ROUTES = [
  ["post", "/admin/remove-all-items", {}],
  ["post", "/admin/drop-items", { itemIds: ["apple"] }],
  ["get", "/admin/stats", undefined],
  ["post", "/admin/update-settings", { dropRadiusMin: 10 }],
] as const;

// The admin button is just an icon from the style CDN, which the tests block: serve a stand-in so the
// button has a size and can be clicked.
test.beforeEach(async ({ page }) => {
  await page.route("https://sdk-style.s3.amazonaws.com/icons/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>',
    }),
  );
});

test("players who aren't admins can't use the admin routes", async ({ request, world }) => {
  await seedGame(world, { isAdmin: false, assets: { "food-1": foodAsset("apple") } });

  for (const [method, path, data] of ADMIN_ROUTES) {
    const response = await request[method](world.api(path), { data });
    expect(response.status(), path).toBe(403);
    expect((await response.json()).message).toBe("Admin access required");
  }
  expect((await foodInWorld(world)).map((f) => f.id)).toEqual(["food-1"]);
  expect((await world.state()).dataObject.dropRadiusMin).toBeUndefined();
});

test("only admins see the admin button", async ({ page, world }) => {
  await seedGame(world, { isAdmin: false });
  await page.goto(world.url("/"));
  await expect(page.getByText("Today's Perfect Lunch")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open admin settings" })).toHaveCount(0);

  await seedGame(world, { isAdmin: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Open admin settings" })).toBeVisible();
});

test("shows the world's stats", async ({ page, world }) => {
  await seedGame(world, {
    isAdmin: true,
    worldData: { totalStartsToday: 7, totalCompletionsToday: 3, totalPickups: 41, totalDrops: 12 },
  });
  await page.goto(world.url("/"));

  await page.getByRole("button", { name: "Open admin settings" }).click();

  const stats = page.getByRole("region", { name: "Game statistics" });
  await expect(stats.getByLabel("Players Today: 7")).toBeVisible();
  await expect(stats.getByLabel("Completions Today: 3")).toBeVisible();
  await expect(stats.getByLabel("Total Pickups: 41")).toBeVisible();
  await expect(stats.getByLabel("Total Drops: 12")).toBeVisible();
});

test("saves the drop radius", async ({ page, world }) => {
  await seedGame(world, { isAdmin: true });
  await page.goto(world.url("/"));
  await page.getByRole("button", { name: "Open admin settings" }).click();

  await page.getByLabel("Drop Radius Min").fill("300");
  await page.getByLabel("Drop Radius Max").fill("900");
  await page.getByRole("button", { name: "Save Settings" }).click();

  await expect(page.getByRole("alert")).toHaveText("Settings saved.");
  expect((await world.state()).dataObject).toMatchObject({ dropRadiusMin: 300, dropRadiusMax: 900 });
  expect(await world.events("analytics")).toContainEqual(expect.objectContaining({ analyticName: "settingsUpdates" }));
});

test("rejects a drop radius out of range or with min above max", async ({ request, world }) => {
  await seedGame(world, { isAdmin: true, worldData: { dropRadiusMin: 100, dropRadiusMax: 500 } });

  for (const data of [{ dropRadiusMin: -1 }, { dropRadiusMax: 10001 }, { dropRadiusMin: "far" }, { dropRadiusMin: 600 }, {}]) {
    const response = await request.post(world.api("/admin/update-settings"), { data });
    expect(response.status(), JSON.stringify(data)).toBe(400);
  }
  expect((await world.state()).dataObject).toMatchObject({ dropRadiusMin: 100, dropRadiusMax: 500 });
});

test("drops the selected food items around the food truck", async ({ page, world }) => {
  await seedGame(world, { isAdmin: true, worldData: { dropRadiusMin: 100, dropRadiusMax: 400 } });
  await page.goto(world.url("/"));
  await page.getByRole("button", { name: "Open admin settings" }).click();

  await page.getByRole("button", { name: "Drop food items into the world" }).click();
  const list = page.getByRole("listbox", { name: "Food items in world" });
  await expect(list.getByRole("option")).toHaveCount(FOOD_IDS.length);
  await list.getByRole("option", { name: /Mango/ }).click();
  await list.getByRole("option", { name: /Corn/ }).click();
  await page.getByRole("button", { name: "Drop 2 selected items" }).click();

  await expect(page.getByText("Dropped 2 items.")).toBeVisible();
  const dropped = await foodInWorld(world);
  expect(dropped.map((f) => f.itemId).sort()).toEqual(["corn", "mango"]);
  for (const { asset } of dropped) {
    // Between dropRadiusMin and dropRadiusMax / 2 from the truck.
    const distance = Math.hypot(asset.position.x - KEY_ASSET.position.x, asset.position.y - KEY_ASSET.position.y);
    expect(distance).toBeGreaterThanOrEqual(99);
    expect(distance).toBeLessThanOrEqual(201);
  }
  await expect(list).toHaveCount(0);
  await page.getByRole("button", { name: "Drop food items into the world" }).click();
  await expect(list.getByRole("option", { name: /Mango/ })).toContainText("1 in world");
});

test("random drops pick different food items", async ({ request, world }) => {
  await seedGame(world, { isAdmin: true });

  const body = await (await request.post(world.api("/admin/drop-items"), { data: { count: 10 } })).json();

  expect(body.droppedCount).toBe(10);
  const ids = (await foodInWorld(world)).map((f) => f.itemId);
  expect(new Set(ids).size).toBe(10);
});

test("remove all deletes only Lunch Swap food items", async ({ page, world }) => {
  await seedGame(world, {
    isAdmin: true,
    assets: {
      "food-1": foodAsset("apple"),
      "food-2": foodAsset("corn", { mystery: true }),
      tree: { uniqueName: "tree", position: { x: 0, y: 0 } },
    },
  });
  await page.goto(world.url("/"));
  await page.getByRole("button", { name: "Open admin settings" }).click();

  await page.getByRole("button", { name: "Remove all food items from the world" }).click();
  await page.getByRole("button", { name: "Yes, confirm" }).click();

  await expect(page.getByText("Removed 2 items.")).toBeVisible();
  const { assets } = await world.state();
  expect(Object.keys(assets).sort()).toEqual([world.assetId, "tree"].sort());
});
