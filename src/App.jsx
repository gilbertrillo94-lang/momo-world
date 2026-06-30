import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import FriendsScreen from "./friends/FriendsScreen";
import BubuPantry from "./games/BubuPantry";

const SAVE_KEY = "momo-save-v8";

const CHARACTER_FOLDER = {
  Momo: "momo",
  Bubu: "bubu",
  Kiki: "kiki",
  Lulu: "lulu",
  Riko: "riko",
  Nini: "nini",
};

const CHARACTER_PROFILE_IMAGES = {
  Momo: "/characters/profiles/momo.png",
  Bubu: "/characters/profiles/bubu.png",
  Kiki: "/characters/profiles/kiki.png",
  Lulu: "/characters/profiles/lulu.png",
  Riko: "/characters/profiles/riko.png",
  Nini: "/characters/profiles/nini.png",
};

function getCharacterSprite(momo, action, emotion, spriteFrame, currentTime) {
  const folder = CHARACTER_FOLDER[momo] || "momo";

  if (action === "sleeping" || isMomoSleepTime(currentTime)) {
    return `/characters/${folder}/sleeping.png`;
  }

  if (action === "full") return `/characters/${folder}/full.png`;
  if (action === "happy") return `/characters/${folder}/happy.png`;
  if (action === "angry") return `/characters/${folder}/angry.png`;

  if (["hungry", "messy", "lonely"].includes(emotion)) {
    return `/characters/${folder}/crying.png`;
  }

  if (action === "walking") {
    return spriteFrame === 0
      ? `/characters/${folder}/walking_1.png`
      : `/characters/${folder}/walking_2.png`;
  }

  return spriteFrame === 0
    ? `/characters/${folder}/idle_a.png`
    : `/characters/${folder}/idle_b.png`;
}

const MOMO_TYPES = {
  Momo: {
    name: "Momo",
    title: "The Optimist",
    emoji: "🌸",
    color: "#ff9ecf",
    blush: "#ffd1e6",
    trait: "cheerful, friendly, relationship-focused",
    favorite: "talk",
    voice: ["I'm happy you're here!", "Today feels wonderful.", "Let's make a happy memory!"],
    bonus: "Gains happiness slightly faster.",
  },
  Bubu: {
    name: "Bubu",
    title: "The Comfort Lover",
    emoji: "🐻",
    color: "#d9a66b",
    blush: "#f5c7a8",
    trait: "cozy, relaxed, comfort-loving",
    favorite: "feed",
    voice: ["Can we have a snack?", "This is so cozy.", "I could nap forever."],
    bonus: "Gets extra happiness from feeding.",
  },
  Kiki: {
    name: "Kiki",
    title: "The Adventurer",
    emoji: "⚡",
    color: "#ffd54a",
    blush: "#ffe58a",
    trait: "energetic, curious, adventurous",
    favorite: "play",
    voice: ["Let's go explore!", "What's over there?", "Adventure time!"],
    bonus: "Earns slightly more rewards from activities.",
  },
  Lulu: {
    name: "Lulu",
    title: "The Dreamer",
    emoji: "📚",
    color: "#b89cff",
    blush: "#d9c9ff",
    trait: "creative, thoughtful, sentimental",
    favorite: "capture",
    voice: ["I'll remember this forever.", "That feels magical.", "Let's save this memory."],
    bonus: "Stronger bond growth.",
  },
  Riko: {
    name: "Riko",
    title: "The Determined One",
    emoji: "🔥",
    color: "#ff7a59",
    blush: "#ffb3a3",
    trait: "ambitious, competitive, determined",
    favorite: "play",
    voice: ["Let's do our best!", "We can go even further.", "I'm not giving up!"],
    bonus: "Gains extra points from quests.",
  },
  Nini: {
    name: "Nini",
    title: "The Gentle Soul",
    emoji: "🌙",
    color: "#9bb7ff",
    blush: "#d6e2ff",
    trait: "kind, caring, emotionally aware",
    favorite: "talk",
    voice: ["I hope you're doing okay.", "I'm always here for you.", "Let's take things slowly."],
    bonus: "Bond decreases more slowly when neglected.",
  },
};

const QUIZ = [
  {
    q: "Your perfect weekend is...",
    a: [
      { text: "Spending time with friends", type: "Momo" },
      { text: "Eating and relaxing", type: "Bubu" },
      { text: "Going on an adventure", type: "Kiki" },
      { text: "Creating something meaningful", type: "Lulu" },
      { text: "Working toward a goal", type: "Riko" },
      { text: "Helping someone you care about", type: "Nini" },
    ],
  },
  {
    q: "People describe you as...",
    a: [
      { text: "Positive", type: "Momo" },
      { text: "Comforting", type: "Bubu" },
      { text: "Energetic", type: "Kiki" },
      { text: "Creative", type: "Lulu" },
      { text: "Determined", type: "Riko" },
      { text: "Gentle", type: "Nini" },
    ],
  },
  {
    q: "Choose a dream home.",
    a: [
      { text: "A lively neighborhood", type: "Momo" },
      { text: "A cozy cabin", type: "Bubu" },
      { text: "A treehouse", type: "Kiki" },
      { text: "A cottage filled with books", type: "Lulu" },
      { text: "A modern city loft", type: "Riko" },
      { text: "A peaceful garden home", type: "Nini" },
    ],
  },
  {
    q: "When you're stressed, you...",
    a: [
      { text: "Talk with someone", type: "Momo" },
      { text: "Take a nap", type: "Bubu" },
      { text: "Do something exciting", type: "Kiki" },
      { text: "Reflect quietly", type: "Lulu" },
      { text: "Push through it", type: "Riko" },
      { text: "Give yourself time to heal", type: "Nini" },
    ],
  },
  {
    q: "Pick a hobby.",
    a: [
      { text: "Hosting gatherings", type: "Momo" },
      { text: "Trying new food", type: "Bubu" },
      { text: "Exploring places", type: "Kiki" },
      { text: "Photography", type: "Lulu" },
      { text: "Fitness and goals", type: "Riko" },
      { text: "Gardening", type: "Nini" },
    ],
  },
  {
    q: "Your ideal superpower is...",
    a: [
      { text: "Making everyone smile", type: "Momo" },
      { text: "Creating endless snacks", type: "Bubu" },
      { text: "Teleporting anywhere", type: "Kiki" },
      { text: "Preserving memories forever", type: "Lulu" },
      { text: "Unlimited determination", type: "Riko" },
      { text: "Healing hearts", type: "Nini" },
    ],
  },
  {
    q: "What motivates you most?",
    a: [
      { text: "Relationships", type: "Momo" },
      { text: "Comfort", type: "Bubu" },
      { text: "Curiosity", type: "Kiki" },
      { text: "Meaning", type: "Lulu" },
      { text: "Achievement", type: "Riko" },
      { text: "Kindness", type: "Nini" },
    ],
  },
  {
    q: "Pick a weather.",
    a: [
      { text: "Sunny", type: "Momo" },
      { text: "Cozy rainy day", type: "Bubu" },
      { text: "Windy adventure weather", type: "Kiki" },
      { text: "Golden autumn evening", type: "Lulu" },
      { text: "Crisp morning air", type: "Riko" },
      { text: "Gentle snowfall", type: "Nini" },
    ],
  },
  {
    q: "Your friend needs help. You...",
    a: [
      { text: "Cheer them up", type: "Momo" },
      { text: "Bring comfort food", type: "Bubu" },
      { text: "Take them somewhere fun", type: "Kiki" },
      { text: "Listen carefully", type: "Lulu" },
      { text: "Help solve the problem", type: "Riko" },
      { text: "Stay beside them", type: "Nini" },
    ],
  },
  {
    q: "What kind of companion do you want?",
    a: [
      { text: "A cheerful best friend", type: "Momo" },
      { text: "A cozy cuddle buddy", type: "Bubu" },
      { text: "A little adventure partner", type: "Kiki" },
      { text: "A memory keeper", type: "Lulu" },
      { text: "A goal-chasing teammate", type: "Riko" },
      { text: "A gentle soul", type: "Nini" },
    ],
  },
];

const ROOMS = [
  {
    id: "livingroom",
    name: "Living Room",
    icon: "/assets/layouts/living-room.png",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    icon: "/assets/layouts/bedroom.png",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    icon: "/assets/layouts/kitchen.png",
  },
  {
    id: "garden",
    name: "Garden",
    icon: "/assets/layouts/garden.png",
  },
];

const ROOM_WANDER_LINES = {
  livingroom: [
    "is relaxing in the living room.",
    "curled up in the cozy living room.",
    "is looking around the living room.",
    "found a comfy spot in the living room.",
  ],
  bedroom: [
    "wandered into the bedroom.",
    "is getting sleepy in the bedroom.",
    "is resting quietly in the bedroom.",
    "found a soft little spot to relax.",
  ],
  kitchen: [
    "went to the kitchen for a tiny snack.",
    "is sniffing around the kitchen.",
    "is checking if there are treats nearby.",
    "wandered into the kitchen.",
  ],
  garden: [
    "went outside to the garden.",
    "is watching flowers in the garden.",
    "is enjoying the fresh garden air.",
    "found something cute in the garden.",
  ],
};

const GENERAL_THOUGHTS = [
  "I'm happy you're here.",
  "This place feels cozy today.",
  "I wonder what we'll do next.",
  "I like spending time with you.",
  "Today feels soft and peaceful.",
  "I saw something sparkly earlier.",
  "Do you think today will be lucky?",
  "I'm glad this is our little world.",
];

const MORNING_THOUGHTS = [
  "Good morning!",
  "Did you sleep well?",
  "The morning feels nice.",
  "Let's have a cozy day.",
];

const NIGHT_THOUGHTS = [
  "I'm getting sleepy...",
  "The world feels quiet tonight.",
  "Sweet dreams soon.",
  "The stars look pretty tonight.",
];

const HUNGRY_THOUGHTS = [
  "I could eat something...",
  "My tummy is rumbling.",
  "I wonder what's for snack time.",
];

