import { useState } from "react";
import "./Arcade.css";

export default function Arcade({
  onClose,
  onOpenOfflineGame,
  onOpenOnlineGame,
  stats,
}) {
  const [tab, setTab] = useState("offline");

  const offlineGames = [
    {
      id: "dream-match",
      title: "Dream Match",
      img: "/assets/arcade/dream-catch.png",
      sub: `Best ${stats.dreamBest}`,
    },
    {
      id: "star-trail",
      title: "Star Trail",
      img: "/assets/arcade/star-trail.png",
      sub: `Best ${stats.trailBest}`,
    },
    {
      id: "bubu-pantry",
      title: "Bubu's Pantry",
      img: "/assets/arcade/bubu-pantry.png",
      sub: `Best ${stats.bubuBest}`,
    },
    {
      id: "sweet-stack",
      title: "Sweet Stack",
      img: "/assets/arcade/sweet-stack.png",
      sub: `Best ${stats.sweetBest}`,
    },
    {
      id: "memory-match",
      title: "Memories",
      img: "/assets/arcade/memory-match.png",
      sub: `Best Lv ${stats.miniGameHighScore}`,
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      img: "/assets/arcade/momo-crossing.png",
      sub: "🚧 Coming Soon",
    },
  ];

  const onlineGames = [
    {
      id: "werewolf",
      title: "Moon Village",
      img: "/moon-village/moon-village-card.png",
      sub: "Werewolf Online",
    },
    {
      id: "momo-beat-arena",
      title: "Beat Arena",
      img: "/assets/arcade/beat-arena.png",
      sub: "Online Rhythm Battle",
    },
    {
      id: "bombu-garden",
      title: "Bombu Garden",
      img: "/assets/arcade/coming-soon.png",
      sub: "Coming Soon",
    },
    {
      id: "momo-caravan",
      title: "Momo Caravan",
      img: "/assets/arcade/coming-soon.png",
      sub: "Coming Soon",
    },
    {
      id: "guardian-keep",
      title: "Guardian Keep",
      img: "/assets/arcade/coming-soon.png",
      sub: "Coming Soon",
    },
    {
      id: "coming-soon",
      title: "More Games",
      img: "/assets/arcade/coming-soon.png",
      sub: "Stay Tuned!",
    },
  ];

  const games = tab === "offline" ? offlineGames : onlineGames;

  return (
    <div className="arcade-fullscreen">
      <div className="arcade-full-top">
        <button onClick={onClose}>← Home</button>
        <h1>Momo Arcade</h1>
      </div>

      <div className="arcade-full-tabs">
        <button
          className={tab === "offline" ? "active" : ""}
          onClick={() => setTab("offline")}
        >
          Offline
        </button>

        <button
          className={tab === "online" ? "active" : ""}
          onClick={() => setTab("online")}
        >
          Online
        </button>
      </div>

      <div className="arcade-full-grid">
        {games.map((game) => (
          <button
            key={game.id}
            className="arcade-full-card"
            onClick={() => {
              const playableOnlineGames = [
                "werewolf",
                "momo-beat-arena",
              ];

              if (game.id.includes("soon")) return;

              if (
                tab === "online" &&
                !playableOnlineGames.includes(game.id)
              ) {
                return;
              }

              if (tab === "offline") {
                onOpenOfflineGame(game.id);
              } else {
                onOpenOnlineGame(game.id);
              }
            }}
          >
            {game.img ? (
              <img src={game.img} alt={game.title} />
            ) : (
              <div className="arcade-full-icon">{game.icon}</div>
            )}

            <h3>{game.title}</h3>
            <p>{game.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}