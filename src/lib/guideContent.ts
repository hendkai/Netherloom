import type { ViewId } from "../state/ObservatoryProvider";

export interface GuideSection {
  id: string;
  category: "core" | "combat" | "progression" | "economy" | "meta" | "i2p";
  icon: string;
  accent: string;
  title: string;
  shortTitle: string;
  blurb: string;
  body: string[];
  tips?: string[];
  goto?: ViewId;
}

export const GUIDE_CATEGORIES: { id: GuideSection["category"]; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "combat", label: "Combat" },
  { id: "progression", label: "Progression" },
  { id: "economy", label: "Economy" },
  { id: "meta", label: "Meta" },
  { id: "i2p", label: "I2P" },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    category: "core",
    icon: "✨",
    accent: "#43dd85",
    title: "Welcome to Netherloom",
    shortTitle: "Welcome",
    blurb: "Your I2P router powers a living pixel companion.",
    body: [
      "Netherloom turns your I2P router's real activity — tunnels carried, bandwidth shared, peers known, uptime — into progression for a pixel companion.",
      "The more your router contributes, the faster your pet earns XP. Disconnect and progress freezes (but care stats keep ticking).",
      "There is no payment, no account, no remote server. Everything lives in your browser storage, per save slot.",
    ],
    tips: [
      "Pick a save slot to begin — three separate journeys are supported.",
      "You can play fully offline; live router data unlocks the Network Support bonus.",
    ],
    goto: "Observatory",
  },
  {
    id: "care",
    category: "core",
    icon: "🐾",
    accent: "#ff6fae",
    title: "Pet Care (Tamagotchi)",
    shortTitle: "Care",
    blurb: "Hunger, cleanliness, fun, and bond — keep them up or XP suffers.",
    body: [
      "Four care stats decay in real time, even when the router is disconnected:",
      "Hunger (gets hungry), Cleanliness (gets dirty), Fun (gets bored), and Bond (grows slowly).",
      "Care status feeds back into XP — a thriving pet earns up to +25% bonus XP, a neglected pet loses up to -54%.",
      "Use care items as ammo, or activate Auto-Care in Settings to auto-use them at thresholds you choose.",
    ],
    tips: [
      "Buy food / soap / toys in the Shop and they appear as chips in the Creature view.",
      "Click the action buttons for free fallbacks (small effect, cooldown-gated).",
      "Auto-Care uses the most expensive item you own first (best effect).",
    ],
    goto: "Creature",
  },
  {
    id: "expeditions",
    category: "progression",
    icon: "🧭",
    accent: "#7a5aff",
    title: "Expeditions",
    shortTitle: "Expeditions",
    blurb: "Send your pet on timed missions for coins, XP, and care items.",
    body: [
      "Six expeditions of increasing duration and reward. Only one runs at a time per pet, completing in real wall-clock time.",
      "Rush with coins to finish instantly. Care items can drop on completion, with a chance of bonus coins.",
      "Higher-level expeditions pay significantly better — unlock them by leveling up your pet.",
    ],
    tips: [
      "Tunnel Sweep (5m) is the daily go-to for quick coins.",
      "Router Pilgrimage (12h) is the endgame grind.",
      "Defeat the corresponding boss to discover hidden eepsites for even better loot.",
    ],
    goto: "Expeditions",
  },
  {
    id: "eepsites",
    category: "progression",
    icon: "🌐",
    accent: "#57c7ff",
    title: "Eepsite Exploration",
    shortTitle: "Eepsites",
    blurb: "I2P hidden services with higher risk and reward.",
    body: [
      "Eepsites are I2P's hidden services, repurposed as high-yield visits. Eight are available, four open from the start.",
      "The other four are hidden as '???.i2p' — defeat the boss shown in the hint to reveal the host.",
      "Each eepsite has a unique drop pool. Endgame eepsites drop Royal Feast and Golden Bell Toys.",
    ],
    tips: [
      "An eepsite visit and an expedition can run in parallel.",
      "Defeating a boss for the first time auto-discovers the related eepsite and pushes an Activity entry.",
    ],
    goto: "Eepsites",
  },
  {
    id: "bosses",
    category: "combat",
    icon: "💀",
    accent: "#ff5b6e",
    title: "World Bosses (Auto-Combat)",
    shortTitle: "Bosses",
    blurb: "Huge HP-pool threats. Auto-attacked every 3 seconds.",
    body: [
      "Six bosses of escalating difficulty. Your pet auto-attacks the active boss every 3 seconds — no clicking required.",
      "Damage scales with level, gear score, evolution path, and Network Support (live router up to +50%).",
      "Burn care items as ammo for instant burst damage (no cooldown). Item damage = cost × 0.5.",
      "Defeat a boss to unlock the next one and gain big rewards. Defeated bosses revive tougher (NG+ multiplier).",
    ],
    tips: [
      "Switch targets freely — auto-attack follows the active boss.",
      "Bosses with an eepsite discovery on defeat are highlighted in the Atlas.",
      "Offline progress covers up to 1 hour of auto-attacks while you're away.",
    ],
    goto: "Bosses",
  },
  {
    id: "evolution",
    category: "progression",
    icon: "🔮",
    accent: "#b280ff",
    title: "Evolution Paths",
    shortTitle: "Evolution",
    blurb: "At level 15, choose one of three permanent paths.",
    body: [
      "Guardian — defensive. Stage names Adept → Guardian → Ancient. +3 Energy Floor.",
      "Sorcerer — mystical. Stage names Initiate → Sorcerer → Archmage. +5% XP.",
      "Ranger — agile. Stage names Scout → Ranger → Pathfinder. +10% Coins.",
      "The choice is permanent per pet. Different save slots or pets can pick differently.",
    ],
    tips: [
      "A modal appears automatically at level 15. You can defer it via 'Decide later'.",
      "Evolution bonuses apply to expedition rewards, boss click damage, and XP accrual.",
    ],
    goto: "Creature",
  },
  {
    id: "shop",
    category: "economy",
    icon: "🛒",
    accent: "#ffd36a",
    title: "Shop, Gear, and Care Items",
    shortTitle: "Shop",
    blurb: "Buy once, equip forever. Stat comparison included.",
    body: [
      "64 gear items across four slots (Head, Neck, Charm, Aura) and five rarities (Common → Legendary).",
      "Gear gives bonuses to XP, data sharing, energy floor, or achievement coins. Set bonuses for matched rarities.",
      "Each pet has its own loadout — moving an item to another pet unequips it from the previous one.",
      "Care items (food, soap, toys) are consumables. Use them for care or burn them as boss ammo.",
      "Stat comparison chips on each shop card show the delta vs your currently equipped item.",
    ],
    tips: [
      "Upgrade items with coins for +15% effect per level (max +5).",
      "Sell unwanted gear for 40% of cost.",
      "Higher rarity = exponentially more expensive, but stronger.",
    ],
    goto: "Shop",
  },
  {
    id: "skills",
    category: "progression",
    icon: "🌳",
    accent: "#43dd85",
    title: "Living Atlas Skill Tree",
    shortTitle: "Skills",
    blurb: "75 nodes across five branches. Spend skill points earned per level.",
    body: [
      "Five branches: Resonance (XP), Conduit (data shared), Vitality (energy/mood), Discovery (peers), Stewardship (coins).",
      "Each branch has a keystone locked behind an achievement gate — read the requirements.",
      "Respec any time for free, but you'll lose progress on the current branch layout.",
    ],
    tips: [
      "Skill points are awarded every level based on unlocked resonance nodes.",
      "Keystones can be game-changers — plan your path toward them.",
    ],
    goto: "Skills",
  },
  {
    id: "achievements",
    category: "meta",
    icon: "🏆",
    accent: "#ffd36a",
    title: "Achievements",
    shortTitle: "Achievements",
    blurb: "108 goals across 10 categories. Each grants coins.",
    body: [
      "Achievements cover router activity (tunnels, bandwidth, peers, uptime), progression, skills, economy, gear, and pet collection.",
      "Every achievement grants coins. Aura gear and the Stewardship skill tree can boost coin rewards.",
      "Use the category filter to focus on what's next.",
    ],
    tips: [
      "Achievements are the main long-term coin source.",
      "Some skill-tree keystones require specific achievements — check the requirements.",
    ],
    goto: "Achievements",
  },
  {
    id: "activity",
    category: "meta",
    icon: "📜",
    accent: "#7a5aff",
    title: "Activity Log & Offline Progress",
    shortTitle: "Activity",
    blurb: "Durable log of events. Welcome-back summary when away.",
    body: [
      "The Activity log records boss kills, expedition completions, eepsite visits, level-ups, evolutions, and discoveries.",
      "Filter by category, clear at any time. Capped at 200 entries to keep storage lean.",
      "When you come back after being away for more than a minute, a Welcome-Back modal summarizes what happened.",
      "Offline progress: expeditions and eepsites that finished while away are auto-claimed. Boss auto-attack damage is extrapolated for up to 1 hour.",
    ],
    tips: [
      "Care stats decay during offline time too.",
      "If you close the tab during a boss fight, the next session picks up where you left off.",
    ],
    goto: "Activity",
  },
  {
    id: "next-actions",
    category: "meta",
    icon: "💡",
    accent: "#ffd36a",
    title: "'What next?' Helper",
    shortTitle: "What next?",
    blurb: "Dynamic suggestions on the Observatory dashboard.",
    body: [
      "The Observatory view shows up to three suggested next actions based on your current state.",
      "Suggestions prioritize: evolution choice, boss-low-HP finishes, ready-to-claim expeditions/eepsites, low care stats, affordable care items.",
      "Click a suggestion to jump straight to the relevant view.",
    ],
    tips: [
      "If the helper shows nothing urgent, you're free to grind whatever you enjoy.",
      "Suggestions update live as your state changes.",
    ],
    goto: "Observatory",
  },
  {
    id: "i2p",
    category: "i2p",
    icon: "🛡",
    accent: "#57c7ff",
    title: "I2P Integration",
    shortTitle: "I2P",
    blurb: "Live router data via I2PControl. Bonus XP and Network Support.",
    body: [
      "Connect I2PControl in Settings to enable live data polling. The plugin proxies JSON-RPC to your local router.",
      "Live data unlocks: XP accrual from real router contribution, Network Support damage multiplier (up to +50%), peer creatures on the Observatory canvas.",
      "Without a router, the game is fully playable but XP gain is frozen and Network Support is 1.0.",
    ],
    tips: [
      "Enable I2PControl at http://127.0.0.1:7657/configwebapps (Start the jsonrpc webapp).",
      "Set a password at http://127.0.0.1:7657/jsonrpc/ — default is 'itoopie' until changed.",
      "Your password is sent only to the local plugin proxy, never to a remote server.",
    ],
    goto: "Settings",
  },
];

export const GUIDE_BY_ID = new Map(GUIDE_SECTIONS.map((s) => [s.id, s] as const));