function getRandomMomoThought(condition, currentTime) {
  const hour = currentTime.getHours();

  let pool = [...GENERAL_THOUGHTS];

  if (hour >= 6 && hour < 11) {
    pool = [...pool, ...MORNING_THOUGHTS];
  }

  if (hour >= 20 || hour < 6) {
    pool = [...pool, ...NIGHT_THOUGHTS];
  }

  if (condition.hunger < 35) {
    pool = [...pool, ...HUNGRY_THOUGHTS];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

const CASTLE_WEEKLY_REWARDS = [
  {
    label: "Castle Living Room",
    wallpaperId: "livingroom-castle",
    room: "livingroom",
    icon: "/assets/layouts/living-room.png",
  },
  {
    label: "Castle Bedroom",
    wallpaperId: "bedroom-castle",
    room: "bedroom",
    icon: "/assets/layouts/bedroom.png",
  },
  {
    label: "Castle Kitchen",
    wallpaperId: "kitchen-castle",
    room: "kitchen",
    icon: "/assets/layouts/kitchen.png",
  },
  {
    label: "Castle Garden",
    wallpaperId: "garden-castle",
    room: "garden",
    icon: "/assets/layouts/garden.png",
  },
];

function getDailyRewardsForStreak(streak) {
  const weekIndex = Math.floor(Math.max(0, streak - 1) / 7) % CASTLE_WEEKLY_REWARDS.length;
  const castleReward = CASTLE_WEEKLY_REWARDS[weekIndex];

  return DAILY_REWARDS.map((reward, index) =>
    index === 6
      ? {
          ...reward,
          icon: castleReward.icon,
          label: castleReward.label,
          wallpaperId: castleReward.wallpaperId,
          room: castleReward.room,
        }
      : reward
  );
}

const DAILY_REWARDS = [
  {
    day: "Day 1",
    icon: "/assets/foods/rice.png",
    label: "Rice Ball ×1",
    type: "food",
    foodId: "rice",
    amount: 1,
  },
  {
    day: "Day 2",
    icon: "/assets/foods/cookie.png",
    label: "Cookie ×1",
    type: "food",
    foodId: "cookie",
    amount: 1,
  },
  {
    day: "Day 3",
    icon: "/ui/top-bar/sparks.png",
    label: "+50 Sparks",
    type: "sparks",
    amount: 50,
  },
  {
    day: "Day 4",
    icon: "/assets/foods/strawberry.png",
    label: "Strawberry ×2",
    type: "food",
    foodId: "strawberry",
    amount: 2,
  },
  {
    day: "Day 5",
    icon: "/ui/top-bar/sparks.png",
    label: "+75 Sparks",
    type: "sparks",
    amount: 75,
  },
  {
    day: "Day 6",
    icon: "/assets/foods/noodles.png",
    label: "Noodles ×1",
    type: "food",
    foodId: "noodles",
    amount: 1,
  },
  {
    day: "Day 7",
    icon: "/assets/layouts/living-room.png",
    label: "Sakura Living Room",
    type: "wallpaper",
    wallpaperId: "livingroom-sakura",
    room: "livingroom",
  },
];

const WALLPAPERS = [
  {
  id: "livingroom-default",
  room: "livingroom",
  style: "default",
  name: "Default Living Room",
  icon: "/assets/layouts/living-room.png",
  price: 0,
},
{
  id: "bedroom-default",
  room: "bedroom",
  style: "default",
  name: "Default Bedroom",
  icon: "/assets/layouts/bedroom.png",
  price: 0,
},
{
  id: "kitchen-default",
  room: "kitchen",
  style: "default",
  name: "Default Kitchen",
  icon: "/assets/layouts/kitchen.png",
  price: 0,
},
{
  id: "garden-default",
  room: "garden",
  style: "default",
  name: "Default Garden",
  icon: "/assets/layouts/garden.png",
  price: 0,
},
  {
  id: "livingroom-sakura",
  room: "livingroom",
  style: "sakura",
  name: "Sakura Living Room",
  icon: "/assets/layouts/living-sakura.png",
  price: 500,
},
{
  id: "bedroom-sakura",
  room: "bedroom",
  style: "sakura",
  name: "Sakura Bedroom",
  icon: "/assets/layouts/bedroom-sakura.png",
  price: 500,
},

{
  id: "kitchen-sakura",
  room: "kitchen",
  style: "sakura",
  name: "Sakura Kitchen",
  icon: "/assets/layouts/kitchen-sakura.png",
  price: 500,
},

{
  id: "garden-sakura",
  room: "garden",
  style: "sakura",
  name: "Sakura Garden",
  icon: "/assets/layouts/garden-sakura.png",
  price: 500,
},
{
  id: "livingroom-ryokan",
  room: "livingroom",
  style: "ryokan",
  name: "Ryokan Living Room",
  icon: "/assets/layouts/livingroom-ryokan.png",
  price: 500,
},

{
  id: "bedroom-ryokan",
  room: "bedroom",
  style: "ryokan",
  name: "Ryokan Bedroom",
  icon: "/assets/layouts/bedroom-ryokan.png",
  price: 500,
},

{
  id: "kitchen-ryokan",
  room: "kitchen",
  style: "ryokan",
  name: "Ryokan Kitchen",
  icon: "/assets/layouts/kitchen-ryokan.png",
  price: 500,
},

{
  id: "garden-ryokan",
  room: "garden",
  style: "ryokan",
  name: "Ryokan Garden",
  icon: "/assets/layouts/garden-ryokan.png",
  price: 500,
},
{
  id: "livingroom-isekai",
  room: "livingroom",
  style: "isekai",
  name: "Isekai Living Room",
  icon: "/assets/layouts/livingroom-isekai.png",
  price: 500,
},

{
  id: "bedroom-isekai",
  room: "bedroom",
  style: "isekai",
  name: "Isekai Bedroom",
  icon: "/assets/layouts/bedroom-isekai.png",
  price: 500,
},

{
  id: "kitchen-isekai",
  room: "kitchen",
  style: "isekai",
  name: "Isekai Kitchen",
  icon: "/assets/layouts/kitchen-isekai.png",
  price: 500,
},

{
  id: "garden-isekai",
  room: "garden",
  style: "isekai",
  name: "Isekai Garden",
  icon: "/assets/layouts/garden-isekai.png",
  price: 500,
},
{
  id: "livingroom-ghibli",
  room: "livingroom",
  style: "ghibli",
  name: "Ghibli Living Room",
  icon: "/assets/layouts/livingroom-ghibli.png",
  price: 500,
},

{
  id: "bedroom-ghibli",
  room: "bedroom",
  style: "ghibli",
  name: "Ghibli Bedroom",
  icon: "/assets/layouts/bedroom-ghibli.png",
  price: 500,
},

{
  id: "kitchen-ghibli",
  room: "kitchen",
  style: "ghibli",
  name: "Ghibli Kitchen",
  icon: "/assets/layouts/kitchen-ghibli.png",
  price: 500,
},

{
  id: "garden-ghibli",
  room: "garden",
  style: "ghibli",
  name: "Ghibli Garden",
  icon: "/assets/layouts/garden-ghibli.png",
  price: 500,
},
{
  id: "livingroom-castle",
  room: "livingroom",
  style: "castle",
  name: "Castle Living Room",
  icon: "/assets/rooms/shop/livingroom-castle-morning.png",
  price: 0,
  hidden: true,
},

{
  id: "bedroom-castle",
  room: "bedroom",
  style: "castle",
  name: "Castle Bedroom",
  icon: "/assets/rooms/shop/bedroom-castle-morning.png",
  price: 0,
  hidden: true,
},

{
  id: "kitchen-castle",
  room: "kitchen",
  style: "castle",
  name: "Castle Kitchen",
  icon: "/assets/rooms/shop/kitchen-castle-morning.png",
  price: 0,
  hidden: true,
},

{
  id: "garden-castle",
  room: "garden",
  style: "castle",
  name: "Castle Garden",
  icon: "/assets/rooms/shop/garden-castle-morning.png",
  price: 0,
  hidden: true,
},
];

function getTimePeriod(date = new Date()) {
  const hour = date.getHours();

  return hour >= 6 && hour < 18
    ? "morning"
    : "night";
}

function getRoomImage(roomId, date = new Date()) {
  const time = getTimePeriod(date);

  return `/assets/rooms/${roomId}-${time}.png`;
}

const POSTCARD_THEMES = [
  {
    id: "sakura",
    name: "Sakura",
    image: "/postcards/sakura.png",
  },
  {
    id: "moonlight",
    name: "Moonlight",
    image: "/postcards/moonlight.png",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    image: "/postcards/strawberry.png",
  },
  {
    id: "cloud",
    name: "Cloud",
    image: "/postcards/cloud.png",
  },
  {
    id: "forest",
    name: "Forest",
    image: "/postcards/forest.png",
  },
  {
    id: "starry-night",
    name: "Starry Night",
    image: "/postcards/starry-night.png",
  },
];

const FOODS = [
  {
    id: "rice",
    name: "Rice Ball",
    price: 10,
    icon: "/assets/foods/rice.png",
    boost: { hunger: 20, energy: 6, happiness: 4 },
    reaction: "Momo loved the rice ball!",
  },
  {
    id: "cookie",
    name: "Cookie",
    price: 12,
    icon: "/assets/foods/cookie.png",
    boost: { hunger: 10, happiness: 10, wonder: 2 },
    reaction: "Momo got cookie crumbs everywhere.",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    price: 8,
    icon: "/assets/foods/strawberry.png",
    boost: { hunger: 12, happiness: 8, cleanliness: 2 },
    reaction: "Momo says it tasted like sunshine.",
  },
  {
    id: "noodles",
    name: "Noodles",
    price: 18,
    icon: "/assets/foods/noodles.png",
    boost: { hunger: 24, energy: 5, happiness: 5 },
    reaction: "Momo slurped the noodles happily.",
  },
];



const START_CONDITION = {
  happiness: 72,
  energy: 70,
  curiosity: 64,
  connection: 58,
  wonder: 68,
  hunger: 70,
  cleanliness: 72,
};

const DISCOVERY_POOL = ["Tiny Flower 🌷", "Cloud Fluff ☁️", "Smooth Pebble 🪨", "Little Star ✨", "Mystery Seed 🌱", "Warm Feather 🪶", "Blue Shell 🐚"];

const QUESTS = [
  { id: "feed", text: "Feed Momo", reward: 12 },
  { id: "play", text: "Play together", reward: 12 },
  { id: "talk", text: "Talk with Momo", reward: 12 },
  { id: "capture", text: "Capture a tiny moment", reward: 15 },
  { id: "visitGarden", text: "Visit the garden", reward: 10 },
  { id: "miniGame", text: "Play Star Catch", reward: 18 },
];

const ACHIEVEMENTS = [
  { id: "firstMemory", name: "First Memory", icon: "📖", check: (s) => s.memories.length >= 1 },
  { id: "firstDiscovery", name: "First Discovery", icon: "🔎", check: (s) => s.discoveries.length >= 1 },
  { id: "firstPurchase", name: "First Purchase", icon: "🛍️", check: (s) => (s.foodBag?.length || 0) >= 1 },
  { id: "closeFriend", name: "Close Friend", icon: "💛", check: (s) => s.bondPoints >= 60 },
  { id: "collector", name: "Tiny Collector", icon: "✨", check: (s) => s.discoveries.length >= 5 },
 {
  id: "foodie",
  name: "Food Collector",
  icon: "🍙",
  check: (s) => s.foodBag.length >= 5,
},
  { id: "streak3", name: "3-Day Visitor", icon: "🔥", check: (s) => s.streak >= 3 },
  { id: "starCatcher", name: "Star Catcher", icon: "⭐", check: (s) => s.miniGameHighScore >= 10 },
];

const AUTONOMOUS_ACTIVITIES = [
  { action: "flower", text: "Smelling flowers", thought: "This flower smells tiny.", room: "garden", pose: "looking" },
  { action: "cloud", text: "Watching clouds", thought: "That cloud looks like a snack.", room: "sky", pose: "looking" },
  { action: "tree", text: "Sitting by the tree", thought: "This shade feels cozy.", room: "garden", pose: "sitting" },
  { action: "sparkle", text: "Chasing sparkles", thought: "Almost caught it!", room: "sky", pose: "exploring" },
  { action: "nap", text: "Taking a tiny nap", thought: "Zzz...", room: "bedroom", pose: "sleepy" },
  { action: "sniff", text: "Looking for snacks", thought: "Something smells yummy.", room: "kitchen", pose: "happy" },
];

const MEMORY_CARDS = [
  { id: "moon", name: "Moon", src: "/assets/memory-match/moon.png" },
  { id: "star", name: "Star", src: "/assets/memory-match/star.png" },
  { id: "sparkle", name: "Sparkle", src: "/assets/memory-match/sparkle.png" },
  { id: "cloud", name: "Cloud", src: "/assets/memory-match/cloud.png" },
  { id: "butterfly", name: "Butterfly", src: "/assets/memory-match/butterfly.png" },
  { id: "book", name: "Book", src: "/assets/memory-match/book.png" },
  { id: "lantern", name: "Lantern", src: "/assets/memory-match/lantern.png" },
  { id: "flower", name: "Flower", src: "/assets/memory-match/flower.png" },
  { id: "fairy", name: "Fairy", src: "/assets/memory-match/fairy.png" },
  { id: "heart", name: "Heart", src: "/assets/memory-match/heart.png" },
];

function getMemoryPreviewTime(level) {
  return Math.max(2500, 7000 - level * 1000);
}

const DREAM_SIZE = 6;
const DREAM_ICONS = [
  { type: "moon", src: "/assets/dream-match/lulu.png" },
  { type: "star", src: "/assets/dream-match/kiki.png" },
  { type: "cloud", src: "/assets/dream-match/nini.png" },
  { type: "book", src: "/assets/dream-match/bubu.png" },
  { type: "butterfly", src: "/assets/dream-match/riko.png" },
  { type: "sparkle", src: "/assets/dream-match/momo.png" },
];

const LOADING_TIPS = [
  "/loading/tip-new-adventure.png",
  "/loading/tip-build-world.png",
  "/loading/tip-take-break.png",
];

const SWEET_DESSERTS = [
  { id: "cake-base", src: "/assets/sweet-stack/cake-base.png" },
  { id: "brownie", src: "/assets/sweet-stack/brownie.png" },
  { id: "swiss-roll", src: "/assets/sweet-stack/swiss-roll.png" },
  { id: "cream-puff", src: "/assets/sweet-stack/cream-puff.png" },
  { id: "peach-tart", src: "/assets/sweet-stack/peach-tart.png" },
  { id: "cupcake", src: "/assets/sweet-stack/cupcake.png" },
  { id: "blueberry-macaron", src: "/assets/sweet-stack/blueberry-macaron.png" },
  { id: "pink-donut", src: "/assets/sweet-stack/pink-donut.png" },
  { id: "cookie", src: "/assets/sweet-stack/cookie.png" },
  { id: "pink-macaron", src: "/assets/sweet-stack/pink-macaron.png" },
];

function createDreamBoard() {
  return Array.from({ length: DREAM_SIZE * DREAM_SIZE }, (_, index) => ({
    id: `${Date.now()}-${index}-${Math.random()}`,
    icon: DREAM_ICONS[Math.floor(Math.random() * DREAM_ICONS.length)],
  }));
}

function getDreamIndex(row, col) {
  return row * DREAM_SIZE + col;
}

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

function todayKey() {
  return new Date().toDateString();
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

function getDayPhase() {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function isMomoSleepTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

function getSeasonalNote() {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();

  if (month === 12) return "Winter sparkles are falling.";
  if (month === 10) return "Momo feels a spooky breeze.";
  if (month === 2 && day === 14) return "Momo found a tiny heart.";
  if (month >= 3 && month <= 5) return "Spring flowers are waking up.";
  if (month >= 6 && month <= 8) return "The world feels sunny and bright.";
  if (month >= 9 && month <= 11) return "Leaves are dancing around.";
  return "Today feels soft.";
}

function getBondTitle(points) {
  if (points >= 10000) return "Soulmate 💖";
  if (points >= 7000) return "Best Friend ❤️";
  if (points >= 4000) return "Close Friend 🧡";
  if (points >= 2000) return "Friend 💛";
  if (points >= 750) return "Buddy 💚";
  if (points >= 250) return "Acquaintance 🤍";
  return "Getting to Know You 🌱";
}

function applyAwayDecay(condition, lastSeen) {
  if (!lastSeen) return condition;
  const hoursAway = Math.min(24, Math.floor((Date.now() - lastSeen) / 1000 / 60 / 60));
  if (hoursAway <= 0) return condition;

  return {
    ...condition,
    happiness: Math.max(15, condition.happiness - hoursAway * 2),
    energy: Math.max(10, condition.energy - hoursAway),
    connection: Math.max(10, condition.connection - hoursAway * 2),
    hunger: Math.max(5, condition.hunger - hoursAway * 4),
    cleanliness: Math.max(10, condition.cleanliness - hoursAway * 2),
    curiosity: Math.max(10, condition.curiosity - hoursAway),
  };
}

function getEmotion(condition) {
  if (condition.hunger < 28) return "hungry";
  if (condition.cleanliness < 35) return "messy";
  if (condition.energy < 28) return "sleepy";
  if (condition.connection < 32) return "lonely";
  if (condition.happiness > 82) return "happy";
  if (condition.curiosity > 78) return "curious";
  return "calm";
}

function createFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return `MOMO-${code}`;
}

export default function App() {
  const saved = loadSave();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTip] = useState(
  () => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
);
  const [transitionLoading, setTransitionLoading] = useState(null); 
  const [screen, setScreen] = useState(saved?.momo ? "home" : "front");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [showArcade, setShowArcade] = useState(false);
  const [previewWallpaper, setPreviewWallpaper] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [trailScore, setTrailScore] = useState(0);
  const [trailLane, setTrailLane] = useState(1);
  const [trailItems, setTrailItems] = useState([]);
  const [trailGameOver, setTrailGameOver] = useState(false);
  const [trailBest, setTrailBest] = useState(saved?.trailBest || 0);



  const [trailTouchStart, setTrailTouchStart] = useState(null);
  const [dreamBoard, setDreamBoard] = useState(() => createDreamBoard());
  const [dreamChain, setDreamChain] = useState([]);
  const [dreamDragging, setDreamDragging] = useState(false);
  const [dreamScore, setDreamScore] = useState(0);
  const [dreamLevel, setDreamLevel] = useState(
    saved?.dreamLevel || 1
  );
  const dreamGoal = 1500 + (dreamLevel - 1) * 700;
  const [dreamMoves, setDreamMoves] = useState(15);
  const [dreamWon, setDreamWon] = useState(false);
  const [dreamGameOver, setDreamGameOver] = useState(false);
  const [dreamRewardClaimed, setDreamRewardClaimed] = useState(false);
  const [dreamBest, setDreamBest] = useState(saved?.dreamBest || 0);
  const [dreamMessage, setDreamMessage] = useState("Connect matching Momo friends!");
  const [slotResult, setSlotResult] = useState(null);
  const [sweetLevel, setSweetLevel] = useState(saved?.sweetLevel || 1);
  const [sweetScore, setSweetScore] = useState(0);
  const [sweetBest, setSweetBest] = useState(saved?.sweetBest || 0);
  const bubuProgress = JSON.parse(localStorage.getItem("momo_bubu_progress") || "{}");
  const bubuLevel = Number(localStorage.getItem("momo_bubu_level") || 1);
  const bubuLevelBest = bubuProgress[bubuLevel];

  const bubuBest = bubuLevelBest
  ? `${"⭐".repeat(bubuLevelBest.stars)} ${bubuLevelBest.moves} moves`
  : "--";
  const [sweetAttempt, setSweetAttempt] = useState(0);
  const [sweetStack, setSweetStack] = useState([SWEET_DESSERTS[0]]);
  const [sweetX, setSweetX] = useState(50);
  const [sweetDirection, setSweetDirection] = useState(1);
  const [sweetCombo, setSweetCombo] = useState(0);
  const [sweetMessage, setSweetMessage] = useState("Tap when the dessert is centered!");
  const [sweetJudgement, setSweetJudgement] = useState("");
  const [sweetGameOver, setSweetGameOver] = useState(false);
  const [sweetWon, setSweetWon] = useState(false);
  const [sweetRewardClaimed, setSweetRewardClaimed] = useState(false);
  const [landingLayer, setLandingLayer] = useState(null);


  const sweetGoal = Math.min(1200, 600 + (sweetLevel - 1) * 250);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotReels, setSlotReels] = useState([
  { id: "moon", img: "/assets/slots/moon.png", payout: 1000 },
  { id: "star", img: "/assets/slots/star.png", payout: 50 },
  { id: "cloud", img: "/assets/slots/cloud.png", payout: 5 },
]);




  useEffect(() => {
  if (activeGame !== "star-trail") return;
  if (trailGameOver) return;

  const timer = setInterval(() => {
    setTrailItems((items) => {
      const moved = items
        .map((item) => ({
          ...item,
          y: item.y + item.speed,
        }))
        .filter((item) => item.y < 115);

      const reachedKiki = moved.find(
        (item) => item.y >= 78 && item.y <= 92 && item.lane === trailLane
      );

      if (reachedKiki) {
        if (reachedKiki.type === "star") {
          setTrailScore((score) => score + 5);
          return moved.filter((item) => item.id !== reachedKiki.id);
        }

        setTrailGameOver(true);
        setTrailBest((best) => Math.max(best, trailScore));
      }

      const hasTopItem = moved.some((item) => item.y < 18);
      const spawnChance = trailScore < 40 ? 0.18 : 0.26;

      if (!hasTopItem && Math.random() < spawnChance) {
        const roll = Math.random();

        moved.push({
          id: Date.now() + Math.random(),
          lane: Math.floor(Math.random() * 3),
          y: -8,
          type: roll < 0.25 ? "star" : roll < 0.7 ? "cloud" : "meteor",
          speed: 1.3 + Math.min(trailScore / 120, 2.2),
        });
      }

      return moved;
    });

    setTrailScore((score) => score + 1);
  }, 35);

  return () => clearInterval(timer);
}, [activeGame, trailGameOver, trailLane, trailScore]);

  const [quizIndex, setQuizIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [momo, setMomo] = useState(saved?.momo || null);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [customName, setCustomName] = useState(saved?.customName || "");
  const [customVibe, setCustomVibe] = useState(saved?.customVibe || "soft");
  const [nameInput, setNameInput] = useState(saved?.customName || "");
  const [vibeInput, setVibeInput] = useState(saved?.customVibe || "soft");
  const [sparks, setSparks] = useState(saved?.sparks ?? 75);
  const [condition, setCondition] = useState(() => applyAwayDecay(saved?.condition || START_CONDITION, saved?.lastSeen));
  const [memories, setMemories] = useState(saved?.memories || []);
  const [inventory, setInventory] = useState(
  saved?.foodBag || saved?.inventory || []
);

const foodBag = inventory;
const setFoodBag = setInventory;
  const [placedItems, setPlacedItems] = useState(saved?.placedItems || {});
  const [unlockedRooms, setUnlockedRooms] = useState(() => {
  const old = saved?.unlockedRooms;

  return {
    livingroom: old?.livingroom?.includes("livingroom-default") ? old.livingroom : ["livingroom-default"],
    bedroom: old?.bedroom?.includes("bedroom-default") ? old.bedroom : ["bedroom-default"],
    kitchen: old?.kitchen?.includes("kitchen-default") ? old.kitchen : ["kitchen-default"],
    garden: old?.garden?.includes("garden-default") ? old.garden : ["garden-default"],
  };
});

const [activeRooms, setActiveRooms] = useState(() => {
  const old = saved?.activeRooms || {};

  return {
    livingroom: old.livingroom?.includes("-") ? old.livingroom : "livingroom-default",
    bedroom: old.bedroom?.includes("-") ? old.bedroom : "bedroom-default",
    kitchen: old.kitchen?.includes("-") ? old.kitchen : "kitchen-default",
    garden: old.garden?.includes("-") ? old.garden : "garden-default",
  };
});
  const [discoveries, setDiscoveries] = useState(saved?.discoveries || []);
  const [diary, setDiary] = useState(saved?.diary || []);
  const [mailbox, setMailbox] = useState(saved?.mailbox || []);
  const [achievements, setAchievements] = useState(saved?.achievements || []);
  const [questDone, setQuestDone] = useState(saved?.questDone || {});
  const [questDate, setQuestDate] = useState(saved?.questDate || todayKey());
  const [streak, setStreak] = useState(saved?.streak || 1);
  const [lastVisitDate, setLastVisitDate] = useState(saved?.lastVisitDate || todayKey());
  const [bondPoints, setBondPoints] = useState(saved?.bondPoints || 0);
  const [dailyChatCount, setDailyChatCount] = useState(saved?.dailyChatCount || 0);
  const [lastChatDate, setLastChatDate] = useState(saved?.lastChatDate || todayKey());
  
  const [lastDailyGift, setLastDailyGift] = useState(saved?.lastDailyGift || null);
  const [starterPackClaimed, setStarterPackClaimed] = useState(
  saved?.starterPackClaimed || false
);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [lastDiaryDate, setLastDiaryDate] = useState(saved?.lastDiaryDate || null);
  const [momentText, setMomentText] = useState("");
  const [momoAction, setMomoAction] = useState("walking");
  const [showCondition, setShowCondition] = useState(false);
  const [momoMood, setMomoMood] = useState("Wandering around");
  const [thought, setThought] = useState("I’m happy you’re here.");
  const [pop, setPop] = useState(null);
  const [roomIndex, setRoomIndex] = useState(saved?.roomIndex || 0);
  const [momoRoomMessage, setMomoRoomMessage] = useState("");
  const [visitingWorld, setVisitingWorld] = useState(null);
  const [visitRoomIndex, setVisitRoomIndex] = useState(0);
  const [visitTouchStart, setVisitTouchStart] = useState(null);
  const [showPostcardPanel, setShowPostcardPanel] = useState(false);
  const [selectedHouseRoom, setSelectedHouseRoom] = useState(null);
  const [shopTab, setShopTab] = useState("food");
  const [postcardMessage, setPostcardMessage] = useState("");
  const [selectedPostcard, setSelectedPostcard] = useState(null);
  const [postcardMode, setPostcardMode] = useState("choose");
  const [postcardRecipient, setPostcardRecipient] = useState(null);
  const [postcardSent, setPostcardSent] = useState(false);
  const [sendingPostcard, setSendingPostcard] = useState(false);
  const [receivedPostcards, setReceivedPostcards] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [openedPostcard, setOpenedPostcard] = useState(null);
  const [mailTab, setMailTab] = useState("mail");
  const [selectedGiftId, setSelectedGiftId] = useState("");
  const [selectedGiftType, setSelectedGiftType] = useState("");
  const [giftTab, setGiftTab] = useState("food");
  const [postcardError, setPostcardError] = useState("");
  const [roomFading, setRoomFading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [settings, setSettings] = useState(saved?.settings || { sound: true, reduceMotion: false });
  const [confirmReset, setConfirmReset] = useState(false);
  const [miniGameHighScore, setMiniGameHighScore] = useState(saved?.miniGameHighScore || 0);
  const [memoryGame, setMemoryGame] = useState({
  cards: [],
  flipped: [],
  matched: [],
  reveal: true,
  moves: 0,
  level: saved?.memoryLevel || 1,
  triesLeft: 3,
  finished: false,
  failed: false,
  rewardClaimed: false,
  message: "Memorize the cards!",
  });
  const [activity, setActivity] = useState(saved?.activity || null);
  const [dockOpen, setDockOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bgm] = useState(
  () => new Audio("/audio/cozy-room.mp3")
  );
  const [spriteFrame, setSpriteFrame] = useState(0);
  const [momoX, setMomoX] = useState(50);
  const [facingLeft, setFacingLeft] = useState(false);

  const validMomo = MOMO_TYPES[momo] ? momo : "Momo";
  const momoData = MOMO_TYPES[validMomo];
  const displayName = customName || momoData?.name || "Momo";
  const phase = getDayPhase();
  const room = ROOMS[roomIndex];
  const canClaimDaily = lastDailyGift !== todayKey();
  const bondTitle = getBondTitle(bondPoints);
  const emotion = getEmotion(condition);
  const unreadMail =
  receivedPostcards.filter((m) => !m.read).length + incomingRequests.length;
  const seasonalNote = getSeasonalNote();

  

  const averageCondition = useMemo(() => {
    const main = ["happiness", "energy", "curiosity", "connection", "wonder"];
    return Math.round(main.reduce((sum, key) => sum + condition[key], 0) / main.length);
  }, [condition]);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Firebase sign in failed:", err);
      }
      return;
    }

    console.log("Firebase UID:", user.uid);

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        friendCode: createFriendCode(),
        username: "New Friend",
        momoType: momo || "Momo",
        customName: customName || "",
        roomIndex: roomIndex || 0,
        bondPoints: bondPoints || 0,
        publicWorld: {
        momoType: momo || "Momo",
        customName: customName || "",
        roomIndex: roomIndex || 0,
        activeRooms: activeRooms || {},
        placedItems: placedItems || {},
        lastSeen: Date.now(),
      },
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
    } else {
      await setDoc(
        userRef,
        {
          momoType: momo || "Momo",
          customName: customName || "",
          roomIndex: roomIndex || 0,
          bondPoints: bondPoints || 0,
          publicWorld: {
          momoType: momo || "Momo",
          customName: customName || "",
          roomIndex: roomIndex || 0,
          placedItems: placedItems || {},
          activeRooms: activeRooms || {},
          lastSeen: Date.now(),
          },
          lastSeen: Date.now(),
        },
        { merge: true }
      );
    }
  });

  return () => unsubscribe();
}, [momo, customName, roomIndex, bondPoints, placedItems, activeRooms]);


  useEffect(() => {
  const timer = setTimeout(() => setIsLoading(false), 1800);
  return () => clearTimeout(timer);
}, []);

  useEffect(() => {
  if (screen !== "quiz") return;

  setShuffledAnswers(
    [...QUIZ[quizIndex].a].sort(() => Math.random() - 0.5)
  );
}, [quizIndex, screen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

useEffect(() => {
  bgm.loop = true;
  bgm.volume = 0.2;

  if (settings.sound) {
    bgm.play().catch(() => {});
  } else {
    bgm.pause();
  }

  return () => bgm.pause();
}, [bgm, settings.sound]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSpriteFrame((f) => (f === 0 ? 1 : 0));
    }, 800);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  const wander = setInterval(() => {
    setMomoX((x) => {
      const move = Math.random() > 0.5 ? 8 : -8;
      const next = Math.max(20, Math.min(80, x + move));

      setFacingLeft(move < 0);

      return next;
    });
  }, 4000);

  return () => clearInterval(wander);
}, []);

  useEffect(() => {
    if (!momo) return;

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        momo,
        customName,
        customVibe,
        sparks,
        condition,
        memories,
        foodBag,
        placedItems,
        unlockedRooms,
        activeRooms,
        discoveries,
        diary,
        mailbox,
        achievements,
        questDone,
        questDate,
        streak,
        dailyChatCount,
        lastChatDate,
        lastVisitDate,
        bondPoints,
        dreamLevel,
        sweetLevel,
        lastDailyGift,
        starterPackClaimed,
        lastDiaryDate,
        roomIndex,
        settings,
        miniGameHighScore,
        memoryLevel: memoryGame.level,
        trailBest,
        dreamBest,
        sweetBest,
        activity,
        lastSeen: Date.now(),
      })
    );
  }, [
    momo,
    customName,
    customVibe,
    sparks,
    condition,
    memories,
    foodBag,
    placedItems,
    unlockedRooms,
    activeRooms,  
    discoveries,
    diary,
    mailbox,
    achievements,
    questDone,
    questDate,
    streak,
    dailyChatCount,
    lastChatDate,
    lastVisitDate,
    bondPoints,
    lastDailyGift,
    starterPackClaimed,
    lastDiaryDate,
    roomIndex,
    settings,
    miniGameHighScore,
    memoryGame.level,
    sweetLevel,
    sweetBest,
    activity,
  ]);

  useEffect(() => {
    if (!momo) return;

    if (questDate !== todayKey()) {
      setQuestDone({});
      setQuestDate(todayKey());
    }

    if (lastVisitDate !== todayKey()) {
      setStreak((s) => (lastVisitDate === yesterdayKey() ? s + 1 : 1));
      setLastVisitDate(todayKey());

      const auto = AUTONOMOUS_ACTIVITIES[Math.floor(Math.random() * AUTONOMOUS_ACTIVITIES.length)];
      setMailbox((m) => [
        {
          id: Date.now(),
          date: todayKey(),
          read: false,
          text:
            lastVisitDate === yesterdayKey()
              ? `You came back again. While you were away, ${displayName} was ${auto.text.toLowerCase()}.`
              : `I missed you while you were gone. I kept a tiny spark safe for you.`,
        },
        ...m,
      ].slice(0, 20));
    }
  }, [momo, questDate, lastVisitDate, displayName]);

  useEffect(() => {
    if (!momo) return;
    if (lastDiaryDate === todayKey()) return;

    const auto = AUTONOMOUS_ACTIVITIES[Math.floor(Math.random() * AUTONOMOUS_ACTIVITIES.length)];

    const entry = {
      id: Date.now(),
      date: todayKey(),
      text: `Today I woke up feeling ${emotion}. I spent some time ${auto.text.toLowerCase()}. ${seasonalNote}`,
    };

    setDiary((d) => [entry, ...d].slice(0, 30));
    setLastDiaryDate(todayKey());
  }, [momo, lastDiaryDate, emotion, seasonalNote]);

  useEffect(() => {
    if (!momo) return;

    const state = {
    memories,
    discoveries,
    foodBag,
    bondPoints,
    streak,
    miniGameHighScore,
  };
    const unlocked = ACHIEVEMENTS.filter((a) => a.check(state) && !achievements.includes(a.id));

    if (unlocked.length > 0) {
      const badge = unlocked[0];
      setAchievements((prev) => [...prev, badge.id]);
      setNewBadge(badge);
      setTimeout(() => setNewBadge(null), 2200);
    }
  }, [momo, memories, discoveries, foodBag, bondPoints, streak, achievements, miniGameHighScore]);

  useEffect(() => {
    if (!momo) return;

    const timer = setInterval(() => {
      const voice = momoData.voice[Math.floor(Math.random() * momoData.voice.length)];

      let nextActivity = null;
      let nextAction = "walking";
      let nextMood = "Wandering around";
      let nextThought = voice;

      if (emotion === "hungry") {
        nextAction = "sitting";
        nextMood = "Looking for snacks";
        nextThought = "Maybe a snack would help...";
      } else if (emotion === "messy") {
        nextAction = "looking";
        nextMood = "Needs a little bath";
        nextThought = "I got a little messy.";
      } else if (isMomoSleepTime(currentTime)) {
        nextAction = "sleepy";
        nextMood = "Sleeping peacefully";
        nextThought = "Zzz... see you in the morning.";
      } else if (emotion === "sleepy") {
        nextAction = "sleepy";
        nextMood = "Feeling sleepy";
        nextThought = "A nap sounds nice.";
      } else if (emotion === "lonely") {
        nextAction = "sitting";
        nextMood = "Missing you";
        nextThought = "Can we talk for a bit?";
      } else {
        const roomActivities = AUTONOMOUS_ACTIVITIES.filter((a) => a.room === room.id);
        nextActivity = roomActivities.length
          ? roomActivities[Math.floor(Math.random() * roomActivities.length)]
          : AUTONOMOUS_ACTIVITIES[Math.floor(Math.random() * AUTONOMOUS_ACTIVITIES.length)];

        nextAction = nextActivity.pose;
        nextMood = nextActivity.text;
        nextThought = nextActivity.thought;
      }

      setActivity(nextActivity);
      setMomoAction(nextAction);
      setMomoMood(nextMood);
      setThought(nextThought);
    }, 7000);

    return () => clearInterval(timer);
  }, [momo, momoData, phase, room, emotion, currentTime]);

  useEffect(() => {
  if (activeGame === "memory-match") {
    startMemoryGame(memoryGame.level || 1);
  }
}, [activeGame]);

