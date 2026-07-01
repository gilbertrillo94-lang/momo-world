import { useMemo, useState } from "react";
import "./BubuPantry.css";

const CAPACITY = 4;
const LEVEL_KEY = "momo_bubu_level";
const PROGRESS_KEY = "momo_bubu_progress";

const LEVELS = [
  {
    level: 1,
    twoStarMoves: 12,
    threeStarMoves: 8,
    types: [
      { id: "apple", icon: "🍎" },
      { id: "milk", icon: "🥛" },
      { id: "cookie", icon: "🍪" },
    ],
    extraBaskets: 2,
  },
  {
    level: 2,
    twoStarMoves: 16,
    threeStarMoves: 12,
    types: [
      { id: "apple", icon: "🍎" },
      { id: "milk", icon: "🥛" },
      { id: "cookie", icon: "🍪" },
      { id: "strawberry", icon: "🍓" },
    ],
    extraBaskets: 2,
  },
  {
    level: 3,
    twoStarMoves: 22,
    threeStarMoves: 16,
    types: [
      { id: "apple", icon: "🍎" },
      { id: "milk", icon: "🥛" },
      { id: "cookie", icon: "🍪" },
      { id: "strawberry", icon: "🍓" },
      { id: "honey", icon: "🍯" },
    ],
    extraBaskets: 2,
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLevelConfig(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

function shuffle(array) {
  const next = [...array];

  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

function topItem(basket) {
  return basket[basket.length - 1];
}

function canMove(fromBasket, toBasket) {
  if (fromBasket.length === 0) return false;
  if (toBasket.length >= CAPACITY) return false;
  if (toBasket.length === 0) return true;

  return topItem(fromBasket).id === topItem(toBasket).id;
}

function isBasketComplete(basket) {
  if (basket.length !== CAPACITY) return false;
  return basket.every((item) => item.id === basket[0].id);
}

function isLevelComplete(baskets) {
  return baskets.every(
    (basket) => basket.length === 0 || isBasketComplete(basket)
  );
}

function makeBaskets(level) {
  const config = getLevelConfig(level);
  const groceries = [];

  config.types.forEach((type) => {
    for (let i = 0; i < CAPACITY; i++) {
      groceries.push({
        uid: makeId(),
        id: type.id,
        icon: type.icon,
      });
    }
  });

  const shuffledGroceries = shuffle(groceries);

  const baskets = Array.from(
    { length: config.types.length + config.extraBaskets },
    () => []
  );

  shuffledGroceries.forEach((item, index) => {
    baskets[Math.floor(index / CAPACITY)].push(item);
  });

  return shuffle(baskets);
}

function getStars(moves, config) {
  if (moves <= config.threeStarMoves) return 3;
  if (moves <= config.twoStarMoves) return 2;
  return 1;
}

function getSavedLevel() {
  const saved = Number(localStorage.getItem(LEVEL_KEY) || 1);

  if (!Number.isFinite(saved) || saved < 1) return 1;

  return saved;
}

function getSavedProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveBestResult(level, stars, moves) {
  const progress = getSavedProgress();
  const previous = progress[level];

  const shouldSave =
    !previous ||
    stars > previous.stars ||
    (stars === previous.stars && moves < previous.moves);

  if (!shouldSave) return;

  progress[level] = {
    stars,
    moves,
    completedAt: Date.now(),
  };

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export default function BubuPantry({ onClose, onReward }) {  const [level, setLevel] = useState(() => getSavedLevel());
  const [baskets, setBaskets] = useState(() => makeBaskets(getSavedLevel()));
  const [selectedBasket, setSelectedBasket] = useState(null);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState(
    "Tap a basket, then tap where to move it."
  );
  const [won, setWon] = useState(false);
  const [progress, setProgress] = useState(() => getSavedProgress());

  const config = getLevelConfig(level);

  const stars = useMemo(() => {
    if (!won) return 0;
    return getStars(moves, config);
  }, [won, moves, config]);

  const canAdvance = stars >= 2;
  const best = progress[level];

  function pressBasket(index) {
    if (won) return;

    if (selectedBasket === null) {
      if (baskets[index].length === 0) {
        setMessage("That basket is empty.");
        return;
      }

      setSelectedBasket(index);
      setMessage("Now choose where to place it.");
      return;
    }

    if (selectedBasket === index) {
      setSelectedBasket(null);
      setMessage("Selection cancelled.");
      return;
    }

    const from = baskets[selectedBasket];
    const to = baskets[index];

    if (!canMove(from, to)) {
      setMessage("Only matching snacks can stack together!");
      setSelectedBasket(null);
      return;
    }

    const next = baskets.map((basket) => [...basket]);
    const movedItem = next[selectedBasket].pop();
    next[index].push(movedItem);

    const nextMoves = moves + 1;

    setBaskets(next);
    setMoves(nextMoves);
    setSelectedBasket(null);

    if (isLevelComplete(next)) {
      const finalStars = getStars(nextMoves, config);

      const rewardSparks =
        finalStars === 3 ? 31 : finalStars === 2 ? 24 : 17;

      const rewardBond =
        finalStars === 3 ? 6 : finalStars === 2 ? 4 : 2;

      onReward?.({
        sparks: rewardSparks,
        bond: rewardBond,
        game: "bubu-pantry",
        stars: finalStars,
        level,
      });

      saveBestResult(level, finalStars, nextMoves);
      setProgress(getSavedProgress());
      setWon(true);

      if (finalStars === 3) {
        setMessage("Perfect pantry! Bubu is amazed! ⭐⭐⭐");
      } else if (finalStars === 2) {
        setMessage("Great job! Next pantry unlocked! ⭐⭐");
      } else {
        setMessage(
          "Pantry organized! Try for 2 stars to unlock the next level. ⭐"
        );
      }

      return;
    }



    setMessage(`Moved ${movedItem.icon}. Keep organizing!`);
  }

  function restartLevel() {
    setBaskets(makeBaskets(level));
    setSelectedBasket(null);
    setMoves(0);
    setMessage("Tap a basket, then tap where to move it.");
    setWon(false);
  }

  function nextLevel() {
    if (!canAdvance) return;

    const next = level + 1;

    localStorage.setItem(LEVEL_KEY, String(next));

    setLevel(next);
    setBaskets(makeBaskets(next));
    setSelectedBasket(null);
    setMoves(0);
    setMessage("New pantry shelf unlocked!");
    setWon(false);
  }

  return (
    <div className="bubu-sort-overlay">
      <div className="bubu-sort-panel">
        <button className="bubu-sort-close" onClick={onClose}>
          ×
        </button>

        <div className="bubu-sort-top">
          <div>
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>

          <div>
            <span>MOVES</span>
            <strong>{moves}</strong>
          </div>
        </div>

        <div className="bubu-sort-title">
          <p>BUBU'S</p>
          <h2>Pantry Sort</h2>
        </div>

        <div className="bubu-sort-board">
          {baskets.map((basket, basketIndex) => (
            <button
              key={basketIndex}
              className={`bubu-basket ${
                selectedBasket === basketIndex ? "selected" : ""
              } ${isBasketComplete(basket) ? "complete" : ""}`}
              onClick={() => pressBasket(basketIndex)}
            >
              <div className="bubu-basket-inner">
                {Array.from({ length: CAPACITY }).map((_, slotIndex) => {
                  const item = basket[CAPACITY - 1 - slotIndex];

                  return (
                    <div
                      key={slotIndex}
                      className={`bubu-basket-slot ${item ? "filled" : ""}`}
                    >
                      {item?.icon}
                    </div>
                  );
                })}
              </div>
            </button>
          ))}
        </div>

        <div className="bubu-sort-message">
  <p>{message}</p>
        </div>

        <img
        className="bubu-sort-bubu"
        src="/characters/bubu/happy.png"
        alt="Bubu"
        />

        {won && (
          <div className="bubu-sort-result">
            <h2>
              {stars === 3
                ? "Perfect!"
                : stars === 2
                ? "Great Job!"
                : "Nice Try!"}
            </h2>

            <p>
              {"⭐".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </p>

            {best && (
              <p>
                Best {"⭐".repeat(best.stars)}
                {"☆".repeat(3 - best.stars)}
              </p>
            )}

            {stars === 1 && (
              <p>Earn 2⭐ to unlock Level {level + 1}</p>
            )}

            {canAdvance && <button onClick={nextLevel}>Next Level</button>}

            <button onClick={restartLevel}>Play Again</button>
            <button onClick={onClose}>Quit</button>
          </div>
        )}
      </div>
    </div>
  );
}