# Lunch Swap

A daily nutrition-themed collection game built with the Topia SDK. Each day, visitors receive a randomized "ideal meal" and a brown bag of food items. They explore the world to pick up, drop, and swap items — trading with other players' leavings — to assemble the perfect meal before submitting it for a nutrition score.

## How It Works

1. **New Day** — Each visitor gets a daily ideal meal (5 items across food groups) and a brown bag of starting items. Yesterday's leftover bag items are auto-dropped into the world.
2. **Explore & Collect** — Walk near food items scattered in the world. Pick them up to add to your bag, or drop items you don't need for others to find.
3. **Swap** — When your bag is full, swap an item from your bag with one on the ground.
4. **Submit Meal** — Once your bag contains all 5 ideal meal items, submit for a nutrition score, XP, and streak bonuses.

## Key Features

### Visitor Features

- **Brown Bag** — Holds up to 8 items (3 after meal completion). Shows food group, rarity, and ideal meal matches.
- **Ideal Meal Tracker** — Displays the 5 target items with collected/uncollected status derived from inventory.
- **Nearby Items** — Polls for food items within proximity radius and displays them for pickup.
- **XP & Leveling** — Earn XP on every action (pickup, drop, swap, submit). XP is stored as an "Experience Points" inventory item. Level derived from XP thresholds.
- **Streaks** — Complete meals on consecutive days to build a streak and earn bonus XP.
- **Nutrition Score** — Meal submissions are scored 0–100 based on protein, fiber, vitamin diversity, and balance.
- **Super Combos** — Certain item pairs trigger bonus XP when both are in your bag at submission.
- **Hot Streak** — Pick up 3 consecutive ideal meal matches to activate a 3x XP multiplier on the next pickup.
- **Mystery Items** — Some spawned items appear as mystery items, revealed on pickup.

### Admin Features

- **Stats Dashboard** — View world-wide pickup/drop/submission counts and daily activity.
- **Remove All Items** — Clear all food items from the world.
- **Spawn Items** — Manually spawn food items into the world.

### Rarity System

| Rarity    | XP Multiplier |
| --------- | ------------- |
| Common    | 1.0x          |
| Uncommon  | 1.5x          |
| Rare      | 2.0x          |
| Epic      | 3.0x          |
| Legendary | 5.0x          |

## API Endpoints

### Game

| Method | Path            | Description                                            |
| ------ | --------------- | ------------------------------------------------------ |
| `GET`  | `/game-state`   | Fetch visitor's game state, bag, ideal meal, XP, level |
| `GET`  | `/nearby-items` | Get food items near the visitor                        |
| `POST` | `/pickup-item`  | Pick up a dropped food item                            |
| `POST` | `/drop-item`    | Drop a food item from bag into world                   |
| `POST` | `/swap-item`    | Drop one item, pick up another atomically              |
| `POST` | `/submit-meal`  | Submit completed meal for scoring                      |
| `POST` | `/spin-wheel`   | Spin the bonus wheel for a daily buff                  |

### Admin

| Method | Path                      | Description                      |
| ------ | ------------------------- | -------------------------------- |
| `POST` | `/admin/remove-all-items` | Remove all food items from world |
| `POST` | `/admin/spawn-items`      | Spawn food items into world      |
| `GET`  | `/admin/stats`            | Get world activity stats         |

## Data Objects

### Visitor

Stores daily game progress, streak data, and stats. XP is tracked via the "Experience Points" inventory item, not the data object.

```ts
{
  lastPlayedDate: string;
  idealMeal: IdealMealItem[];
  completedToday: boolean;
  pickupsToday: number;
  dropsToday: number;
  currentStreak: number;
  longestStreak: number;
  // ... see shared/types/DataObjects.ts for full shape
}
```

### World

Tracks global stats and daily spawn tracking per player.

```ts
{
  currentDate: string;
  totalStartsToday: number;
  totalCompletionsToday: number;
  totalPickups: number;
  totalDrops: number;
}
```

### Key Asset

Stores app identity and initialization status.

```ts
{
  appVersion: number;
  appName: "lunch-swap";
  initialized: boolean;
}
```

## Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### Getting Started

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Start development
npm run dev
```

### Environment Variables

Create a `.env` file:

```
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
INTERACTIVE_KEY=your_interactive_key
INTERACTIVE_SECRET=your_interactive_secret
```

Find your keys at the [Topia Developer Dashboard](https://topia.io/t/dashboard/integrations).

### Project Structure

```
sdk-lunch-swap/
├── client/src/
│   ├── components/     # React UI components
│   ├── context/        # Global state (reducer, types)
│   ├── pages/          # Route pages (Home, Error)
│   └── utils/          # Client utilities (backendAPI)
├── server/
│   ├── controllers/    # Route handlers
│   │   └── admin/      # Admin-only controllers
│   ├── utils/          # Server utilities (inventory, game logic)
│   │   ├── droppedAssets/  # Asset management
│   │   └── gameLogic/      # Meal generation, nutrition, combos
│   └── tests/          # Jest test suite
└── shared/
    ├── data/           # XP config, super combos, wheel buffs
    └── types/          # Shared TypeScript interfaces
```

### Helpful Links

- [SDK Developer Docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [Topia Developer Dashboard](https://topia.io/t/dashboard/integrations)