function showMemorySequence(sequence) {
  let index = 0;

  const interval = setInterval(() => {
    setMemoryGame((game) => ({
      ...game,
      activeSymbol: sequence[index],
      showing: true,
      message: "Watch carefully...",
    }));

    setTimeout(() => {
      setMemoryGame((game) => ({
        ...game,
        activeSymbol: null,
      }));
    }, 420);

    index += 1;

    if (index >= sequence.length) {
      clearInterval(interval);

      setTimeout(() => {
        setMemoryGame((game) => ({
          ...game,
          showing: false,
          message: "Now repeat it for Momo.",
        }));
      }, 650);
    }
  }, 750);
}

function pressMemorySymbol(symbol) {
  if (memoryGame.showing || memoryGame.finished) return;

  const nextPlayer = [...memoryGame.player, symbol];
  const currentIndex = nextPlayer.length - 1;
  const correct = memoryGame.sequence[currentIndex] === symbol;

  if (!correct) {
    const completedRounds = Math.max(0, memoryGame.round - 1);
    const reward = Math.max(3, completedRounds * 5);

    setSparks((s) => s + reward);
    setBondPoints((b) => b + Math.min(12, completedRounds * 2));
    setMiniGameHighScore((h) => Math.max(h, completedRounds));
    completeQuest("miniGame");

    setMemoryGame((game) => ({
      ...game,
      player: nextPlayer,
      finished: true,
      message: `${displayName} remembered ${completedRounds} dream${completedRounds === 1 ? "" : "s"}. +${reward} ✨`,
    }));

    setMomoMood(`Remembered ${completedRounds} dreams`);
    showPop(`+${reward} ✨`);
    playSfx("memory");
    vibrate();
    return;
  }

  if (nextPlayer.length === memoryGame.sequence.length) {
    const nextSequence = [...memoryGame.sequence, randomMemorySymbol()];
    const nextRound = memoryGame.round + 1;

    setMemoryGame((game) => ({
      ...game,
      sequence: nextSequence,
      player: [],
      round: nextRound,
      showing: true,
      message: "Good memory! Momo dreams a little longer...",
    }));

    setTimeout(() => showMemorySequence(nextSequence), 900);
    return;
  }

  setMemoryGame((game) => ({
    ...game,
    player: nextPlayer,
  }));
}

function shuffleCards(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function startMemoryGame(levelOverride = memoryGame.level) {
  const level = Math.max(1, levelOverride);
  const previewTime = getMemoryPreviewTime(level);

  const cards = shuffleCards(
    [...MEMORY_CARDS, ...MEMORY_CARDS].map((card, index) => ({
      ...card,
      uid: `${card.id}-${index}-${Date.now()}-${Math.random()}`,
    }))
  );

  setMemoryGame({
    cards,
    flipped: cards.map((card) => card.uid),
    matched: [],
    reveal: true,
    moves: 0,
    level,
    triesLeft: 3,
    finished: false,
    failed: false,
    rewardClaimed: false,
    message: `Memorize the cards! ${previewTime / 1000}s`,
  });

  setTimeout(() => {
    setMemoryGame((game) => ({
      ...game,
      flipped: [],
      reveal: false,
      message: "Find all the matching pairs!",
    }));
  }, previewTime);
}

function pressMemoryCard(card) {
  if (memoryGame.reveal || memoryGame.finished || memoryGame.failed) return;
  if (memoryGame.flipped.includes(card.uid)) return;
  if (memoryGame.matched.includes(card.uid)) return;
  if (memoryGame.flipped.length >= 2) return;

  const nextFlipped = [...memoryGame.flipped, card.uid];

  setMemoryGame((game) => ({
    ...game,
    flipped: nextFlipped,
  }));

  if (nextFlipped.length !== 2) return;

  const first = memoryGame.cards.find((c) => c.uid === nextFlipped[0]);
  const second = memoryGame.cards.find((c) => c.uid === nextFlipped[1]);
  const isMatch = first?.id === second?.id;

  setTimeout(() => {
    if (isMatch) {
      const nextMatched = [...memoryGame.matched, first.uid, second.uid];
      const finished = nextMatched.length === memoryGame.cards.length;

      setMemoryGame((game) => ({
        ...game,
        matched: nextMatched,
        flipped: [],
        moves: game.moves + 1,
        finished,
        failed: false,
        message: finished
          ? "All memories matched!"
          : "Nice match!",
      }));

      if (finished) {
        setMiniGameHighScore((h) => Math.max(h, memoryGame.level));
        completeQuest("miniGame");
        setMomoMood("Matched all memories");
        playSfx("memory");
        vibrate();
      }

      return;
    }

    const nextTries = memoryGame.triesLeft - 1;

    setMemoryGame((game) => ({
      ...game,
      flipped: [],
      moves: game.moves + 1,
      triesLeft: nextTries,
      failed: nextTries <= 0,
      finished: nextTries <= 0,
      message:
        nextTries <= 0
          ? "No more hearts..."
          : `${nextTries} heart${nextTries === 1 ? "" : "s"} left.`,
    }));

    if (nextTries <= 0) {
      setMomoMood("Nini is resting");
    }
  }, 650);
}

function claimMemoryReward() {
  if (memoryGame.rewardClaimed || !memoryGame.finished || memoryGame.failed) return;

  const reward = 20 + memoryGame.level * 5;

  setSparks((s) => s + reward);
  setBondPoints((b) => b + 3);
  setMemoryGame((game) => ({
    ...game,
    rewardClaimed: true,
  }));

  showPop(`+${reward} ✨`);
}

function nextMemoryLevel() {
  startMemoryGame(memoryGame.level + 1);
}

  function playSfx(type) {
    if (!settings.sound) return;
    console.log(`sfx:${type}`);
  }

  function vibrate(ms = 12) {
    if (navigator.vibrate && !settings.reduceMotion) navigator.vibrate(ms);
  }

  function answerQuiz(type) {
    const nextScores = { ...scores, [type]: (scores[type] || 0) + 1 };
    setScores(nextScores);

    if (quizIndex < QUIZ.length - 1) {
      setQuizIndex(quizIndex + 1);
      return;
    }

   const highestScore = Math.max(...Object.values(nextScores));

  const tiedResults = Object.entries(nextScores)
    .filter(([type, score]) => score === highestScore)
    .map(([type]) => type);

  const result = tiedResults[Math.floor(Math.random() * tiedResults.length)];

  setMomo(result);
  setScreen("reveal");
  }

  function finishSetup() {
    setCustomName(nameInput.trim());
    setCustomVibe(vibeInput);
    setScreen("reveal");
  }

  function boostCondition(changes) {
    setCondition((c) => {
      const next = { ...c };
      Object.entries(changes).forEach(([key, value]) => {
        next[key] = Math.max(0, Math.min(100, next[key] + value));
      });
      return next;
    });
  }

  function showPop(text) {
    setPop(text);
    setTimeout(() => setPop(null), 900);
  }

  function completeQuest(id) {
    if (questDone[id]) return;
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest) return;

    setQuestDone((q) => ({ ...q, [id]: true }));
    setSparks((s) => s + quest.reward);
    showPop(`+${quest.reward} ✨`);
  }

  function changeRoom(direction) {
  setRoomFading(true);

  setTimeout(() => {
    setRoomIndex((current) => {
      const next =
        direction === "next"
          ? (current + 1) % ROOMS.length
          : (current - 1 + ROOMS.length) % ROOMS.length;

      if (ROOMS[next].id === "garden") completeQuest("visitGarden");

      return next;
    });

    setDockOpen(false);
    playSfx("swipe");
    vibrate();

    setTimeout(() => {
      setRoomFading(false);
    }, 80);
  }, 180);
}

