export interface WheelBuff {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export const WHEEL_BUFFS: WheelBuff[] = [
  { id: "big-bag", name: "Big Bag", description: "+2 bag slots for today!", weight: 30 },
  { id: "combo-finder", name: "Combo Finder", description: "Super combo pairs glow nearby!", weight: 30 },
  { id: "epic-drop", name: "Epic Drop", description: "A random epic item appears in your bag!", weight: 20 },
  { id: "double-xp", name: "Double XP", description: "All XP earned today is 2x!", weight: 10 },
  {
    id: "target-item",
    name: "Matching Item",
    description: "One bag item upgraded to match your Perfect Lunch!",
    weight: 10,
  },
];

export function spinWheel(): WheelBuff {
  const totalWeight = WHEEL_BUFFS.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const buff of WHEEL_BUFFS) {
    roll -= buff.weight;
    if (roll <= 0) return buff;
  }
  return WHEEL_BUFFS[0];
}