function changeVisitRoom(direction) {
  setVisitRoomIndex((current) =>
    direction === "next"
      ? (current + 1) % ROOMS.length
      : (current - 1 + ROOMS.length) % ROOMS.length
  );
}

function openPostcardComposer(friend) {
  setVisitingWorld(null);
  setScreen("home");
  setPostcardRecipient(friend);
  setShowPostcardPanel(true);
  setSelectedPostcard(null);
  setSelectedGiftId("");
  setPostcardMode("choose");
  setPostcardMessage("");
  setPostcardSent(false);
  setPostcardError("");
}

function openVisitPostcardComposer(friend) {
  setPostcardRecipient(friend);
  setShowPostcardPanel(true);
  setSelectedPostcard(null);
  setSelectedGiftId("");
  setPostcardMode("choose");
  setPostcardMessage("");
  setPostcardSent(false);
  setPostcardError("");
}

async function sendPostcard(message) {
  const user = auth.currentUser;

  const recipient = postcardRecipient || visitingWorld;
  const recipientId = recipient?.uid || recipient?.id;

  if (!user || !recipientId) {
    setPostcardError("No friend selected.");
    return;
  }

  if (!selectedPostcard) {
    setPostcardError("Choose a postcard first.");
    return;
  }

  if (!message.trim()) {
    setPostcardError("Write a message first.");
    return;
  }

  try {
    setSendingPostcard(true);
    setPostcardError("");

    const postcardId = `${Date.now()}_${user.uid}`;

    const mySnap = await getDoc(doc(db, "users", user.uid));
    const myData = mySnap.exists() ? mySnap.data() : {};

    const giftItem = selectedGiftId
  ? selectedGiftType === "food"
    ? FOODS.find((item) => item.id === selectedGiftId)
    : WALLPAPERS.find((item) => item.id === selectedGiftId)
  : null;

  if (giftItem && sparks < giftItem.price) {
    setPostcardError(`You need ${giftItem.price} Sparks to send this gift.`);
    return;
  }

    await setDoc(
      doc(db, "users", recipientId, "postcards", postcardId),
      {
        id: postcardId,
        fromUid: user.uid,
        fromUsername: myData.username || displayName,
        fromFriendCode: myData.friendCode || "",
        fromMomoType: myData.momoType || momo,
        message: message.trim(),
        cardTheme: selectedPostcard.id,
        cardImage: selectedPostcard.image,
       gift: giftItem
  ? {
      type: selectedGiftType,
      id: giftItem.id,
      room: giftItem.room || "",
      style: giftItem.style || "",
      name: giftItem.name,
      icon: giftItem.icon,
      price: giftItem.price,
      claimed: false,
    }
  : null,
        read: false,
        createdAt: Date.now(),
      }
    );

    if (giftItem) {
    setSparks((s) => s - giftItem.price);
  }

    setPostcardSent(true);

    setTimeout(() => {
      setShowPostcardPanel(false);
      setPostcardSent(false);
      setSelectedPostcard(null);
      setSelectedGiftId("");
      setPostcardMessage("");
      setPostcardRecipient(null);
      setPostcardMode("choose");
    }, 1200);
  } catch (err) {
    console.error(err);
    setPostcardError(err.message);
  } finally {
    setSendingPostcard(false);
  }
}

function handleVisitTouchEnd(e) {
  if (visitTouchStart === null) return;

  const diff = visitTouchStart - e.changedTouches[0].clientX;

  if (Math.abs(diff) > 45) {
    changeVisitRoom(diff > 0 ? "next" : "prev");
  }

  setVisitTouchStart(null);
}

  function handleTouchEnd(e) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) changeRoom(diff > 0 ? "next" : "prev");
    setTouchStart(null);
  }

  function maybeDiscover() {
    const chance = momo === "Poko" ? 0.62 : 0.42;
    if (Math.random() > chance) return;

    const undiscovered = DISCOVERY_POOL.filter((d) => !discoveries.includes(d));
    if (undiscovered.length === 0) return;

    const found = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    setDiscoveries((d) => [found, ...d]);
    setMomoMood(`Found ${found}`);
    setThought("I found something tiny!");
    showPop("found!");
    playSfx("discovery");
  }

  function interact(type) {
  if (type === "feed") {
    setScreen("food");
    return;
  }

  if (type === "play") {
    const kokoBonus = momo === "Koko" ? 4 : 0;
    boostCondition({ happiness: 9 + kokoBonus, curiosity: 8, energy: -8, hunger: -4 });
    setMomoAction("happy");
    setMomoMood("Playing together");
    setThought(momo === "Koko" ? "Again!! Again!!" : "Again! Again!");
    showPop("+fun");
    maybeDiscover();
    completeQuest("play");
    setBondPoints((b) => b + 4);
  }

  if (type === "talk") {
    const today = todayKey();
    const chatsToday = lastChatDate === today ? dailyChatCount : 0;

    boostCondition({ connection: 11, wonder: 5, happiness: 3 });
    setMomoAction("looking");
    setMomoMood("Listening closely");
    setThought(
      chatsToday >= 3
        ? "I still love talking with you, but we already got closer from chatting today."
        : "I like talking with you."
    );

    if (chatsToday < 3) {
      setBondPoints((b) => b + 4);
      setDailyChatCount(chatsToday + 1);
      setLastChatDate(today);
      showPop(`+bond ${chatsToday + 1}/3`);
      completeQuest("talk");
    } else {
      showPop("Tomorrow Again");
    }
  }

  playSfx(type);
  vibrate();
}

 function feedFood(food) {
  const ownedIndex = foodBag.indexOf(food.id);

  if (ownedIndex === -1) {
    showPop("No food!");
    return;
  }

  const bubuBoost = momo === "Bubu" ? { happiness: 6 } : {};

  boostCondition({
    ...food.boost,
    ...bubuBoost,
  });

  setBondPoints((b) => b + 5);

  setFoodBag((bag) => {
    const next = [...bag];
    next.splice(ownedIndex, 1);
    return next;
  });

  setMomoAction("full");

  setTimeout(() => {
    setMomoAction("walking");
  }, 2500);

  setMomoMood("Eating happily");
  setThought(food.reaction);
  showPop(`Yum! ${food.name}`);
  setScreen("home");
  completeQuest("feed");
  playSfx("eat");
  vibrate();
}

function napMomo() {
  const niniEnergy = momo === "Nini" ? 8 : 0;

  boostCondition({
    energy: 40 + niniEnergy,
    happiness: 3,
    hunger: -3,
  });

  setMomoAction("sleeping");
  setMomoMood("Taking a tiny nap");
  setThought("Zzz... cozy...");
  showPop("😴");

  setBondPoints((b) => b + 4);

  setTimeout(() => {
    setMomoAction("walking");
  }, 4000);
}

  function cleanMomo() {
    boostCondition({ cleanliness: 20, happiness: 4 });
    setMomoAction("happy");
    setTimeout(() => {
      setMomoAction("walking");
    }, 1500);
    setMomoMood("Fresh and clean");
    setThought("Sparkly again!");
    showPop("+clean");
    setBondPoints((b) => b + 4);
  }

  function tapMomo() {
    const reactions = momoData.voice;
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    boostCondition({ happiness: 2, connection: 1 });
    setBondPoints((b) => b + 1);
    setMomoAction("happy");
    setMomoAction("happy");
  setTimeout(() => {
    setMomoAction("");
  }, 1800);
    setMomoMood("Feeling loved");
    setThought(reaction);
    showPop("♡");
    playSfx("tap");
    vibrate();
  }

  function claimDailyGift() {
  if (!canClaimDaily) return;

  const currentRewards = getDailyRewardsForStreak(streak);
  const rewardIndex = Math.min((streak - 1) % 7, 6);
  const reward = currentRewards[rewardIndex];

  if (reward.type === "sparks") {
    setSparks((s) => s + reward.amount);
    showPop(`+${reward.amount} ✨`);
  }

  if (reward.type === "food") {
    setFoodBag((items) => [
      ...items,
      ...Array.from({ length: reward.amount }, () => reward.foodId),
    ]);

    showPop(`${reward.label}`);
  }

  if (reward.type === "wallpaper") {
    setUnlockedRooms((rooms) => {
      const existing = rooms[reward.room] || [];

      if (existing.includes(reward.wallpaperId)) {
        return rooms;
      }

      return {
        ...rooms,
        [reward.room]: [...existing, reward.wallpaperId],
      };
    });

    showPop(`Wallpaper unlocked!`);
  }

  setLastDailyGift(todayKey());
  setShowDailyReward(false);
}

  function captureMoment() {
    const lumiWonder = momo === "Lumi" ? 5 : 0;

    const autoTexts = [
      `${displayName} was enjoying the ${phase} sky.`,
      `${displayName} took a tiny walk around the ${room.name.toLowerCase()}.`,
      `${displayName} spent time ${momoMood.toLowerCase()}.`,
      `${displayName} found a little sparkle today.`,
    ];

    const memory = {
      id: Date.now(),
      text: autoTexts[Math.floor(Math.random() * autoTexts.length)],
      date: new Date().toLocaleDateString(),
      type: "capture",
    };

    setMemories([memory, ...memories]);
    setSparks((s) => s + 10);
    setBondPoints((b) => b + 8);
    boostCondition({ connection: 4, wonder: 4 + lumiWonder });
    setMomoMood("Saved a tiny memory");
    showPop("+memory");
    completeQuest("capture");
    playSfx("camera");
    vibrate();
  }

  function shareMoment() {
    if (!momentText.trim()) return;

    const newMemory = {
      id: Date.now(),
      text: momentText.trim(),
      date: new Date().toLocaleDateString(),
      type: "shared",
    };

    setMemories([newMemory, ...memories]);
    setMomentText("");
    setSparks((s) => s + 15);
    setBondPoints((b) => b + 12);
    boostCondition({ connection: 8, wonder: 5, happiness: 5 });
    setMomoAction("happy");
    setMomoMood("Saved your moment");
    setScreen("home");
    showPop("+15 ✨");
    playSfx("memory");
  }

  function buyFood(food) {
  if (sparks < food.price) return;

  setSparks((s) => s - food.price);

  setFoodBag((bag) => [...bag, food.id]);

  showPop(`${food.name} added!`);
}

function buyWallpaper(wallpaper) {
  if (sparks < wallpaper.price) return;

  const alreadyOwned = unlockedRooms[wallpaper.room]?.includes(wallpaper.id);
  if (alreadyOwned) return;

  setSparks((s) => s - wallpaper.price);

  setUnlockedRooms((rooms) => ({
    ...rooms,
    [wallpaper.room]: [...(rooms[wallpaper.room] || []), wallpaper.id],
  }));

  showPop("Unlocked!");
}

  const SLOT_SYMBOLS = [
  { id: "moon", img: "/assets/slots/moon.png", payout: 1000 },
  { id: "star", img: "/assets/slots/star.png", payout: 50 },
  { id: "bear", img: "/assets/slots/bear.png", payout: 25 },
  { id: "strawberry", img: "/assets/slots/strawberry.png", payout: 15 },
  { id: "ribbon", img: "/assets/slots/ribbon.png", payout: 10 },
  { id: "cloud", img: "/assets/slots/cloud.png", payout: 5 },
]; ["🌙", "⭐", "☁️", "🦋", "🍓", "🧸"];

function spinSlots() {
  const SPIN_COST = 25;

  if (sparks < SPIN_COST || slotSpinning) return;

  setSlotSpinning(true);
  setSlotResult(null);
  setSparks((s) => s - SPIN_COST);

  let ticks = 0;

  const spinner = setInterval(() => {
    setSlotReels([
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    ]);

    ticks += 1;

    if (ticks >= 18) {
      clearInterval(spinner);

      const roll = Math.random();

      let finalReels;
      let result;

      if (roll < 0.62) {
        let a, b, c;

do {
  a = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  b = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  c = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
} while (
  a.id === b.id ||
  b.id === c.id ||
  a.id === c.id
);

  finalReels = [a, b, c];

        result = {
          title: "No Match",
          text: "You lost 25 Sparks.",
          amount: 0,
        };
      } else if (roll < 0.82) {
        const symbol =
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

        const other =
          SLOT_SYMBOLS.find((s) => s.id !== symbol.id) || SLOT_SYMBOLS[1];

        finalReels = [symbol, symbol, other];

        setSparks((s) => s + 5);

        result = {
          title: "So Close!",
          text: "+5 Sparks",
          amount: 5,
        };
      } else if (roll < 0.92) {
        finalReels = [
          SLOT_SYMBOLS[5],
          SLOT_SYMBOLS[5],
          SLOT_SYMBOLS[5],
        ];

        setSparks((s) => s + 5);

        result = {
          title: "Cloud Match!",
          text: "+5 Sparks",
          amount: 5,
        };
      } else if (roll < 0.965) {
        finalReels = [
          SLOT_SYMBOLS[4],
          SLOT_SYMBOLS[4],
          SLOT_SYMBOLS[4],
        ];

        setSparks((s) => s + 10);

        result = {
          title: "Ribbon Match!",
          text: "+10 Sparks",
          amount: 10,
        };
      } else if (roll < 0.985) {
        finalReels = [
          SLOT_SYMBOLS[3],
          SLOT_SYMBOLS[3],
          SLOT_SYMBOLS[3],
        ];

        setSparks((s) => s + 15);

        result = {
          title: "Berry Match!",
          text: "+15 Sparks",
          amount: 15,
        };
      } else if (roll < 0.995) {
        finalReels = [
          SLOT_SYMBOLS[2],
          SLOT_SYMBOLS[2],
          SLOT_SYMBOLS[2],
        ];

        setSparks((s) => s + 25);

        result = {
          title: "Bear Match!",
          text: "+25 Sparks",
          amount: 25,
        };
      } else if (roll < 0.999) {
        finalReels = [
          SLOT_SYMBOLS[1],
          SLOT_SYMBOLS[1],
          SLOT_SYMBOLS[1],
        ];

        setSparks((s) => s + 50);

        result = {
          title: "Star Win!",
          text: "+50 Sparks",
          amount: 50,
        };
      } else {
        finalReels = [
          SLOT_SYMBOLS[0],
          SLOT_SYMBOLS[0],
          SLOT_SYMBOLS[0],
        ];

        setSparks((s) => s + 1000);

        result = {
          title: "MOON JACKPOT!",
          text: "+1000 Sparks",
          amount: 1000,
        };
      }

      setSlotReels(finalReels);
      setSlotResult(result);
      setSlotSpinning(false);

      setMomoAction(result.amount > 0 ? "happy" : "angry");
      setMomoMood(result.amount > 0 ? "Lucky spin!" : "Unlucky spin");
      showPop(result.text);
    }
  }, 70);
}


  function togglePlacedItem(itemId) {
    setPlacedItems((p) => {
      const roomItems = p[room.id] || [];
      const exists = roomItems.includes(itemId);
      return {
        ...p,
        [room.id]: exists ? roomItems.filter((id) => id !== itemId) : [...roomItems, itemId],
      };
    });
  }

function resetSweetStack() {
  setSweetScore(0);
  setSweetAttempt(0);
  setSweetStack([SWEET_DESSERTS[0]]);
  setSweetX(50);
  setSweetDirection(1);
  setSweetCombo(0);
  setSweetMessage("Tap when the dessert is centered!");
  setSweetGameOver(false);
  setSweetWon(false);
  setSweetRewardClaimed(false);
}

function getSweetMultiplier(combo) {
  if (combo >= 12) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function placeSweetDessert() {
  if (sweetGameOver) return;

  const dessert = SWEET_DESSERTS[sweetAttempt + 1];
  if (!dessert) return;

  const distance = Math.abs(sweetX - 50);

let rating = "MISS";
let basePoints = 0;


if (distance <= 4) {
  rating = "PERFECT";
  basePoints = 100;
} else if (distance <= 9) {
  rating = "GREAT";
  basePoints = 75;
} else if (distance <= 15) {
  rating = "GOOD";
  basePoints = 50;
} else if (distance <= 22) {
  rating = "POOR";
  basePoints = 25;
} else {
  setSweetMessage("MISS! Game Over");
setSweetJudgement("MISS");

setTimeout(() => {
  setSweetJudgement("");
}, 800);

setSweetGameOver(true);
setSweetWon(false);
return;  setSweetGameOver(true);
  setSweetWon(false);
  return;
}

  const nextCombo =
  rating === "PERFECT"
    ? sweetCombo + 1
    : 0;
  const multiplier = getSweetMultiplier(nextCombo);
  const earned = basePoints * multiplier;
  const nextScore = sweetScore + earned;
  const nextAttempt = sweetAttempt + 1;

  setSweetCombo(nextCombo);
  setSweetScore(nextScore);
  setSweetBest((best) => Math.max(best, nextScore));
setSweetStack((stack) => [...stack, dessert]);

setLandingLayer(nextAttempt);

setTimeout(() => {
  setLandingLayer(null);
}, 250);
  setSweetAttempt(nextAttempt);
  setSweetMessage(`${rating}! +${earned}`);
setSweetJudgement(rating);

setTimeout(() => {
  setSweetJudgement("");
}, 800);

  if (nextAttempt >= SWEET_DESSERTS.length - 1) {
    const won = nextScore >= sweetGoal;
    setSweetWon(won);
    setSweetGameOver(true);
    setSweetMessage(won ? "Bakery Level Complete!" : "So close! Try again.");
  }
}

function nextSweetLevel() {
  setSweetLevel((level) => level + 1);
  resetSweetStack();
}


  function resetDreamMatch() {
  setDreamBoard(createDreamBoard());
  setDreamChain([]);
  setDreamDragging(false);
  setDreamScore(0);
  setDreamMoves(15);
  setDreamWon(false);
  setDreamGameOver(false);
  setDreamRewardClaimed(false);
  setDreamMessage("Connect matching Momo friends!");
}



function nextDreamLevel() {
  setDreamLevel((level) => level + 1);

  setDreamBoard(createDreamBoard());
  setDreamChain([]);
  setDreamDragging(false);

  setDreamScore(0);
  setDreamMoves(15);

  setDreamWon(false);
  setDreamGameOver(false);
  setDreamRewardClaimed(false);

  setDreamMessage("Next dream level!");
}

function getDreamCellFromPointer(e) {
  const board = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - board.left;
  const y = e.clientY - board.top;

  const col = Math.floor((x / board.width) * DREAM_SIZE);
  const row = Math.floor((y / board.height) * DREAM_SIZE);

  if (row < 0 || row >= DREAM_SIZE || col < 0 || col >= DREAM_SIZE) {
    return null;
  }

  return {
    row,
    col,
    index: getDreamIndex(row, col),
  };
}

function addDreamCell(cell) {
  if (!cell) return;

  const tile = dreamBoard[cell.index];
  if (!tile) return;

  if (dreamChain.length === 0) {
    setDreamChain([cell.index]);
    return;
  }

  const firstTile = dreamBoard[dreamChain[0]];
  if (tile.icon.type !== firstTile.icon.type) return;

  const alreadyInChain = dreamChain.includes(cell.index);
  const lastIndex = dreamChain[dreamChain.length - 1];
  const lastRow = Math.floor(lastIndex / DREAM_SIZE);
  const lastCol = lastIndex % DREAM_SIZE;

  const rowDistance = Math.abs(cell.row - lastRow);
  const colDistance = Math.abs(cell.col - lastCol);
  const isNeighbor = rowDistance <= 1 && colDistance <= 1 && rowDistance + colDistance > 0;

  if (!isNeighbor) return;

  if (alreadyInChain) {
    if (dreamChain[dreamChain.length - 2] === cell.index) {
      setDreamChain((chain) => chain.slice(0, -1));
    }

    return;
  }

  setDreamChain((chain) => [...chain, cell.index]);
}

function finishDreamChain() {
  if (!dreamDragging) return;

  setDreamDragging(false);

  if (dreamWon || dreamGameOver) return;

  if (dreamChain.length < 3) {
    setDreamMessage("Connect at least 3 matching icons.");
    setDreamChain([]);
    return;
  }

  const cleared = [...dreamChain];
  const points = cleared.length * cleared.length * 10;

  setDreamScore((score) => {
  const next = score + points;

  setDreamBest((best) => Math.max(best, next));

  if (next >= dreamGoal) {
    setDreamWon(true);
    setDreamGameOver(true);
    setDreamMessage("Dream Complete!");
  }

  return next;
});

setDreamMoves((moves) => {
  const nextMoves = moves - 1;

  if (nextMoves <= 0 && dreamScore + points < dreamGoal) {
    setDreamGameOver(true);
    setDreamMessage("So close! Try again.");
  }

  return Math.max(0, nextMoves);
});

  setSparks((s) => s + Math.max(1, Math.floor(cleared.length / 2)));
  setBondPoints((b) => b + cleared.length);
  showPop(`+${points}`);
  setDreamMessage(`${cleared.length} dream icons sparkled!`);

  setDreamBoard((board) => {
    const nextBoard = [...board];

    for (let col = 0; col < DREAM_SIZE; col++) {
      const remaining = [];

      for (let row = DREAM_SIZE - 1; row >= 0; row--) {
        const index = getDreamIndex(row, col);

        if (!cleared.includes(index)) {
          remaining.push(nextBoard[index]);
        }
      }

      for (let row = DREAM_SIZE - 1; row >= 0; row--) {
        const index = getDreamIndex(row, col);
        const tile = remaining[DREAM_SIZE - 1 - row];

        nextBoard[index] =
          tile || {
            id: `${Date.now()}-${index}-${Math.random()}`,
            icon: DREAM_ICONS[Math.floor(Math.random() * DREAM_ICONS.length)],
          };
      }
    }

    return nextBoard;
  });

  setDreamChain([]);
}

useEffect(() => {
  let unsubscribePostcards = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setReceivedPostcards([]);
      return;
    }

    const postcardsRef = collection(db, "users", user.uid, "postcards");

    unsubscribePostcards = onSnapshot(postcardsRef, (snap) => {
      const postcards = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setReceivedPostcards(postcards);
    });
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribePostcards) unsubscribePostcards();
  };
}, []);

useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setIncomingRequests([]);
      return;
    }

    const q = query(
      collection(db, "friendRequests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribeRequests = onSnapshot(q, (snap) => {
      setIncomingRequests(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return unsubscribeRequests;
  });

  return () => unsubscribeAuth();
}, []);

useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setFriends([]);
      return;
    }

    const friendsRef = collection(db, "users", user.uid, "friends");

    const unsubscribeFriends = onSnapshot(friendsRef, (snap) => {
      setFriends(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return unsubscribeFriends;
  });

  return () => unsubscribeAuth();
}, []);

async function acceptFriendRequestFromMail(request) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const myProfile = userSnap.data();
  const now = Date.now();

  await setDoc(doc(db, "users", user.uid, "friends", request.fromUid), {
    uid: request.fromUid,
    username: request.fromUsername || "New Friend",
    friendCode: request.fromFriendCode,
    momoType: request.fromMomoType || "Momo",
    since: now,
  });

console.log("Friend written to current user");

  await setDoc(doc(db, "users", request.fromUid, "friends", user.uid), {
    uid: user.uid,
    username: myProfile.username || "New Friend",
    friendCode: myProfile.friendCode,
    momoType: myProfile.momoType || validMomo || "Momo",
    since: now,
  });

console.log("Friend written to current user");

  await updateDoc(doc(db, "friendRequests", request.id), {
    status: "accepted",
    acceptedAt: now,
  });

  showPop("Friend added! ✨");
}

async function declineFriendRequestFromMail(request) {
  await updateDoc(doc(db, "friendRequests", request.id), {
    status: "declined",
    declinedAt: Date.now(),
  });

  showPop("Request declined");
}


async function claimPostcardGift(postcard) {
  if (!postcard.gift || postcard.gift.claimed) return;

  const user = auth.currentUser;
  if (!user) return;

  if (postcard.gift.type === "food") {
  setFoodBag((items) => [...items, postcard.gift.id]);
}

if (postcard.gift.type === "wallpaper") {
  setUnlockedRooms((rooms) => {
    const roomId = postcard.gift.room;

    if (rooms[roomId]?.includes(postcard.gift.id)) {
      return rooms;
    }

    return {
      ...rooms,
      [roomId]: [...(rooms[roomId] || []), postcard.gift.id],
    };
  });
}

  await updateDoc(doc(db, "users", user.uid, "postcards", postcard.id), {
    "gift.claimed": true,
    giftClaimedAt: Date.now(),
  });

  setReceivedPostcards((postcards) =>
    postcards.map((item) =>
      item.id === postcard.id
        ? {
            ...item,
            gift: {
              ...item.gift,
              claimed: true,
            },
          }
        : item
    )
  );

  setOpenedPostcard((current) =>
    current?.id === postcard.id
      ? {
          ...current,
          gift: {
            ...current.gift,
            claimed: true,
          },
        }
      : current
  );

  showPop(`Gift claimed! ${postcard.gift.name}`);
}

async function openPostcard(postcard) {
  setOpenedPostcard({
    ...postcard,
    read: true,
  });

  if (postcard.read) return;

  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, "users", user.uid, "postcards", postcard.id), {
    read: true,
    readAt: Date.now(),
  });

  setReceivedPostcards((postcards) =>
    postcards.map((item) =>
      item.id === postcard.id
        ? { ...item, read: true, readAt: Date.now() }
        : item
    )
  );
}

function openMailbox() {
  setMailbox((m) => m.map((mail) => ({ ...mail, read: true })));
  setScreen("mail");
  setDockOpen(false);
}

  useEffect(() => {
  if (activeGame !== "sweet-stack") return;
  if (sweetGameOver) return;

  const timer = setInterval(() => {
    setSweetX((x) => {
      const speed = 1.7 + sweetLevel * 0.14 + sweetAttempt * 0.14;
      const next = x + sweetDirection * speed;

      if (next >= 86) {
        setSweetDirection(-1);
        return 86;
      }

      if (next <= 14) {
        setSweetDirection(1);
        return 14;
      }

      return next;
    });
  }, 16);

  return () => clearInterval(timer);
}, [activeGame, sweetGameOver, sweetDirection, sweetLevel, sweetAttempt]);

useEffect(() => {
  if (screen !== "home") return;
  if (visitingWorld) return;
  if (activeGame) return;
  if (isMomoSleepTime(currentTime)) return;

  const timer = setInterval(() => {
    setRoomIndex((currentIndex) => {
      const possibleRooms = ROOMS
        .map((_, index) => index)
        .filter((index) => index !== currentIndex);

      const nextIndex =
        possibleRooms[Math.floor(Math.random() * possibleRooms.length)];

      const nextRoom = ROOMS[nextIndex];

      const lines = ROOM_WANDER_LINES[nextRoom.id] || [
      `wandered to the ${nextRoom.name}.`,
      ];

      const line = lines[Math.floor(Math.random() * lines.length)];

      setMomoRoomMessage(`${displayName} ${line}`);

      setTimeout(() => {
        setMomoRoomMessage("");
      }, 3500);

      return nextIndex;
    });
  }, 45000);

  return () => clearInterval(timer);
}, [screen, visitingWorld, activeGame, displayName]);

useEffect(() => {
  if (screen !== "home") return;
  if (visitingWorld) return;
  if (activeGame) return;

  const timer = setInterval(() => {
    setThought(getRandomMomoThought(condition, currentTime));
  }, 120000);

  return () => clearInterval(timer);
}, [screen, visitingWorld, activeGame, condition, currentTime]);

function TransitionLoader({ message = "Loading your world..." }) {
  const tip = loadingTip;

  return (
    <div className="momo-transition-loader">
      <img
        src="/loading/loading-screen.png"
        alt="Momo World Loading"
        className="momo-transition-bg"
      />

      <div className="momo-transition-message">
        {message}
      </div>

      <img
        src={tip}
        alt="Momo World Tip"
        className="momo-transition-tip"
      />
    </div>
  );
}

function showTransition(message, callback, delay = 900) {
  setTransitionLoading(message);

  setTimeout(() => {
    callback?.();
  }, delay);

  setTimeout(() => {
    setTransitionLoading(null);
  }, delay + 900);
}

  function hardReset() {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }

  if (isLoading) {
  return (
    <div className="app loading-app">
      <div className="phone-shell loading-shell">
        <div className="momo-loading-screen">
          <img
            src="/loading/loading-screen.png"
            alt="Momo World Loading"
            className="momo-loading-bg"
          />

          <img
            src={loadingTip}
            alt="Momo World Tip"
            className="momo-loading-tip"
          />
        </div>
      </div>
    </div>
  );
}

if (screen === "front") {
  return (
    <div className="app front-bg">
      <div className="phone-shell">
        <div className="front-screen">

          <img
            src="/ui/logo.png"
            alt="Momo World"
            className="front-logo"
          />

          <h1>Momo World</h1>

          <p>
            A tiny companion made just for you.
          </p>

          <div className="front-petals">
            {Array.from({ length: 5 }).map((_, i) => (
              <img
                key={i}
                src="/ui/effects/sakura-petal.png"
                alt=""
                draggable="false"
              />
            ))}
          </div>

          <button
            className="front-start-btn"
            onClick={() => {
              if (settings.sound) {
                bgm.play().catch(() => {});
              }

              setScreen("quiz");
            }}
            aria-label="Start Game"
          />

        </div>
      </div>
    </div>
  );
}

  if (screen === "quiz") {
    const current = QUIZ[quizIndex];

    if (!shuffledAnswers.length) {
      return null;
    }

    return (
      <div className="app quiz-bg">
        <div className="phone-shell">
          <div className="quiz-card">
            <p className="eyebrow">Find your Momo</p>
            <h1>{current.q}</h1>
            <p className="quiz-count">Question {quizIndex + 1} / {QUIZ.length}</p>

            <div className="answer-list">
              {shuffledAnswers.map((answer) => (
                <button
                  key={answer.text}
                  onClick={() => answerQuiz(answer.type)}
                >
                  {answer.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }


if (screen === "reveal") {
  return (
    <div className="app reveal-bg">
      <div className="phone-shell">
        <div className="reveal-card character-result">
          <p className="eyebrow">Your companion is</p>

          <img
            src={CHARACTER_PROFILE_IMAGES[validMomo]}
            alt={momoData.name}
            className="character-profile-image"
          />

          <button className="primary-btn" onClick={() => setScreen("home")}>
            Enter Momo World
          </button>
        </div>
      </div>
    </div>
  );
}

const currentRoom = ROOMS[roomIndex];

const isVisiting = Boolean(visitingWorld);

const activeRoomIndex = isVisiting ? visitRoomIndex : roomIndex;
const activeMomo = isVisiting ? visitingWorld.momoType || "Momo" : validMomo;
const activeFolder = CHARACTER_FOLDER[activeMomo] || "momo";
const activeRoom = ROOMS[activeRoomIndex] || ROOMS[0];
const activeDisplayName = isVisiting
  ? visitingWorld.customName || visitingWorld.username || "Friend"
  : displayName;

const activePlacedItems = isVisiting
  ? visitingWorld.placedItems || {}
  : placedItems;

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

const roomTime = isNightTime(currentTime) ? "night" : "morning";

const currentActiveRooms = isVisiting
  ? visitingWorld?.activeRooms || {}
  : activeRooms;

const activeWallpaperId =
  currentActiveRooms[activeRoom.id] || `${activeRoom.id}-default`;

const activeWallpaper =
  WALLPAPERS.find((wallpaper) => wallpaper.id === activeWallpaperId) ||
  WALLPAPERS.find((wallpaper) => wallpaper.id === `${activeRoom.id}-default`);

const roomAsset = activeWallpaper?.style === "default"
  ? activeRoom.id
  : `${activeRoom.id}-${activeWallpaper?.style}`;

const isDefault = activeWallpaper?.style === "default";

const roomBg = isDefault
  ? `/assets/rooms/${activeFolder}/${roomAsset}-${roomTime}.png`
  : `/assets/rooms/shop/${roomAsset}-${roomTime}.png`;

function getHudMood() {
  if (isMomoSleepTime(currentTime) || momoAction === "sleeping" || momoAction === "sleepy") {
    return "sleeping";
  }

  if (["hungry", "messy", "lonely"].includes(emotion)) {
    return "crying";
  }

  if (condition.hunger < 18 || condition.happiness < 18) {
    return "angry";
  }

  return "happy";
}

const hudMood = getHudMood();

const hudMoodLabel = {
  happy: "Happy",
  sleeping: "Sleeping",
  crying: "Needs Love",
  angry: "Upset",
}[hudMood];

const hudMoodFace = `/moods/${CHARACTER_FOLDER[validMomo]}/${hudMood}.png`;

  const momoSprite = getCharacterSprite(
  validMomo,
  momoAction,
  emotion,
  spriteFrame,
  currentTime
);

const postcardTarget = postcardRecipient || visitingWorld;

const postcardTargetName =
  postcardTarget?.customName ||
  postcardTarget?.username ||
  "Friend";

function renderPostcardPanel() {
  if (!showPostcardPanel) return null;

  return (
    <div className="postcard-panel postcard-editor-panel">
      <button
        className="postcard-close"
        onClick={() => {
          setShowPostcardPanel(false);
          setSelectedPostcard(null);
          setPostcardMode("choose");
          setPostcardMessage("");
          setPostcardRecipient(null);
          setSelectedGiftId("");
          setPostcardError("");
          setPostcardSent(false);
        }}
      >
        ×
      </button>

      {postcardMode === "choose" && (
        <>
          <h3>Choose Stationery</h3>
          <p>Pick a postcard for {postcardTargetName}.</p>

          <div className="postcard-theme-grid">
            {POSTCARD_THEMES.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedPostcard(card);
                  setPostcardMode("write");
                }}
              >
                <img src={card.image} alt={card.name} />
                <span>{card.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {postcardMode === "write" && selectedPostcard && (
        <>
          <h3>{selectedPostcard.name} Postcard</h3>
          <p>Write your own note.</p>

          <div className="postcard-writing-card">
            <img src={selectedPostcard.image} alt={selectedPostcard.name} />

            <textarea
              value={postcardMessage}
              onChange={(e) => setPostcardMessage(e.target.value)}
              placeholder="Write something sweet..."
              maxLength={180}
            />
          </div>

          <div className="postcard-count">
            {postcardMessage.length}/180
          </div>

        <div className="postcard-gift-box">
  <strong>Attach Gift? 🎁</strong>
  <p>Buy a small gift to send with your postcard.</p>

  <div className="shop-tabs">
  <button
    className={giftTab === "food" ? "active" : ""}
    onClick={() => {
      setGiftTab("food");
      setSelectedGiftId("");
    }}
  >
    🍙 Food
  </button>

  <button
    className={giftTab === "wallpaper" ? "active" : ""}
    onClick={() => {
      setGiftTab("wallpaper");
      setSelectedGiftId("");
    }}
  >
    🏠 Wallpaper
  </button>
</div>

  <div className="postcard-gift-grid">
    <button
      type="button"
      className={!selectedGiftId ? "selected" : ""}
      onClick={() => {
  setSelectedGiftId("");
  setSelectedGiftType("");
}}
    >
      <span>✨</span>
      <small>No Gift</small>
    </button>

    {giftTab === "food" &&
  FOODS.map((item) => (
    <button
      type="button"
      key={item.id}
      className={selectedGiftId === item.id ? "selected" : ""}
      onClick={() => {
  setSelectedGiftId(item.id);
  setSelectedGiftType("food");
}}
    >
      <img
  src={item.icon}
  alt={item.name}
  className="postcard-gift-icon"
/>
      <small>{item.name}</small>
      <small>{item.price} ✨</small>
    </button>
  ))}

{giftTab === "wallpaper" &&
  WALLPAPERS.filter((item) => item.price > 0).map((item) => (
    <button
      type="button"
      key={item.id}
      className={selectedGiftId === item.id ? "selected" : ""}
      onClick={() => {
  setSelectedGiftId(item.id);
  setSelectedGiftType("wallpaper");
}}
    >
      <img
  src={item.icon}
  alt={item.name}
  className="postcard-gift-icon"
/>
      <small>{item.name}</small>
      <small>{item.price} ✨</small>
    </button>
  ))}
  </div>
</div>

          <div className="postcard-editor-actions">
            <button
              onClick={() => {
                setPostcardMode("choose");
                setSelectedPostcard(null);
                setPostcardMessage("");
              }}
            >
              Back
            </button>

            <button
              onClick={() => sendPostcard(postcardMessage)}
              disabled={sendingPostcard || postcardSent || !postcardMessage.trim()}
            >
              {sendingPostcard ? "Sending..." : "Send"}
            </button>
          </div>

          {postcardError && (
            <p className="postcard-error">
              {postcardError}
            </p>
          )}

          {postcardSent && (
            <strong className="postcard-sent">
              Postcard sent! ✨
            </strong>
          )}
        </>
      )}
    </div>
  );
}

if (visitingWorld) {
  const visitMomo = visitingWorld.momoType || "Momo";
  const visitFolder = CHARACTER_FOLDER[visitMomo] || "momo";
  const visitRoom = ROOMS[visitRoomIndex] || ROOMS[0];
  const visitName = visitingWorld.customName || visitingWorld.username || "Friend";
  const visitActiveWallpaperId =
  visitingWorld?.activeRooms?.[visitRoom.id] || `${visitRoom.id}-default`;

const visitActiveWallpaper =
  WALLPAPERS.find((wallpaper) => wallpaper.id === visitActiveWallpaperId) ||
  WALLPAPERS.find((wallpaper) => wallpaper.id === `${visitRoom.id}-default`);

const visitRoomAsset =
  visitActiveWallpaper?.style === "default"
    ? visitRoom.id
    : `${visitRoom.id}-${visitActiveWallpaper?.style}`;

const visitRoomBg =
  visitActiveWallpaper?.style === "default"
    ? `/assets/rooms/${visitFolder}/${visitRoomAsset}-${roomTime}.png`
    : `/assets/rooms/shop/${visitRoomAsset}-${roomTime}.png`;
  const visitSprite = `/characters/${visitFolder}/happy.png`;
  const visitItems = visitingWorld.placedItems?.[visitRoom.id] || [];

  return (
    <div className={`app ${phase} visit-mode`}>
      {transitionLoading && (
  <TransitionLoader message={transitionLoading} />
)}
      <div className="phone-shell">
        <main className="momo-world new-home">

          <div className="visit-top-bar">
            <button
            className="visit-back-btn"
            onClick={() => {
              setShowPostcardPanel(false);
              setPostcardRecipient(null);
              setSelectedGiftId("");
              setPostcardError(""); 
              setSelectedPostcard(null);
              setPostcardMode("choose");
              setPostcardMessage("");
              setPostcardSent(false);

              showTransition(
            "Returning home...",
            () => {
              setVisitingWorld(null);
              setVisitRoomIndex(0);
              setScreen("home");
            },
            700
          );
            }}
          >
            ← Home
          </button>

            <div>
                <p>Visiting</p>

                <h3>{visitName}'s World</h3>

                <small
                  style={{
                    display: "block",
                    marginTop: 4,
                    opacity: 0.75,
                    fontWeight: 700,
                  }}
                >
                  {visitRoom.name}
                </small>
              </div>
          </div>

          <section
              className="world-window"
              onTouchStart={(e) => setVisitTouchStart(e.touches[0].clientX)}
              onTouchEnd={handleVisitTouchEnd}
            >
            <img
              className="room-bg-image"
              src={visitRoomBg}
              alt={`${visitName}'s ${visitRoom.name}`}
            />

            <div className="thought-bubble">
              Welcome to {visitName}'s {visitRoom.name}.
            </div>

            <div className="visit-placed-items">
              {visitItems.map((itemId, index) => {
                const item = FOODS.find((shopItem) => shopItem.id === itemId);

                return (
                  <span
                    key={`${itemId}-${index}`}
                    style={{
                      left: `${22 + index * 15}%`,
                    }}
                  >
                    {item?.icon || "✨"}
                  </span>
                );
              })}
            </div>

            <button
              className="momo-character happy"
              style={{
                "--momo-color": MOMO_TYPES[visitMomo]?.color,
                "--momo-blush": MOMO_TYPES[visitMomo]?.blush,
                left: "50%",
              }}
              type="button"
            >
              <span className="momo-shadow" />
              <span className="momo-body">
                <img
                  src={momoSprite}
                  alt={displayName}
                  className={`momo-sprite ${facingLeft ? "flip" : ""}`}
                />
              </span>

              </button>
          </section>

          <div className="visit-actions">
  <button
    onClick={() => {
      setPostcardRecipient(visitingWorld);
      setShowPostcardPanel(true);
      setSelectedPostcard(null);
      setPostcardMode("choose");
      setPostcardMessage("");
      setPostcardSent(false);
    }}
  >
    💌 Write Postcard
  </button>
</div>

{renderPostcardPanel()}

        </main>
      </div>
    </div>
  );
}


    return (
  <div className={`app ${phase} emotion-${emotion} vibe-${customVibe} ${settings.reduceMotion ? "reduce-motion" : ""}`}>
    {transitionLoading && (
  <TransitionLoader message={transitionLoading} />
)}
    <div className="phone-shell">
      <main className="momo-world new-home">

        {newBadge && (
          <div className="badge-toast">
            <span>{newBadge.icon}</span>
            <div>
              <strong>Badge unlocked</strong>
              <p>{newBadge.name}</p>
            </div>
          </div>
        )}

{renderPostcardPanel()}

        <div className="game-hud">
          <div className="hud-left">
            <button
                type="button"
                className="hud-profile"
                onClick={() => {
                  setShowCondition(true);
                  setTimeout(() => setShowCondition(false), 5000);
                }}
              >
              <img
                src={hudMoodFace}
                alt={`${displayName} is ${hudMoodLabel}`}
                className="hud-mood-face"
              />
              <div>
                <p>{hudMoodLabel}</p>
                <h3>{displayName}</h3>
              </div>
            </button>

            {showCondition && (
              <div className="hud-condition-panel">

                <div className="condition-row">
                  <span>🍙</span>
                  <div className="condition-bar">
                    <div
                      className="condition-fill"
                      style={{ width: `${condition.hunger}%` }}
                    />
                  </div>
                </div>

                <div className="condition-row">
                  <span>😊</span>
                  <div className="condition-bar">
                    <div
                      className="condition-fill"
                      style={{ width: `${condition.happiness}%` }}
                    />
                  </div>
                </div>

                <div className="condition-row">
                  <span>⚡</span>
                  <div className="condition-bar">
                    <div
                      className="condition-fill"
                      style={{ width: `${condition.energy}%` }}
                    />
                  </div>
                </div>

                <div className="condition-row">
                  <span>🛁</span>
                  <div className="condition-bar">
                    <div
                      className="condition-fill"
                      style={{ width: `${condition.cleanliness}%` }}
                    />
                  </div>
                </div>

                <div className="condition-row bond-row">
                  <span>🤝</span>
                  <strong className="bond-label">
                    {getBondTitle(bondPoints)}
                  </strong>
                </div>

              </div>
            )}

            <div className="hud-time">
              🕒{" "}
              {currentTime.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>

          <div className="hud-icons">
            <button onClick={openMailbox}>
              <img src="/ui/top-bar/mail.png" alt="Mail" />
              {unreadMail > 0 && <b>{unreadMail}</b>}
            </button>

            <button onClick={() => setShowDailyReward(true)}>
              <img src="/ui/top-bar/gift.png" alt="Daily Gift" />
            </button>

            <div className="hud-sparks">
              <img src="/ui/top-bar/sparks.png" alt="Sparks" />
              <span>{sparks}</span>
            </div>

            <button onClick={() => setScreen("settings")}>
              <img src="/ui/top-bar/settings.png" alt="Settings" />
            </button>
          </div>
        </div>

        {momoRoomMessage && (
          <div className="momo-room-message">
            {momoRoomMessage}
          </div>
        )}

        <section
          className={`world-window room-${room.id}`}
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={handleTouchEnd}
        >
          <img
          className={`room-bg-image ${roomFading ? "fade-out" : ""}`}
          src={roomBg}
          alt={room.name}
        />
        

          <div className="thought-bubble">{thought}</div>

          <button
            className={`momo-character ${momoAction}`}
            style={{
              "--momo-color": momoData.color,
              "--momo-blush": momoData.blush,
              left: `${momoX}%`,
            }}
            onClick={tapMomo}
            aria-label="Tap Momo"
          >
            {pop && <span className="tap-pop">{pop}</span>}
            <span className="tap-burst"><i /> <i /> <i /></span>
            <span className="momo-shadow" />
            <span className="momo-body">
              <img
                src={momoSprite}
                alt={displayName}
                className={`momo-sprite ${facingLeft ? "flip" : ""}`}
              />
            </span>

                {condition.cleanliness < 35 && (
                  <div className="stink-clouds">
                    <img src="/ui/effects/stink-cloud.png" alt="" />
                    <img src="/ui/effects/stink-cloud.png" alt="" />
                  </div>
                )}

          </button>

<div className="side-menu">
  <button
  className="side-menu-toggle"
  onClick={() => setSideMenuOpen(true)}
>
  <img src="/ui/bottom-bar/menu.png" alt="Menu" />
</button>

  {sideMenuOpen && (
    <div
  className="momo-menu-backdrop"
  onClick={() => setSideMenuOpen(false)}
>
      <div
  className="momo-menu-panel"
  onClick={(e) => e.stopPropagation()}
>

        

              <h2>✨ Menu ✨</h2>

      <div className="momo-menu-grid">
        <button
          className="menu-image-button"
          onClick={() => {
            napMomo();
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/nap.png" alt="Nap" />
        </button>

        <button
          className="menu-image-button"
          onClick={() => {
            setScreen("shop");
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/shop.png" alt="Shop" />
        </button>

        <button
          className="menu-image-button"
          onClick={() => {
            setScreen("friends");
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/friends.png" alt="Friends" />
        </button>

        <button
          className="menu-image-button"
          onClick={() => {
            setScreen("house");
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/decorate.png" alt="Decorate" />
        </button>

        <button
          className="menu-image-button"
          onClick={() => {
            setScreen("wish-well");
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/lucky-spin.png" alt="Lucky Spin" />
        </button>

        <button
          className="menu-image-button"
          onClick={() => {
            cleanMomo();
            setSideMenuOpen(false);
          }}
        >
          <img src="/menu/bath.png" alt="Bath" />
        </button>
      </div>
      </div>
    </div>
  )}
</div>

          <div className="room-action-buttons">
  <button
    className={momoData.favorite === "feed" ? "fav" : ""}
    onClick={() => {
      setActiveGame(null);
      setShowArcade(false);
      interact("feed");
    }}
  >
    <img src="/ui/bottom-bar/feed.png" alt="Feed" />
  </button>

  <button
    className={momoData.favorite === "play" ? "fav" : ""}
    onClick={() => setShowArcade(true)}
  >
    <img src="/ui/bottom-bar/arcade.png" alt="Arcade" />
  </button>

  <button
    className={momoData.favorite === "talk" ? "fav" : ""}
    onClick={() => interact("talk")}
  >
    <img src="/ui/bottom-bar/messages.png" alt="Messages" />
  </button>
</div>
        </section>

{false && (
        <nav className="bottom-dock">
  <button onClick={() => setScreen("memories")}>📖</button>

  <button onClick={() => setScreen("shop")}>🛍️</button>

  <button onClick={() => setScreen("friends")}>👥</button>

  <button onClick={() => setScreen("collection")}>🎒</button>
</nav>
)}

          {dockOpen && (
            <div className="more-dock">
              
              <button onClick={() => { setScreen("quests"); setDockOpen(false); }}>✅ Quests</button>
              <button onClick={() => { captureMoment(); setDockOpen(false); }}>📷 Photo</button>
              <button onClick={() => { setScreen("discoveries"); setDockOpen(false); }}>🔎 Items</button>
              <button onClick={() => { setScreen("minigame"); setDockOpen(false); }}>⭐ Game</button>
              <button onClick={() => { napMomo(); setDockOpen(false); }}>💤 Nap</button>
              <button onClick={() => { cleanMomo(); setDockOpen(false); }}>🛁 Clean</button>
              <button onClick={() => { setScreen("moment"); setDockOpen(false); }}>💌 Share</button>
            </div>
          )}

{showArcade && (
  <div className="arcade-overlay">
    <div className="arcade-panel">

      <button
        className="arcade-close"
        onClick={() => setShowArcade(false)}
      >
        ×
      </button>

      <h2 className="arcade-title">
         Momo Arcade
      </h2>

      <div className="arcade-grid">

        <button
          className="arcade-game-card"
          onClick={() => {
            resetDreamMatch();
            setActiveGame("dream-match");
            setShowArcade(false);
          }}
        >
          <img
          src="/assets/arcade/dream-catch.png"
          alt="Lulu's Dream Match"
          className="arcade-game-img"
        />

          <h3>Dream Match</h3>

          <p>🏆 Best {dreamBest}</p>
        </button>

        <button
        className="arcade-game-card"
        onClick={() => {
          setTrailScore(0);
          setTrailLane(1);
          setTrailItems([]);
          setTrailGameOver(false);
          setActiveGame("star-trail");
          setShowArcade(false);
        }}
      >
        <img
          src="/assets/arcade/star-trail.png"
          alt="Star Trail"
          className="arcade-game-img"
        />

        <h3>Star Trail</h3>

        <p>🏆 Best {trailBest}</p>
        </button>


       <button
        className="arcade-game-card"
        onClick={() => {
          setActiveGame("bubu-pantry");
          setShowArcade(false);
        }}
      >
        <img
          src="/assets/arcade/bubu-pantry.png"
          alt="Bubu's Pantry"
          className="arcade-game-img"
        />

        <h3>Bubu's Pantry</h3>

        <p>🏆 Best {bubuBest}</p>
      </button>


        <button


        className="arcade-game-card"
        onClick={() => {
          setActiveGame("sweet-stack");
          setShowArcade(false);
        }}
      >
        <img
          src="/assets/arcade/sweet-stack.png"
          alt="Momo's Sweet Stack"
          className="arcade-game-img"
        />

        <h3>Sweet Stack</h3>

        <p>🏆 Best {sweetBest}</p>
      </button>

      <button
        className="arcade-game-card"
        onClick={() => {
          startMemoryGame(memoryGame.level || 1);
          setActiveGame("memory-match");
          setShowArcade(false);
        }}
      >
        <img
          src="/assets/arcade/memory-match.png"
          alt="Nini's Moonlight Memories"
          className="arcade-game-img"
        />

        <h3>Memories</h3>

        <p>🏆 Best Lv {miniGameHighScore}</p>
      </button>

        <button className="arcade-game-card">
          <img
            src="/assets/arcade/momo-crossing.png"
            alt="Riko"
            className="arcade-game-img"
          />

          <h3>Riko</h3>

          <p>🚧 Coming Soon</p>
        </button>

             </div>
    </div>
  </div>
)}




{activeGame === "dream-match" && (
  <div className="game-overlay">
    <div className="dream-match-panel">

      <div className="dream-match-top">
        <div className="dream-title-block">
          <p>Lulu's</p>
          <h2>Dream Match</h2>
        </div>

        <button
          className="dream-close"
          onClick={() => {
            setActiveGame(null);
            setDreamChain([]);
            setDreamDragging(false);
          }}
        >
          ×
        </button>
      </div>

      <div className="dream-mini-stats">
        <div>
          <span>LV</span>
          <strong>{dreamLevel}</strong>
        </div>

        <div>
          <span>GOAL</span>
          <strong>{dreamGoal}</strong>
        </div>

        <div>
          <span>SCORE</span>
          <strong>{dreamScore}</strong>
        </div>

        <div>
          <span>MOVES</span>
          <strong>{dreamMoves}</strong>
        </div>
      </div>

      <div

        className="dream-board"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const cell = getDreamCellFromPointer(e);
          setDreamDragging(true);
          setDreamChain([]);
          setDreamMessage("Keep dragging matching icons!");
          if (cell) setDreamChain([cell.index]);
        }}
        onPointerMove={(e) => {
          if (!dreamDragging) return;
          const cell = getDreamCellFromPointer(e);
          addDreamCell(cell);
        }}
        onPointerUp={finishDreamChain}
        onPointerCancel={finishDreamChain}
      >
        <svg className="dream-line-layer" viewBox="0 0 100 100">
          {dreamChain.length >= 2 && (
            <polyline
              points={dreamChain
                .map((index) => {
                  const row = Math.floor(index / DREAM_SIZE);
                  const col = index % DREAM_SIZE;
                  return `${((col + 0.5) / DREAM_SIZE) * 100},${((row + 0.5) / DREAM_SIZE) * 100}`;
                })
                .join(" ")}
            />
          )}
        </svg>

        {dreamBoard.map((tile, index) => {
          const selected = dreamChain.includes(index);

          return (
            <button
              key={tile.id}
              className={`dream-tile ${selected ? "selected" : ""}`}
              type="button"
            >
              <img
              src={tile.icon.src}
              alt={tile.icon.type}
              className="dream-icon-img"
            />
            </button>
          );
        })}
      </div>


      {dreamGameOver && (
        <div className="dream-result">
          <h2>{dreamWon ? "✨ Dream Complete!" : "🌙 So Close!"}</h2>

          <p>
            Score: {dreamScore} / {dreamGoal}
          </p>

          <p>
            {dreamWon ? "+25 Sparks · +5 Bond" : "+5 Sparks"}
          </p>

          {dreamWon && !dreamRewardClaimed && (
            <button
              onClick={() => {
                setSparks((s) => s + 25);
                setBondPoints((b) => b + 5);
                setDreamRewardClaimed(true);
                showPop("+25 ✨");
              }}
            >
              Claim Reward
            </button>
          )}

                  {dreamWon && (
          <button onClick={nextDreamLevel}>
            Next Level
          </button>
        )}

          <button onClick={resetDreamMatch}>
            Play Again
          </button>

          <button
            onClick={() => {
              setActiveGame(null);
              resetDreamMatch();
            }}
          >
            Quit
          </button>
        </div>
      )}


      <div className="dream-bottom">
        <p>{dreamMessage}</p>
        <span>Drag 3+ matching friends to make them sparkle.</span>
      </div>

    </div>
  </div>
)}


{activeGame === "memory-match" && (
  <div className="game-overlay">
    <div className="memory-match-panel">

      <img
        src="/assets/memory-match/background.png"
        alt=""
        className="memory-match-bg"
      />

      <button
        className="memory-close"
        onClick={() => {
          setActiveGame(null);
          setMemoryGame((game) => ({
            ...game,
            flipped: [],
            reveal: false,
          }));
        }}
      >
        ×
      </button>

     
      <div className="memory-hearts-pill">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index} className={index < memoryGame.triesLeft ? "" : "empty"}>
            ❤️
          </span>
        ))}
        <small>TRIES</small>
      </div>

      <div className="memory-level-pill">
        <span>LEVEL</span>
        <strong>{memoryGame.level}</strong>
      </div>

    
      <div className="memory-title">
        <p>Nini's</p>
        <h2>Moonlight</h2>
        <h3>Memories</h3>
        <span>{memoryGame.message}</span>
      </div>

      <div className="memory-board">
        {memoryGame.cards.map((card) => {
          const isFaceUp =
            memoryGame.reveal ||
            memoryGame.flipped.includes(card.uid) ||
            memoryGame.matched.includes(card.uid);

          const isMatched = memoryGame.matched.includes(card.uid);

          return (
            <button
              key={card.uid}
              className={`memory-card-btn ${isFaceUp ? "face-up" : ""} ${isMatched ? "matched" : ""}`}
              onClick={() => pressMemoryCard(card)}
            >
              <span className="memory-card-inner">
                <span className="memory-card-front">
                  <img src={card.src} alt={card.name} />
                </span>

                <span className="memory-card-back">
                  <img src="/assets/memory-match/card-back.png" alt="" />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <img
        src="/assets/memory-match/nini-mascot.png"
        alt="Nini"
        className="memory-nini"
      />

      <div className="memory-quote">
        <img src="/assets/memory-match/moon.png" alt="" />
        <p>Good memories shine in your heart. ♡</p>
      </div>

      {memoryGame.finished && (
        <div className="memory-result">
          <h2>{memoryGame.failed ? "Try Again?" : "Memory Complete!"}</h2>

          <p>
            {memoryGame.failed
              ? "Nini lost all her hearts."
              : `Level ${memoryGame.level} clear!`}
          </p>

          {!memoryGame.failed && !memoryGame.rewardClaimed && (
            <button onClick={claimMemoryReward}>
              Claim Reward
            </button>
          )}

          {!memoryGame.failed && (
            <button onClick={nextMemoryLevel}>
              Next Level
            </button>
          )}

          <button onClick={() => startMemoryGame(memoryGame.level)}>
            Play Again
          </button>

          <button
            onClick={() => {
              setActiveGame(null);
            }}
          >
            Quit
          </button>
        </div>
      )}

    </div>
  </div>
)}



                {activeGame === "bubu-pantry" && (
  <BubuPantry onClose={() => setActiveGame(null)} />
)}






                          {activeGame === "star-trail" && (
              <div className="game-overlay">
                <div className="trail-game-panel">

                  <button
                    className="game-close"
                    onClick={() => {
                      setActiveGame(null);
                      setTrailGameOver(false);
                    }}
                  >
                    ×
                  </button>

                 <div className="trail-score-pill">
                  SCORE {trailScore}
                </div>

                <div className="trail-best-pill">
                  BEST {trailBest}
                </div>

                 <div
                    className="trail-play-area"
                    onTouchStart={(e) => {
                      setTrailTouchStart(e.touches[0].clientX);
                    }}
                    onTouchEnd={(e) => {
                      if (trailTouchStart === null) return;

                      const endX = e.changedTouches[0].clientX;
                      const diff = endX - trailTouchStart;

                      if (Math.abs(diff) > 35) {
                        if (diff < 0) {
                          setTrailLane((lane) => Math.max(0, lane - 1));
                        } else {
                          setTrailLane((lane) => Math.min(2, lane + 1));
                        }
                      }

                      setTrailTouchStart(null);
                    }}
                  >
              

                    {trailItems.map((item) => (
                      <div
                        key={item.id}
                        className={`trail-item ${item.type}`}
                        style={{
                          left: `${[25, 50, 75][item.lane]}%`,
                          top: `${item.y}%`,
                        }}
                      >
                        <img
                          src={
                            item.type === "star"
                              ? "/assets/arcade/crystal.png"
                              : item.type === "cloud"
                              ? "/assets/arcade/storm-cloud.png"
                              : "/assets/arcade/meteor.png"
                          }
                          alt=""
                        />
                      </div>
                    ))}

                    <div
                      className="trail-player"
                      style={{
                        left: `${[25, 50, 75][trailLane]}%`,
                      }}
                    >
                      <img src="/characters/kiki/happy.png" alt="Kiki" />
                    </div>
                  </div>

                  {trailGameOver && (
                    <div className="snack-game-over">
                      <h2>☁️ Oops!</h2>
                      <p>Score: {trailScore}</p>
                      <p>🏆 Best: {Math.max(trailBest, trailScore)}</p>
                      <p>+{Math.floor(trailScore / 2)} ✨ Sparks</p>
                      <p>+{Math.max(1, Math.floor(trailScore / 5))} Bond</p>

                      <button
                        onClick={() => {
                          setTrailScore(0);
                          setTrailLane(1);
                          setTrailItems([]);
                          setTrailGameOver(false);
                        }}
                      >
                        Play Again
                      </button>

                      <button
                        onClick={() => {
                          setActiveGame(null);
                          setTrailGameOver(false);
                        }}
                      >
                        Quit
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}


{activeGame === "sweet-stack" && (
  <div className="game-overlay">
    <div className="sweet-stack-panel">

      <img
        src="/assets/sweet-stack/sweet-stack-background.png"
        alt=""
        className="sweet-stack-bg"
      />

      <button
        className="game-close sweet-stack-close"
        onClick={() => {
          setActiveGame(null);
          resetSweetStack();
        }}
      >
        ×
      </button>

      <div className="sweet-stack-top">
        <div>
          <span>LEVEL</span>
          <strong>{sweetLevel}</strong>
        </div>

        <div>
          <span>SCORE</span>
          <strong>{sweetScore}</strong>
        </div>

        <div>
          <span>GOAL</span>
          <strong>{sweetGoal}</strong>
        </div>
      </div>

      <div className="sweet-stack-attempt">
        {sweetAttempt} / {SWEET_DESSERTS.length - 1} Stacks
      </div>

      <div className="sweet-stack-combo">
        <span>COMBO</span>
        <strong>{sweetCombo}</strong>
        <p>x{getSweetMultiplier(sweetCombo)}</p>
      </div>

      <img
        src="/assets/sweet-stack/stack-points-panel.png"
        alt="Stack Points"
        className="sweet-stack-points"
      />

      <div className="sweet-stack-next">
        <span>NEXT</span>
        {SWEET_DESSERTS[sweetAttempt + 1] && (
          <img
            src={SWEET_DESSERTS[sweetAttempt + 1].src}
            alt=""
          />
        )}
      </div>

      <div className="sweet-stack-play-area" onClick={placeSweetDessert}>
      
        {sweetJudgement && (
          <div className={`sweet-judgement ${sweetJudgement.toLowerCase()}`}>
            {sweetJudgement}
          </div>
        )}
        {sweetStack.map((dessert, index) => (
          <img
            key={`${dessert.id}-${index}`}
            src={dessert.src}
            alt=""
            className={`
              sweet-layer
              sweet-layer-${index}
              ${landingLayer === index ? "land" : ""}
            `}
            style={{
  bottom:
    index === 0
      ? "-20px"
      : `${index * 38}px`,
  zIndex: index + 2,
}}
          />
        ))}

        {!sweetGameOver && SWEET_DESSERTS[sweetAttempt + 1] && (
          <img
            src={SWEET_DESSERTS[sweetAttempt + 1].src}
            alt=""
            className="sweet-moving-dessert"
      style={{
        left: `${sweetX}%`,
      }}
          />
        )}
      </div>

      <div className="sweet-stack-message">
        {sweetMessage}
      </div>

      {sweetGameOver && (
        <div className="sweet-stack-result">
          <h2>{sweetWon ? "Bakery Complete!" : "Game Over"}</h2>
          <p>Score: {sweetScore} / {sweetGoal}</p>
          <p>🏆 Best: {Math.max(sweetBest, sweetScore)}</p>

          {sweetWon && !sweetRewardClaimed && (
            <button
              onClick={() => {
                setSparks((s) => s + 25);
                setBondPoints((b) => b + 5);
                setSweetRewardClaimed(true);
                showPop("+25 ✨");
              }}
            >
              Claim Reward
            </button>
          )}

          {sweetWon && (
            <button onClick={nextSweetLevel}>
              Next Level
            </button>
          )}

          <button onClick={resetSweetStack}>
            Play Again
          </button>

          <button
            onClick={() => {
              setActiveGame(null);
              resetSweetStack();
            }}
          >
            Quit
          </button>
        </div>
      )}

    </div>
  </div>
)}



{screen === "food" && (
  <Overlay title="Food Bag" onClose={() => setScreen("home")}>
    <p className="soft-copy">Choose something from your Food Bag.</p>

    <div className="food-grid">
      {foodBag
  .filter((id, index, bag) => bag.indexOf(id) === index)
  .map((foodId) => {
    const food = FOODS.find((f) => f.id === foodId);
if (!food) return null;

const count = foodBag.filter((id) => id === foodId).length;

return (
        <button
          className="food-card"
          key={food.id}
          onClick={() => feedFood(food)}
        >
          <img src={food.icon} alt={food.name} className="food-icon-img" />
          <strong>{food.name}</strong>
          <small>×{count}</small>
        </button>
          );
        })}
    </div>
  </Overlay>
)}

                    {screen === "minigame" && (
  <Overlay title="Momo Memory" onClose={() => setScreen("home")}>
    <div className="memory-game-head">
      <p>Round {memoryGame.round}</p>
      <p>Tries {memoryGame.triesLeft}</p>
      <p>Best {miniGameHighScore}</p>
    </div>

    <div className="memory-dream-box">
      <p>{memoryGame.message}</p>

      <div className="memory-card-grid">
        {memoryGame.cards.map((card) => {
          const isFaceUp =
            memoryGame.reveal ||
            memoryGame.flipped.includes(card.id) ||
            memoryGame.matched.includes(card.id);

          return (
            <button
              key={card.id}
              className={`memory-card-tile ${isFaceUp ? "face-up" : ""}`}
              onClick={() => pressMemoryCard(card)}
            >
              <span>{isFaceUp ? card.symbol : "?"}</span>
            </button>
          );
        })}
      </div>

      {memoryGame.finished && memoryGame.round < 3 && (
            <button
              className="primary-btn full"
              onClick={() => startMemoryGame(memoryGame.round + 1, memoryGame.triesLeft)}
            >
              Next Round
            </button>
          )}

      {memoryGame.finished && (
        <button
          className="primary-btn full secondary-memory"
          onClick={() => startMemoryGame(1, 3)}
        >
          Play Again
        </button>
      )}
    </div>
  </Overlay>
)}

          {screen === "quests" && (
            <Overlay title="Today’s Tiny Quests" onClose={() => setScreen("home")}>
              <div className="quest-list">
                {QUESTS.map((quest) => (
                  <div className={`quest-card ${questDone[quest.id] ? "done" : ""}`} key={quest.id}>
                    <span>{questDone[quest.id] ? "✅" : "○"}</span>
                    <p>{quest.text}</p>
                    <strong>+{quest.reward} ✨</strong>
                  </div>
                ))}
              </div>
            </Overlay>
          )}

          {screen === "mail" && (
  <Overlay title="Post Office" onClose={() => setScreen("home")}>
    <div className="post-office-shell">
      <div className="post-office-tabs">
        <button
          className={mailTab === "mail" ? "active" : ""}
          onClick={() => setMailTab("mail")}
        >
          📥 Inbox
        </button>

        <button
          className={mailTab === "send" ? "active" : ""}
          onClick={() => setMailTab("send")}
        >
          💌 Send Postcard
        </button>
      </div>

      {mailTab === "mail" && (
        <div className="post-office-inbox">
          {!starterPackClaimed && (
            <button className="mail-inbox-card system-mail">
              <div className="mail-icon">
                ✨
                {!starterPackClaimed && <span className="mail-unread-dot" />}
              </div>

              <div>
                <span>Momo World</span>
                <strong>Welcome Gift</strong>
                <p>Starter Care Package is waiting for you.</p>
              </div>

              <button
                className="mini-claim-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSparks((s) => s + 150);
                  setFoodBag((items) => [
                    ...items,
                    "rice",
                    "rice",
                    "cookie",
                    "cookie",
                  ]);
                  setStarterPackClaimed(true);
                  showPop("+150 ✨");
                }}
              >
                Claim
              </button>
            </button>
          )}


        {incomingRequests.map((request) => (
          <div
            className="mail-inbox-card friend-request-mail"
            key={request.id}
          >
            <div className="mail-icon">
            👥
            <span className="mail-unread-dot" />
          </div>

            <div>
              <span>Friend Request</span>
              <strong>{request.fromUsername || "New Friend"}</strong>
              <p>wants to become friends in Momo World.</p>
              <small>{request.fromMomoType || "Momo"} Companion</small>

              <div className="mail-request-actions">
                <button onClick={() => acceptFriendRequestFromMail(request)}>
                  Accept
                </button>

                <button onClick={() => declineFriendRequestFromMail(request)}>
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}


          {receivedPostcards.map((postcard) => (
            <button
              className="mail-inbox-card"
              key={postcard.id}
              onClick={() => openPostcard(postcard)}
            >
              <div className="mail-icon">
              💌
              {!postcard.read && <span className="mail-unread-dot" />}
            </div>

              <div>
                <span>Postcard</span>
                <strong>From {postcard.fromUsername || "Friend"}</strong>
                <p>
                  {postcard.message
                    ? postcard.message.slice(0, 42)
                    : "Tap to open your postcard."}
                  {postcard.message?.length > 42 ? "..." : ""}
                </p>

                {postcard.gift && (
                  <small>
                    🎁 Gift attached: {postcard.gift.name}
                  </small>
                )}
              </div>

              {postcard.cardImage && (
                <img
                  src={postcard.cardImage}
                  alt=""
                  className="mail-thumb"
                />
              )}
            </button>
          ))}

          {mailbox.map((mail) => (
            <div className="mail-inbox-card" key={mail.id}>
              <div className="mail-icon">
              🌸
              {!mail.read && <span className="mail-unread-dot" />}
            </div>

              <div>
                <span>Momo World</span>
                <strong>{mail.date}</strong>
                <p>{mail.text}</p>
              </div>
            </div>
          ))}

          {starterPackClaimed &&
            receivedPostcards.length === 0 &&
            mailbox.length === 0 && (
              <p className="empty-text">
                No mail yet. Postcards, friend requests, and gifts will appear here.
              </p>
            )}
        </div>
      )}

      {mailTab === "send" && (
        <div className="post-office-send">

        <p className="soft-copy">
          Choose who you'd like to send a postcard to.
        </p>

        {friends.length === 0 ? (
          <div className="send-postcard-empty">
            <p>
              You don't have any friends yet.
            </p>
          </div>
        ) : (
          <div className="friends-list-card">
            {friends.map((friend) => (
              <div className="friends-list-item" key={friend.id}>
                <img
                  src={`/moods/${(friend.momoType || "Momo").toLowerCase()}/happy.png`}
                  alt={friend.momoType || "Momo"}
                />

                <div>
                  <strong>{friend.username || "New Friend"}</strong>
                  <span>{friend.friendCode}</span>
                  <small>{friend.momoType || "Momo"} Companion</small>
                </div>

                <button
                  onClick={() => openPostcardComposer(friend)}
                >
                  Write
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
      )}
    </div>
  </Overlay>
)}


{openedPostcard && (
  <div className="postcard-reader">
    <button
      className="postcard-reader-close"
      onClick={() => setOpenedPostcard(null)}
    >
      ×
    </button>

   <div className="postcard-layout postcard-reader-card">
  <img
    src={openedPostcard.cardImage}
    alt="Opened postcard"
    className="postcard-reader-image"
  />

  <p>{openedPostcard.message}</p>
</div>

{openedPostcard.gift && (
  <div className="postcard-gift-claim">
    <p>
      🎁 {openedPostcard.gift.name}
    </p>

    {openedPostcard.gift.claimed ? (
      <strong>Gift Claimed ✓</strong>
    ) : (
      <button onClick={() => claimPostcardGift(openedPostcard)}>
        Claim Gift
      </button>
    )}
  </div>
)}


    <small>
      From {openedPostcard.fromUsername || "Friend"}
    </small>
  </div>
)}


          {screen === "settings" && (
            <Overlay title="Settings" onClose={() => setScreen("home")}>
              <div className="setting-card">
                <label>Momo name</label>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={momoData.name} />
              </div>

              <div className="setting-card">
                <label>Vibe</label>
                <select value={customVibe} onChange={(e) => setCustomVibe(e.target.value)}>
                  <option value="soft">Soft</option>
                  <option value="silly">Silly</option>
                  <option value="dreamy">Dreamy</option>
                  <option value="cozy">Cozy</option>
                </select>
              </div>

              <div className="setting-row">
                <span>Sound</span>
                <button onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}>{settings.sound ? "On" : "Off"}</button>
              </div>

              <div className="setting-row">
                <span>Reduce motion</span>
                <button onClick={() => setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))}>{settings.reduceMotion ? "On" : "Off"}</button>
              </div>

              

              <div className="danger-zone">
                <button onClick={() => setConfirmReset(!confirmReset)}>Reset save</button>
                {confirmReset && <button className="danger" onClick={hardReset}>Confirm reset</button>}
              </div>
            </Overlay>
          )}

          {showDailyReward && (
            <div className="daily-overlay">
              <div className="daily-panel">
                <button className="daily-close" onClick={() => setShowDailyReward(false)}>
                  ×
                </button>

                <h2>Daily Gift</h2>
                <p>Visit every day to grow closer with {displayName}.</p>

                <div className="daily-grid">
                  {getDailyRewardsForStreak(streak).map((reward, index) => (
                <div
                  className={`daily-card ${index === 6 ? "big-gift" : ""} ${
                    index < streak ? "claimed" : ""
                  }`}
                  key={reward.day}
                >
              <strong>{reward.day}</strong>

                  <img
                    src={reward.icon}
                    alt={reward.label}
                    className="daily-reward-icon"
                  />

                  <p>{reward.label}</p>
                </div>
              ))}
                </div>

                <button className="daily-claim" onClick={claimDailyGift}>
                  {canClaimDaily ? "Claim Today" : "Claimed Today"}
                </button>
              </div>
            </div>
          )}

          {screen === "moment" && (
            <Overlay title="Share a Moment" onClose={() => setScreen("home")}>
              <p className="soft-copy">Tell Momo what happened today. Food, photos, wins, thoughts — anything.</p>
              <textarea value={momentText} onChange={(e) => setMomentText(e.target.value)} placeholder="Today I..." />
              <button className="primary-btn full" onClick={shareMoment}>Save with Momo</button>
            </Overlay>
          )}

          {screen === "memories" && (
            <Overlay title="Memories" onClose={() => setScreen("home")}>
              {memories.length === 0 ? <p className="empty-text">No memories yet.</p> : (
                <div className="memory-list">
                  {memories.map((memory) => (
                    <div className="memory-card" key={memory.id}>
                      <span>{memory.date}</span>
                      <p>{memory.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="section-title">Diary</h3>
              <div className="memory-list">
                {diary.map((entry) => (
                  <div className="memory-card diary-card" key={entry.id}>
                    <span>{entry.date}</span>
                    <p>{entry.text}</p>
                  </div>
                ))}
              </div>
            </Overlay>
          )}

          {screen === "discoveries" && (
            <Overlay title="Tiny Discoveries" onClose={() => setScreen("home")}>
              {discoveries.length === 0 ? <p className="empty-text">Play with Momo to discover tiny treasures.</p> : (
                <div className="discovery-grid">
                  {discoveries.map((item) => <div className="discovery-card" key={item}>{item}</div>)}
                </div>
              )}

              <h3 className="section-title">Hobbies</h3>
              {visibleHobbies.length === 0 ? <p className="empty-text">Buy items to unlock Momo hobbies.</p> : (
                <div className="hobby-list">
                  {visibleHobbies.map((hobby) => <span key={hobby}>{hobby}</span>)}
                </div>
              )}

              <h3 className="section-title">Badges</h3>
              <div className="badge-grid">
                {ACHIEVEMENTS.map((badge) => {
                  const unlocked = achievements.includes(badge.id);
                  return (
                    <div className={`badge-card ${unlocked ? "unlocked" : ""}`} key={badge.id}>
                      <span>{badge.icon}</span>
                      <p>{badge.name}</p>
                    </div>
                  );
                })}
              </div>
            </Overlay>
          )}

{screen === "house" && (
  <Overlay title="House" onClose={() => setScreen("home")}>
    {!selectedHouseRoom ? (
      <div className="house-room-grid">
        {ROOMS.map((roomOption) => (
          <button
            key={roomOption.id}
            onClick={() => setSelectedHouseRoom(roomOption.id)}
          >
            <img
              src={roomOption.icon}
              alt={roomOption.name}
              className="decorate-room-icon"
            />
            <strong>{roomOption.name}</strong>
          </button>
        ))}
      </div>
    ) : (
      <div className="house-wallpaper-list">
        <button
          className="house-back-btn"
          onClick={() => setSelectedHouseRoom(null)}
        >
          ← Back
        </button>

        <h3>
          {ROOMS.find((roomOption) => roomOption.id === selectedHouseRoom)?.name}
        </h3>

        {WALLPAPERS.filter(
            (wallpaper) => wallpaper.room === selectedHouseRoom
          )
          .filter((wallpaper) =>
            unlockedRooms[selectedHouseRoom]?.includes(wallpaper.id)
          )
          .map((wallpaper) => (
            <button
              key={wallpaper.id}
              className={
                activeRooms[selectedHouseRoom] === wallpaper.id
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setActiveRooms((rooms) => ({
                  ...rooms,
                  [selectedHouseRoom]: wallpaper.id,
                }))
              }
            >
             <img
                src={wallpaper.icon}
                alt={wallpaper.name}
                className="decorate-layout-img"
              />
              <strong>{wallpaper.name}</strong>
              {activeRooms[selectedHouseRoom] === wallpaper.id && (
                <small>Using now ✓</small>
              )}
            </button>
          ))}
      </div>
    )}
  </Overlay>
)}

        {screen === "friends" && (
  <Overlay title="Friends" onClose={() => setScreen("home")}>
    <FriendsScreen
      momo={validMomo}
      displayName={displayName}
      bondTitle={bondTitle}
      bondPoints={bondPoints}
      friends={friends}
      onVisitFriend={async (friend) => {
  const friendRef = doc(db, "users", friend.id);
  const friendSnap = await getDoc(friendRef);

  if (!friendSnap.exists()) return;

  const friendData = friendSnap.data();

  console.log(friendData);

  const world = {
  uid: friend.id,
  username: friendData.username,
  friendCode: friendData.friendCode,
  ...friendData.publicWorld,
  activeRooms: friendData.publicWorld?.activeRooms || {},
};

showTransition(
  `Visiting ${world.customName || world.username || "your friend's"} world...`,
  () => {
    setVisitRoomIndex(world.roomIndex || 0);
    setVisitingWorld(world);
    setScreen("home");
  },
  900
);
}}
onSendPostcard={(friend) => {
  setScreen("home");

  setTimeout(() => {
    openPostcardComposer(friend);
  }, 0);
}}
    />
  </Overlay>
)}

        {screen === "collection" && (
  <Overlay title="Collection" onClose={() => setScreen("home")}>

    <h3 className="section-title">Characters</h3>

    <div className="collection-grid">
      {Object.values(MOMO_TYPES).map((character) => (
        <div className="collection-card" key={character.name}>
          <img
            src={CHARACTER_PROFILE_IMAGES[character.name]}
            alt={character.name}
            className="collection-image"
          />

          <strong>{character.name}</strong>

          <p>{character.title}</p>
        </div>
      ))}
    </div>

    <h3 className="section-title">Discoveries</h3>

    {discoveries.length === 0 ? (
      <p className="empty-text">
        Nothing discovered yet.
      </p>
    ) : (
      <div className="discovery-grid">
        {discoveries.map((item) => (
          <div className="discovery-card" key={item}>
            {item}
          </div>
        ))}
      </div>
    )}

    <h3 className="section-title">Badges</h3>

    <div className="badge-grid">
      {ACHIEVEMENTS.map((badge) => {
        const unlocked = achievements.includes(badge.id);

        return (
          <div
            className={`badge-card ${unlocked ? "unlocked" : ""}`}
            key={badge.id}
          >
            <span>{badge.icon}</span>
            <p>{badge.name}</p>
          </div>
        );
      })}
    </div>

  </Overlay>
)}

{screen === "wish-well" && (
  <div className="game-overlay">
    <div className="slot-game-panel">

      <button
        className="game-close"
        onClick={() => {
          setSlotResult(null);
          setSlotSpinning(false);
          setSlotReels([
            { id: "moon", img: "/assets/slots/moon.png", payout: 1000 },
            { id: "star", img: "/assets/slots/star.png", payout: 50 },
            { id: "cloud", img: "/assets/slots/cloud.png", payout: 5 },
          ]);
          setScreen("home");
        }}
      >
        ×
      </button>

      <h2 className="slot-game-title">Lucky Spin</h2>

      <div className="slot-panel">

        <div className="slot-machine-wrap">
          <img
            src="/assets/slots/machine.png"
            alt="Momo Lucky Machine"
            className="slot-machine-img"
          />

          <div className={`slot-reels-layer ${slotSpinning ? "spinning" : ""}`}>
            {slotReels.map((symbol, index) => (
              <div className="slot-reel-window" key={index}>
                <img src={symbol.img} alt={symbol.id} />
              </div>
            ))}
          </div>
        </div>

        <p className="slot-copy">
          Match symbols to win or lose your Sparks!
        </p>

        <div className="slot-sparks">
          You have ✨ {sparks}
        </div>

        <button
          className="slot-spin-btn"
          disabled={sparks < 25 || slotSpinning}
          onClick={spinSlots}
        >
          {slotSpinning ? "Spinning..." : "Spin · 25 ✨"}
        </button>

        {slotResult && (
          <div className={`slot-result-card ${slotResult.amount > 0 ? "win" : "lose"}`}>
            <h3>{slotResult.title}</h3>
            <p>{slotResult.text}</p>
          </div>
        )}

        <img
          src="/assets/slots/paytable.png"
          alt="Payout Table"
          className="slot-paytable-img"
        />

      </div>
    </div>
  </div>
)}

         {screen === "shop" && (
  <Overlay title="Momo Shop" onClose={() => setScreen("home")}>
    <div className="shop-tabs">
      <button
        className={shopTab === "food" ? "active" : ""}
        onClick={() => setShopTab("food")}
      >
        🍙 Food
      </button>

      <button
        className={shopTab === "rooms" ? "active" : ""}
        onClick={() => setShopTab("rooms")}
      >
        🏠 Room Styles
      </button>
    </div>

    <div className="shop-list">
      {shopTab === "food" &&
FOODS.map((food) => {
  const ownedCount = foodBag.filter((itemId) => itemId === food.id).length;

  return (          <div className="shop-card" key={food.id}>
            <div className="shop-icon">
  <img src={food.icon} alt={food.name} className="shop-food-img" />
</div>

            <div>
              <h3>{food.name}</h3>
              <p>{food.reaction}</p>

              <div className="shop-food-info">
                <span>✨ {food.price}</span>
                <small>x{ownedCount}</small>
              </div>
            </div>

            <button
              disabled={sparks < food.price}
              onClick={() => buyFood(food)}
            >
              {sparks < food.price ? "Not Enough ✨" : "Buy"}
            </button>
          </div>
         );
      })}


{shopTab === "rooms" &&
  WALLPAPERS.filter((wallpaper) => !wallpaper.hidden).map((wallpaper) => {
    const owned =
      unlockedRooms[wallpaper.room]?.includes(wallpaper.id);

    const canBuy = sparks >= wallpaper.price;

    return (
      <div className="shop-card room-shop-card" key={wallpaper.id}>
        <button
          type="button"
          className="shop-icon wallpaper-preview-thumb"
          onClick={() => setPreviewWallpaper(wallpaper)}
        >
          <img
            src={wallpaper.icon}
            alt={wallpaper.name}
            className="shop-layout-img"
          />
        </button>

        <div>
          <h3>{wallpaper.name}</h3>
          <p>{wallpaper.room}</p>

          <div className="shop-food-info">
            <span>✨ {wallpaper.price}</span>
          </div>
        </div>

        <button
          disabled={owned || !canBuy}
          onClick={() => buyWallpaper(wallpaper)}
        >
          {owned ? "Owned" : canBuy ? "Buy" : "Not Enough ✨"}
        </button>
      </div>
    );
  })}

    </div>
  </Overlay>
)}


{previewWallpaper && (
  <div
    className="wallpaper-preview-overlay"
    onClick={() => setPreviewWallpaper(null)}
  >
    <button
      className="wallpaper-preview-close"
      onClick={() => setPreviewWallpaper(null)}
    >
      ×
    </button>

    <div
      className="wallpaper-preview-card"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={previewWallpaper.icon}
        alt={previewWallpaper.name}
      />

      <strong>{previewWallpaper.name}</strong>
    </div>
  </div>
)}



        </main>
      </div>
    </div>
  );
}

function Overlay({ title, children, onClose }) {
  return (
    <div className="overlay-backdrop">
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}