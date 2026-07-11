import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import "./WerewolfGame.css";

const ROLES = {
  WEREWOLF: "Werewolf",
  MINION: "Minion",
  VILLAGER: "Villager",
  SEER: "Seer",
  HEALER: "Healer",
  GUARDIAN: "Guardian",
  CUPID: "Cupid",
  HUNTER: "Hunter",
};

const ROLE_INFO = {
  Werewolf: {
    emoji: "🐺",
    team: "Evil",
    desc: "Work with the werewolves. Eliminate villagers at night.",
  },
  Minion: {
    emoji: "😈",
    team: "Evil",
    desc: "You are on the werewolves' side, but you do not kill.",
  },
  Villager: {
    emoji: "👤",
    team: "Good",
    desc: "Find the werewolves through discussion and voting.",
  },
  Seer: {
    emoji: "🔮",
    team: "Good",
    desc: "Each night, inspect one player to learn their team.",
  },
  Healer: {
    emoji: "❤️",
    team: "Good",
    desc: "Each night, choose one player to save.",
  },
  Guardian: {
    emoji: "🛡️",
    team: "Good",
    desc: "Each night, protect one player from danger.",
  },
  Cupid: {
    emoji: "💘",
    team: "Good",
    desc: "On the first night, choose two players to become lovers.",
  },
  Hunter: {
    emoji: "🏹",
    team: "Good",
    desc: "If you die, you may take one player down with you.",
  },
};

const ROLE_CARD_IMAGES = {
  Werewolf: "/moon-village/roles/werewolf.png",
  Minion: "/moon-village/roles/minion.png",
  Villager: "/moon-village/roles/villager.png",
  Seer: "/moon-village/roles/seer.png",
  Healer: "/moon-village/roles/healer.png",
  Guardian: "/moon-village/roles/guardian.png",
  Cupid: "/moon-village/roles/cupid.png",
  Hunter: "/moon-village/roles/hunter.png",
};

const RESULT_IMAGES = {
  lastNight: "/moon-village/results/last-night-result.png",
  safe: "/moon-village/results/safe-result.png",
  vote: "/moon-village/results/vote-result.png",
  werewolvesWin: "/moon-village/results/werewolves-wins.png",
  villageWin: "/moon-village/results/village-wins.png",
  summary: "/moon-village/results/game-summary.png",
  continueButton: "/moon-village/results/continue-button.png",
};

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getMomoEmoji(type) {
  if (type === "Bubu") return "🐻";
  if (type === "Kiki") return "⚡";
  if (type === "Lulu") return "📚";
  if (type === "Riko") return "🔥";
  if (type === "Nini") return "🌙";
  return "🌸";
}

function getMomoAvatar(type) {
  switch (type) {
    case "Momo":
      return "/moods/momo/happy.png";
    case "Bubu":
      return "/moods/bubu/happy.png";
    case "Kiki":
      return "/moods/kiki/happy.png";
    case "Lulu":
      return "/moods/lulu/happy.png";
    case "Riko":
      return "/moods/riko/happy.png";
    case "Nini":
      return "/moods/nini/happy.png";
    default:
      return "/moods/momo/happy.png";
  }
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getWerewolfCount(playerCount) {
  if (playerCount <= 5) return 1;
  if (playerCount <= 8) return 2;
  return 3;
}

function generateRoles(playerCount) {
  const werewolfCount = getWerewolfCount(playerCount);
  const roles = [];

  for (let i = 0; i < werewolfCount; i++) roles.push(ROLES.WEREWOLF);

  const specials = [
    ROLES.SEER,
    ROLES.HEALER,
    ROLES.GUARDIAN,
    ROLES.HUNTER,
    ROLES.MINION,
    ROLES.CUPID,
  ];

  const specialCount = Math.min(
    playerCount - werewolfCount,
    playerCount <= 5 ? 2 : playerCount <= 8 ? 4 : 5
  );

  roles.push(...shuffle(specials).slice(0, specialCount));

  while (roles.length < playerCount) {
    roles.push(ROLES.VILLAGER);
  }

  return shuffle(roles);
}

function countVotes(votes) {
  const tally = {};

  Object.values(votes || {}).forEach((targetUid) => {
    if (!targetUid) return;
    tally[targetUid] = (tally[targetUid] || 0) + 1;
  });

  let winnerUid = "";
  let winnerVotes = 0;

  Object.entries(tally).forEach(([uid, count]) => {
    if (count > winnerVotes) {
      winnerUid = uid;
      winnerVotes = count;
    }
  });

  return { tally, winnerUid, winnerVotes };
}

export default function WerewolfGame({
  onClose,
  displayName,
  momo,
  initialRoomCode = "",
}) {
  const user = auth.currentUser;

  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [secondTarget, setSecondTarget] = useState("");
  const [chatText, setChatText] = useState("");
  const [friends, setFriends] = useState([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState({});
  const [seerResult, setSeerResult] = useState(null);
  const [hunterTarget, setHunterTarget] = useState("");
  const [mySelectedVote, setMySelectedVote] = useState("");
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);

  const playerName = displayName || "Player";
  const momoType = momo || "Momo";
  useEffect(() => {
  async function joinFromInvite() {
    if (!initialRoomCode || !user || roomCode) return;

    const code = initialRoomCode.trim().toUpperCase();

    await setDoc(doc(db, "werewolfRooms", code, "players", user.uid), {
      uid: user.uid,
      name: playerName,
      momoType,
      alive: true,
      ready: false,
      role: "",
      joinedAt: serverTimestamp(),
    });

    setRoomCode(code);
  }

  joinFromInvite();
}, [initialRoomCode, user, roomCode, playerName, momoType]);

  const me = players.find((p) => p.uid === user?.uid);
  const isHost = room?.hostUid === user?.uid;
  const alivePlayers = players.filter((p) => p.alive);
  const myRole = me?.role || "";
  const myRoleInfo = ROLE_INFO[myRole];
  const phase = room?.phase || "lobby";
  const werewolves = players.filter((p) => p.role === ROLES.WEREWOLF);
  const seerAlreadyUsedPower =
  myRole === ROLES.SEER &&
  room?.nightActions?.[user?.uid]?.step === "seer";
  async function createRoom() {
    if (!user) {
      setMessage("Still loading your player profile.");
      return;
    }

    const code = makeRoomCode();

    await setDoc(doc(db, "werewolfRooms", code), {
      code,
      hostUid: user.uid,
      phase: "lobby",
      status: "waiting",
      day: 1,
      nightStep: "cupid",
      nightActions: {},
      votes: {},
      lovers: [],
      lastResult: "",
      executedUid: "",
      killedUid: "",
      hunterShotUsed: false,
      lastHealTarget: "",
      lastGuardTarget: "",
      winner: "",
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "werewolfRooms", code, "players", user.uid), {
      uid: user.uid,
      name: playerName,
      momoType,
      alive: true,
      ready: false,
      role: "",
      joinedAt: serverTimestamp(),
    });

    setRoomCode(code);
  }

  async function joinRoom() {
    if (!user) {
      setMessage("Still loading your player profile.");
      return;
    }

    const code = roomCodeInput.trim().toUpperCase();

    if (!code) {
      setMessage("Enter a room code.");
      return;
    }

    await setDoc(doc(db, "werewolfRooms", code, "players", user.uid), {
      uid: user.uid,
      name: playerName,
      momoType,
      alive: true,
      ready: false,
      role: "",
      joinedAt: serverTimestamp(),
    });

    setRoomCode(code);
  }

  useEffect(() => {
    if (!roomCode) return;

    const unsubRoom = onSnapshot(doc(db, "werewolfRooms", roomCode), (snap) => {
      if (snap.exists()) setRoom(snap.data());
    });

    const unsubPlayers = onSnapshot(
      collection(db, "werewolfRooms", roomCode, "players"),
      (snap) => {
        setPlayers(snap.docs.map((docSnap) => docSnap.data()));
      }
    );

    const chatQuery = query(
      collection(db, "werewolfRooms", roomCode, "chat"),
      orderBy("createdAt", "asc")
    );

    const unsubChat = onSnapshot(chatQuery, (snap) => {
      setChatMessages(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubChat();
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room || phase === "lobby" || !isHost || room.winner) return;

    const aliveWerewolves = players.filter(
      (p) => p.alive && p.role === ROLES.WEREWOLF
    ).length;

    const aliveNonWerewolves = players.filter(
      (p) => p.alive && p.role !== ROLES.WEREWOLF
    ).length;

    if (aliveWerewolves === 0) {
      updateDoc(doc(db, "werewolfRooms", roomCode), {
        phase: "gameOver",
        winner: "Village",
      });
    } else if (aliveWerewolves >= aliveNonWerewolves) {
      updateDoc(doc(db, "werewolfRooms", roomCode), {
        phase: "gameOver",
        winner: "Werewolves",
      });
    }
  }, [players, room, phase, isHost, roomCode]);

  async function toggleReady() {
    if (!user || !roomCode) return;

    await updateDoc(doc(db, "werewolfRooms", roomCode, "players", user.uid), {
      ready: !me?.ready,
    });
  }

  async function leaveRoom() {
    if (user && roomCode) {
      await deleteDoc(doc(db, "werewolfRooms", roomCode, "players", user.uid));
    }

    setRoomCode("");
    setRoom(null);
    setPlayers([]);
    onClose();
  }

  async function loadFriends() {
    if (!user) {
      setMessage("Still loading your player profile.");
      return;
    }

    try {
      const friendsSnap = await getDocs(
        collection(db, "users", user.uid, "friends")
      );

      const loadedFriends = friendsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        uid: docSnap.data().uid || docSnap.id,
        ...docSnap.data(),
      }));

      setFriends(loadedFriends);
      setShowInvitePanel(true);

      if (loadedFriends.length === 0) {
        setMessage("No friends found yet. Use the room code for now.");
      } else {
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      setMessage("Could not load friends.");
      setShowInvitePanel(true);
    }
  }

  async function inviteFriend(friend) {
    if (!user || !roomCode) return;

    const friendUid = friend.uid || friend.id;

    if (!friendUid) {
      setMessage("Could not find this friend's ID.");
      return;
    }

    const inviteId = `moon-${roomCode}-${user.uid}`;

    await setDoc(
      doc(db, "users", friendUid, "postcards", inviteId),
      {
        id: inviteId,
        type: "moonVillageInvite",
        fromUid: user.uid,
        fromUsername: playerName,
        fromMomoType: momoType,
        roomCode,
        message: `${playerName} invited you to Moon Village.`,
        read: false,
        createdAt: Date.now(),
      },
      { merge: true }
    );

    setInvitedFriends((list) => ({
      ...list,
      [friendUid]: true,
    }));

    setMessage(`Invited ${friend.username || friend.playerName || "friend"}!`);
  }

  async function copyRoomCode() {
  if (!roomCode) return;

  const code = roomCode.trim().toUpperCase();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setRoomCodeCopied(true);
    setMessage("Room code copied!");

    setTimeout(() => {
      setRoomCodeCopied(false);
      setMessage("");
    }, 1400);
  } catch (err) {
    console.error(err);
    setMessage(`Copy failed. Room code: ${code}`);
  }
}

  async function startGame() {
    if (!isHost || players.length < 4) return;

    const roles = generateRoles(players.length);
    const batch = writeBatch(db);

    players.forEach((player, index) => {
      batch.update(doc(db, "werewolfRooms", roomCode, "players", player.uid), {
        role: roles[index],
        alive: true,
        ready: false,
      });
    });

    batch.update(doc(db, "werewolfRooms", roomCode), {
      phase: "roleReveal",
      status: "playing",
      day: 1,
      nightStep: "cupid",
      nightActions: {},
      votes: {},
      lovers: [],
      lastResult: "",
      executedUid: "",
      killedUid: "",
      hunterShotUsed: false,
      lastHealTarget: "",
      lastGuardTarget: "",
      winner: "",
    });

    await batch.commit();
  }

  async function continueToNight() {
  setSeerResult(null);

  if (!isHost) {
    setMessage("Waiting for the host to begin the night.");
    return;
  }

  await updateDoc(doc(db, "werewolfRooms", roomCode), {
    phase: "night",
    nightStep: room?.day === 1 ? "cupid" : "werewolf",
    nightActions: {},
    votes: {},
    lastResult: "",
    executedUid: "",
    killedUid: "",
    hunterShotUsed: false,
  });
}

  function canActNow() {
    if (!me?.alive) return false;

    if (room?.nightStep === "cupid") {
      return myRole === ROLES.CUPID && room?.day === 1;
    }

    if (room?.nightStep === "werewolf") return myRole === ROLES.WEREWOLF;
    if (room?.nightStep === "seer") {
      return myRole === ROLES.SEER && !seerAlreadyUsedPower;
    }
    if (room?.nightStep === "healer") return myRole === ROLES.HEALER;
    if (room?.nightStep === "guardian") return myRole === ROLES.GUARDIAN;

    return false;
  }

  async function submitNightAction() {
  if (!selectedTarget || !user || !canActNow()) return;

  const action =
    room?.nightStep === "cupid"
      ? {
          role: myRole,
          step: room.nightStep,
          targetUid: selectedTarget,
          secondTargetUid: secondTarget,
        }
      : {
          role: myRole,
          step: room.nightStep,
          targetUid: selectedTarget,
        };

  const updates = {
    [`nightActions.${user.uid}`]: action,
  };

  if (room?.nightStep === "healer") {
    updates.lastHealTarget = selectedTarget;
  }

  if (room?.nightStep === "guardian") {
    updates.lastGuardTarget = selectedTarget;
  }

  await updateDoc(doc(db, "werewolfRooms", roomCode), updates);


  setMessage("Action submitted.");
  setSelectedTarget("");
  setSecondTarget("");
}

  async function nextNightStep() {
    setSeerResult(null);
    if (!isHost) return;

    const current = room?.nightStep;

    if (current === "cupid") {
      await updateDoc(doc(db, "werewolfRooms", roomCode), {
        nightStep: "werewolf",
      });
      return;
    }

    if (current === "werewolf") {
      await updateDoc(doc(db, "werewolfRooms", roomCode), {
        nightStep: "seer",
      });
      return;
    }

    if (current === "seer") {
      await updateDoc(doc(db, "werewolfRooms", roomCode), {
        nightStep: "healer",
      });
      return;
    }

    if (current === "healer") {
      await updateDoc(doc(db, "werewolfRooms", roomCode), {
        nightStep: "guardian",
      });
      return;
    }

    if (current === "guardian") {
      await resolveNight();
    }
  }

function isHunterDeathPending() {
  const deadUid = room?.killedUid || room?.executedUid;
  const deadPlayer = players.find((p) => p.uid === deadUid);

  return (
    deadPlayer?.role === ROLES.HUNTER &&
    deadPlayer?.alive === false &&
    !room?.hunterShotUsed
  );
}

function getHeartbrokenLover(deadUid, lovers) {
  if (!deadUid || lovers.length !== 2) return null;

  if (lovers[0] === deadUid) return lovers[1];
  if (lovers[1] === deadUid) return lovers[0];

  return null;
}

  async function resolveNight() {
  if (!isHost) return;

  const actions = Object.values(room?.nightActions || {});

  const werewolfTargets = actions
    .filter((action) => action.step === "werewolf")
    .map((action) => action.targetUid);

  const healerTarget = actions.find(
    (action) => action.step === "healer"
  )?.targetUid;

  const guardianTarget = actions.find(
    (action) => action.step === "guardian"
  )?.targetUid;

  const cupidAction = actions.find(
    (action) => action.step === "cupid"
  );

  const voteLike = {};

  werewolfTargets.forEach((uid, index) => {
    voteLike[`wolf-${index}`] = uid;
  });

  const { winnerUid: killedUid } = countVotes(voteLike);

  let finalKilledUid = killedUid;
  let saveReason = "";

  if (killedUid && killedUid === guardianTarget) {
    finalKilledUid = "";
    saveReason = "guardian";
  } else if (killedUid && killedUid === healerTarget) {
    finalKilledUid = "";
    saveReason = "healer";
  }

  const lovers =
    cupidAction?.targetUid && cupidAction?.secondTargetUid
      ? [cupidAction.targetUid, cupidAction.secondTargetUid]
      : room?.lovers || [];

  const killedPlayer = players.find(
    (player) => player.uid === finalKilledUid
  );

  const heartbrokenUid = getHeartbrokenLover(
    finalKilledUid,
    lovers
  );

  const heartbrokenPlayer = players.find(
    (player) => player.uid === heartbrokenUid
  );

  const batch = writeBatch(db);

  if (finalKilledUid) {
    batch.update(
      doc(
        db,
        "werewolfRooms",
        roomCode,
        "players",
        finalKilledUid
      ),
      {
        alive: false,
      }
    );
  }

  if (heartbrokenUid) {
    batch.update(
      doc(
        db,
        "werewolfRooms",
        roomCode,
        "players",
        heartbrokenUid
      ),
      {
        alive: false,
      }
    );
  }

  let lastResult = "Nobody died tonight.";

  if (finalKilledUid) {
    lastResult = `${
      killedPlayer?.name || "Someone"
    } was taken by the werewolves.`;

    if (heartbrokenPlayer) {
      lastResult += ` ${heartbrokenPlayer.name} also died of heartbreak. 💔`;
    }
  } else if (saveReason === "guardian") {
    lastResult =
      "The Guardian protected someone from the werewolves.";
  } else if (saveReason === "healer") {
    lastResult =
      "The Healer saved someone from the werewolves.";
  }

  batch.update(doc(db, "werewolfRooms", roomCode), {
    phase:
      killedPlayer?.role === ROLES.HUNTER
        ? "hunterShot"
        : "dayResults",
    killedUid: finalKilledUid || "",
    lovers,
    hunterShotUsed: false,
    hunterShotReturnPhase: "dayResults",
    lastResult,
  });

  await batch.commit();
}

  async function startDiscussion() {
  if (!isHost || !roomCode) return;

  try {
    setMessage("Starting discussion...");

    const roomRef = doc(db, "werewolfRooms", roomCode);

    // Change the screen immediately.
    await updateDoc(roomRef, {
      phase: "discussion",
      votes: {},
    });

    // Clear the previous discussion afterward.
    const chatSnap = await getDocs(
      collection(db, "werewolfRooms", roomCode, "chat")
    );

    if (!chatSnap.empty) {
      const batch = writeBatch(db);

      chatSnap.forEach((chatDoc) => {
        batch.delete(chatDoc.ref);
      });

      await batch.commit();
    }

    await addDoc(
      collection(db, "werewolfRooms", roomCode, "chat"),
      {
        uid: "system",
        name: "🌅 System",
        text: `Day ${room?.day} has begun. Discuss who you think the werewolves are.`,
        createdAt: serverTimestamp(),
      }
    );

    setMessage("");
  } catch (error) {
    console.error("Could not start discussion:", error);
    setMessage("Could not start the discussion. Please tap Continue again.");
  }
}

  async function sendChat() {
    if (!chatText.trim() || !user || !roomCode) return;

    await addDoc(collection(db, "werewolfRooms", roomCode, "chat"), {
      uid: user.uid,
      name: playerName,
      text: chatText.trim(),
      createdAt: serverTimestamp(),
    });

    setChatText("");
  }

  async function startVoting() {
    if (!isHost) return;

    await updateDoc(doc(db, "werewolfRooms", roomCode), {
      phase: "voting",
      votes: {},
    });
  }

  async function submitVote(targetUid) {
  if (!user || !roomCode) return;
  if (!me?.alive) {
    setMessage("You are out, so you cannot vote.");
    return;
  }

  setMySelectedVote(targetUid);

  await updateDoc(doc(db, "werewolfRooms", roomCode), {
    [`votes.${user.uid}`]: targetUid,
  });

  setMessage("Vote submitted.");
}

  async function resolveVote() {
  if (!isHost) return;

  const { winnerUid, winnerVotes } = countVotes(room?.votes || {});
  const executedPlayer = players.find((p) => p.uid === winnerUid);

  const heartbrokenUid = getHeartbrokenLover(winnerUid, room?.lovers || []);
  const heartbrokenPlayer = players.find((p) => p.uid === heartbrokenUid);

  const batch = writeBatch(db);

  if (winnerUid) {
    batch.update(doc(db, "werewolfRooms", roomCode, "players", winnerUid), {
      alive: false,
    });

    if (heartbrokenUid) {
      batch.update(
        doc(db, "werewolfRooms", roomCode, "players", heartbrokenUid),
        {
          alive: false,
        }
      );
    }
  }

  let resultText = winnerUid
    ? `${executedPlayer?.name || "Someone"} was voted out with ${winnerVotes} votes.`
    : "No one was voted out.";

  if (heartbrokenPlayer) {
    resultText += ` ${heartbrokenPlayer.name} also died of heartbreak. 💔`;
  }

  batch.update(doc(db, "werewolfRooms", roomCode), {
    phase: executedPlayer?.role === ROLES.HUNTER ? "hunterShot" : "voteResults",
    executedUid: winnerUid || "",
    hunterShotUsed: false,
    hunterShotReturnPhase: "voteResults",
    lastResult: resultText,
  });

  await batch.commit();
}

async function submitHunterShot(targetUid) {
  if (!user || !roomCode || !targetUid) return;

  const hunterUid = room?.killedUid || room?.executedUid;
  const hunterPlayer = players.find((p) => p.uid === hunterUid);
  const targetPlayer = players.find((p) => p.uid === targetUid);

  if (!hunterPlayer || hunterPlayer.role !== ROLES.HUNTER) return;

  if (user.uid !== hunterUid) {
    setMessage("Only the Hunter can choose the final shot.");
    return;
  }

  const heartbrokenUid = getHeartbrokenLover(targetUid, room?.lovers || []);
  const heartbrokenPlayer = players.find((p) => p.uid === heartbrokenUid);

  const batch = writeBatch(db);

  batch.update(doc(db, "werewolfRooms", roomCode, "players", targetUid), {
    alive: false,
  });

  if (heartbrokenUid) {
    batch.update(
      doc(db, "werewolfRooms", roomCode, "players", heartbrokenUid),
      {
        alive: false,
      }
    );
  }

  let resultText = `${hunterPlayer.name} was the Hunter and took ${
    targetPlayer?.name || "someone"
  } down with them.`;

  if (heartbrokenPlayer) {
    resultText += ` ${heartbrokenPlayer.name} also died of heartbreak. 💔`;
  }

  batch.update(doc(db, "werewolfRooms", roomCode), {
    hunterShotUsed: true,
    phase: room?.hunterShotReturnPhase || "dayResults",
    lastResult: resultText,
  });

  await batch.commit();
  setHunterTarget("");
}


  async function nextRound() {
    if (!isHost) return;

    await updateDoc(doc(db, "werewolfRooms", roomCode), {
      phase: "night",
      day: (room?.day || 1) + 1,
      nightStep: "werewolf",
      nightActions: {},
      votes: {},
      killedUid: "",
      executedUid: "",
      hunterShotUsed: false,
      lastResult: "",
    });
  }




/* =========================
   DEV TEST TOOLS - START
   Delete this whole block later
   ========================= */

async function devAddBot() {
  if (!isHost || !roomCode) return;

  const botId = `bot-${Date.now()}`;
  const botNames = ["Momo Bot", "Bubu Bot", "Kiki Bot", "Lulu Bot", "Nini Bot", "Riko Bot"];
  const botTypes = ["Momo", "Bubu", "Kiki", "Lulu", "Nini", "Riko"];

  const botNumber = players.filter((p) => p.uid?.startsWith("bot-")).length;

  await setDoc(doc(db, "werewolfRooms", roomCode, "players", botId), {
    uid: botId,
    name: botNames[botNumber % botNames.length],
    momoType: botTypes[botNumber % botTypes.length],
    alive: true,
    ready: true,
    role: "",
    isBot: true,
    joinedAt: serverTimestamp(),
  });
}

async function devRemoveBots() {
  if (!isHost || !roomCode) return;

  const batch = writeBatch(db);

  players
    .filter((p) => p.uid?.startsWith("bot-") || p.isBot)
    .forEach((bot) => {
      batch.delete(doc(db, "werewolfRooms", roomCode, "players", bot.uid));
    });

  await batch.commit();
}

async function devAutoReady() {
  if (!isHost || !roomCode) return;

  const batch = writeBatch(db);

  players.forEach((player) => {
    if (player.uid !== user?.uid) {
      batch.update(doc(db, "werewolfRooms", roomCode, "players", player.uid), {
        ready: true,
      });
    }
  });

  await batch.commit();
}

/* =========================
   DEV TEST TOOLS - END
   ========================= */








/* =========================
   HOST CONTROL PANEL - START
   Keep this for real gameplay
   ========================= */

async function hostBackToLobby() {
  if (!isHost || !roomCode) return;

  await playAgain();
}

async function hostEndDiscussion() {
  if (!isHost || phase !== "discussion") return;

  await startVoting();
}

async function hostEndVoting() {
  if (!isHost || phase !== "voting") return;

  await resolveVote();
}

async function hostRestartNight() {
  if (!isHost || !roomCode) return;

  await updateDoc(doc(db, "werewolfRooms", roomCode), {
    phase: "night",
    nightStep: room?.day === 1 ? "cupid" : "werewolf",
    nightActions: {},
    votes: {},
    lastResult: "",
    killedUid: "",
    executedUid: "",
  });
}

/* =========================
   HOST CONTROL PANEL - END
   ========================= */

  async function showGameSummary() {
    if (!isHost || !roomCode) return;

    await updateDoc(doc(db, "werewolfRooms", roomCode), {
      phase: "gameSummary",
    });
  }

  async function playAgain() {
    if (!isHost) return;

    const batch = writeBatch(db);

    players.forEach((player) => {
      batch.update(doc(db, "werewolfRooms", roomCode, "players", player.uid), {
        alive: true,
        ready: false,
        role: "",
      });
    });

    batch.update(doc(db, "werewolfRooms", roomCode), {
      phase: "lobby",
      status: "waiting",
      winner: "",
      day: 1,
      nightStep: "cupid",
      nightActions: {},
      votes: {},
      lovers: [],
      lastResult: "",
      killedUid: "",
      executedUid: "",
      hunterShotUsed: false,
      lastHealTarget: "",
      lastGuardTarget: "",
    });

    await batch.commit();
  }

  const actionTargets = useMemo(() => {
    if (room?.nightStep === "werewolf") {
      return alivePlayers.filter((p) => p.role !== ROLES.WEREWOLF);
    }

    return alivePlayers;
  }, [room?.nightStep, alivePlayers]);

    return (
      <div
        className={`werewolf-screen ${
          phase === "lobby"
            ? "lobby-bg"
            : phase === "night" || phase === "roleReveal"
            ? "night-bg"
            : phase === "dayResults"
            ? "sunrise-bg"
            : phase === "discussion" || phase === "voting"
            ? "morning-bg"
            : phase === "voteResults"
            ? "sunset-bg"
            : phase === "gameOver" || phase === "gameSummary"
            ? "night-bg"
            : "morning-bg"
        }`}
      >
      <div className="werewolf-topbar">
          <button
            type="button"
            className="arcade-back-btn"
            onClick={leaveRoom}
          >
            <span className="arcade-back-arrow">←</span>
            <span>Arcade</span>
          </button>

          <h1></h1>
        </div>

      {!roomCode && (
        <div className="moon-village-start-screen">
          <div className="moon-village-start-panel">
            <img
              className="moon-village-panel-image"
              src="/moon-village/lobby-ui/moon-village-panel.png"
              alt="Moon Village"
            />

            <div className="moon-village-start-controls">
              <button
                type="button"
                className="moon-village-create-button"
                onClick={createRoom}
                aria-label="Create Room"
              >
                <img
                  src="/moon-village/lobby-ui/create-room-button.png"
                  alt="Create Room"
                />
              </button>

              <div className="moon-village-join-row">
                <div className="moon-village-room-code">
                  <img
                    className="room-code-panel-image"
                    src="/moon-village/lobby-ui/room-code-panel.png"
                    alt=""
                  />

                  <input
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="ROOM CODE"
                    maxLength={6}
                    aria-label="Room code"
                  />
                </div>

                <button
                  type="button"
                  className="moon-village-join-button"
                  onClick={joinRoom}
                  aria-label="Join Room"
                >
                  <img
                    src="/moon-village/lobby-ui/join-button.png"
                    alt="Join"
                  />
                </button>
              </div>
            </div>
          </div>

          {message && (
            <p className="werewolf-message">
              {message}
            </p>
          )}
        </div>
      )}

      {roomCode && phase === "lobby" && (
        <div className="werewolf-lobby">
          <div className="moon-village-logo">
            <h2>MOMO</h2>
            <h3>MOON VILLAGE</h3>
          
          </div>


          <div className="werewolf-main-layout">
            <div className="werewolf-left">
              <button
                className={`werewolf-room-code ${roomCodeCopied ? "copied" : ""}`}
                onClick={copyRoomCode}
              >
                <span>Room Code</span>
                <strong>{roomCode}</strong>
                <small>{roomCodeCopied ? "Copied!" : "Tap to copy"}</small>
              </button>

              <div className="werewolf-campfire-area">
                <div className="moon"></div>

                <div className="campfire-circle">
                  <div className="fire"></div>

                  {players.slice(0, 10).map((player, index) => {
                    const totalSeats = Math.min(players.length, 10);
                    const angle = -90 + (360 / totalSeats) * index;
                    const radius = totalSeats <= 4 ? 128 : totalSeats <= 6 ? 142 : 158;

                    return (
                      <div
                        key={player.uid}
                        className="player-seat"
                        style={{
                          left: "50%",
                          top: "50%",
                          transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
                        }}
                      >
                        <img
                          className="momo-seat-avatar"
                          src={getMomoAvatar(player.momoType)}
                          alt={player.momoType}
                        />
                        <span>{player.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="werewolf-lobby-actions">
                <button onClick={loadFriends}>Invite Friends</button>

                {isHost ? (
                  <button
                    disabled={
                      players.length < 4 ||
                      players.some((p) => p.uid !== user?.uid && !p.ready)
                    }
                    onClick={startGame}
                  >
                    Start Game
                  </button>
                ) : (
                  <button onClick={toggleReady}>
                    {me?.ready ? "Unready" : "Ready"}
                  </button>
                )}
              </div>
            </div>

            <div className="werewolf-players-card">
              <h2>Players</h2>

              <div className="werewolf-player-count">
                <span>{players.length}/10</span>
                <small>Minimum 4</small>
              </div>

              <div className="werewolf-player-list">
                {players.map((player) => (
                  <div key={player.uid}>
                    <strong>
                      {player.name}
                      {player.uid === user?.uid ? " (You)" : ""}
                    </strong>

                    <span className={player.ready ? "ready" : "not-ready"}>
                    {player.uid === room?.hostUid
                      ? "Host"
                      : player.ready
                      ? "Ready"
                      : "Not Ready"}
                  </span>
                  </div>
                ))}
              </div>






{/* =========================
   DEV TEST PANEL - START
   Delete this whole block later
   ========================= */}

{isHost && phase === "lobby" && (
  <div className="werewolf-dev-panel">
    <strong>Developer Test Tools</strong>

    <div>
      <button onClick={devAddBot}>+ Add Bot</button>
      <button onClick={devAutoReady}>Auto Ready</button>
      <button onClick={devRemoveBots}>Remove Bots</button>
    </div>

    <small>Temporary testing tools. Remove before launch.</small>
  </div>
)}

{/* =========================
   DEV TEST PANEL - END
   ========================= */}






              {isHost ? (
                <p className="werewolf-waiting-text">
                  {players.length < 4
                    ? "Need at least 4 players to start."
                    : players.some((p) => p.uid !== user?.uid && !p.ready)
                    ? "Waiting for everyone to get ready..."
                    : "Everyone is ready. Start the game!"}
                </p>
              ) : (
                <p className="werewolf-waiting-text">
                  Waiting for the host to start...
                </p>
              )}
            </div>
          </div>

          {showInvitePanel && (
            <div className="werewolf-invite-panel">
              <div className="werewolf-invite-head">
                <h2>Invite Friends</h2>
                <button onClick={() => setShowInvitePanel(false)}>×</button>
              </div>

              {friends.length === 0 ? (
                <p className="werewolf-empty-invite">
                  No friends found yet.
                </p>
              ) : (
                <div className="werewolf-invite-list">
                  {friends.map((friend) => (
                    <div
                      className="werewolf-invite-row"
                      key={friend.uid || friend.id}
                    >
                      <span>{getMomoEmoji(friend.momoType)}</span>

                      <section>
                        <strong>
                          {friend.username || friend.playerName || "Friend"}
                        </strong>
                        <small>{friend.momoType || "Momo"}</small>
                      </section>

                      <button
                        disabled={invitedFriends[friend.uid || friend.id]}
                        onClick={() => inviteFriend(friend)}
                      >
                        {invitedFriends[friend.uid || friend.id]
                          ? "Sent"
                          : "Invite"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {message && <p className="werewolf-message">{message}</p>}
        </div>
      )}

      {roomCode && phase === "roleReveal" && (
        <div className="werewolf-phase-card role-reveal-card">
          <p className="phase-label">Your Role</p>

          <img
  className="role-card-image"
  src={ROLE_CARD_IMAGES[myRole]}
  alt={myRole}
/>

          <h2>{myRole}</h2>
          <h3>{myRoleInfo?.team} Team</h3>
          <p>{myRoleInfo?.desc}</p>

          {myRole === ROLES.WEREWOLF && (
            <div className="secret-info">
              <strong>Werewolf Team</strong>
              {werewolves.map((p) => (
                <span key={p.uid}>{p.name}</span>
              ))}
            </div>
          )}

          {myRole === ROLES.MINION && (
            <div className="secret-info">
              <strong>You know the Werewolves</strong>
              {werewolves.map((p) => (
                <span key={p.uid}>{p.name}</span>
              ))}
            </div>
          )}

          {isHost ? (
            <button onClick={continueToNight}>
              Begin Night
            </button>
          ) : (
            <p className="werewolf-waiting-text">
              Waiting for the host to begin the night...
            </p>
          )}
        </div>
      )}

      {roomCode && phase === "night" && (
        <div className="werewolf-phase-card night-card">
          <p className="phase-label">Night {room?.day}</p>

          <h2>
            {room?.nightStep === "cupid"
              ? "Cupid wakes up"
              : room?.nightStep === "werewolf"
              ? "Werewolves wake up"
              : room?.nightStep === "seer"
              ? "Seer wakes up"
              : room?.nightStep === "healer"
              ? "Healer wakes up"
              : "Guardian wakes up"}
          </h2>

          <p>
            {canActNow()
              ? room?.nightStep === "cupid"
                ? "Choose the first lover."
                : room?.nightStep === "werewolf"
                ? "Choose who to attack."
                : room?.nightStep === "seer"
                ? "Choose who to reveal."
                : room?.nightStep === "healer"
                ? "Choose who to heal."
                : "Choose who to protect."
              : me?.alive
              ? "Close your eyes and wait for your turn."
              : "You are out, but you may watch quietly."}
          </p>

          {canActNow() && (
            <div className="target-grid">
              {actionTargets.map((player) => {
                const blockedByHealer =
                  room?.nightStep === "healer" &&
                  room?.lastHealTarget === player.uid;

                const blockedByGuardian =
                  room?.nightStep === "guardian" &&
                  room?.lastGuardTarget === player.uid;

                const isBlocked = blockedByHealer || blockedByGuardian;

                return (
                  <button
                    key={player.uid}
                    className={selectedTarget === player.uid ? "selected" : ""}
                    disabled={isBlocked}
                    onClick={() => {
                      if (isBlocked) return;

                      setSelectedTarget(player.uid);

                      if (myRole === ROLES.SEER && room?.nightStep === "seer") {
                        setSeerResult({
                          name: player.name || "Unknown",
                          team:
                            player.role === ROLES.WEREWOLF || player.role === ROLES.MINION
                              ? "Evil"
                              : "Good",
                          role: player.role || "Unknown",
                        });
                      }
                    }}
                  >
                    <img
                      className="vote-momo-avatar"
                      src={getMomoAvatar(player.momoType)}
                      alt={player.momoType}
                    />
                    <strong>{player.name}</strong>

                    {blockedByHealer && <small>Healed last night</small>}
                    {blockedByGuardian && <small>Guarded last night</small>}
                  </button>
                );
              })}
            </div>
          )}

          {canActNow() && room?.nightStep === "cupid" && (
            <>
              <p className="small-note">Choose a second lover.</p>

              <div className="target-grid">
                {alivePlayers
                  .filter((p) => p.uid !== selectedTarget)
                  .map((player) => (
                    <button
                      key={player.uid}
                      className={secondTarget === player.uid ? "selected" : ""}
                      onClick={() => setSecondTarget(player.uid)}
                    >
                      <img
                        className="vote-momo-avatar"
                        src={getMomoAvatar(player.momoType)}
                        alt={player.momoType}
                      />
                      <strong>{player.name}</strong>
                    </button>
                  ))}
              </div>
            </>
          )}

          {seerResult && myRole === ROLES.SEER && room?.nightStep === "seer" && (
            <div className="seer-result-card">
              <p>🔮 Vision Revealed</p>
              <h3>{seerResult.name}</h3>

              <strong>
                {seerResult.team === "Evil"
                  ? "This player is on the Evil Team."
                  : "This player is on the Good Team."}
              </strong>

              <small>Role: {seerResult.role}</small>
            </div>
          )}

          {canActNow() && (
            <button
              className="night-submit-btn"
              onClick={submitNightAction}
              disabled={
                !selectedTarget ||
                (room?.nightStep === "cupid" && !secondTarget)
              }
            >
              {room?.nightStep === "cupid"
                ? "Confirm Lovers"
                : room?.nightStep === "werewolf"
                ? "Confirm Attack"
                : room?.nightStep === "seer"
                ? "Reveal Player"
                : room?.nightStep === "healer"
                ? "Confirm Heal"
                : "Confirm Protection"}
            </button>
          )}


          {isHost && (
            <button className="host-next-btn" onClick={nextNightStep}>
              Host: Continue
            </button>
          )}

          {message && <p className="werewolf-message">{message}</p>}
        </div>
      )}

{roomCode && phase === "hunterShot" && (
  <div className="werewolf-phase-card hunter-card">
    <p className="phase-label">Hunter's Final Shot</p>

    <h2>🏹 The Hunter has fallen</h2>

    <p>
      {
        players.find(
          (p) => p.uid === (room?.killedUid || room?.executedUid)
        )?.name
      }{" "}
      may take one player down.
    </p>

    {user?.uid === (room?.killedUid || room?.executedUid) ? (
      <>
        <div className="target-grid">
          {alivePlayers.map((player) => (
            <button
              key={player.uid}
              className={hunterTarget === player.uid ? "selected" : ""}
              onClick={() => setHunterTarget(player.uid)}
            >
              <img
                className="vote-momo-avatar"
                src={getMomoAvatar(player.momoType)}
                alt={player.momoType}
              />
              <strong>{player.name}</strong>
            </button>
          ))}
        </div>

        <button
          disabled={!hunterTarget}
          onClick={() => submitHunterShot(hunterTarget)}
        >
          Confirm Shot
        </button>
      </>
    ) : (
      <p>Waiting for the Hunter to choose their final shot...</p>
    )}
  </div>
)}

      {roomCode && phase === "dayResults" && (
        <div className="result-screen-wrapper">
          <div className="result-asset-panel">
            <img
              className="result-panel-image"
              src={
                room?.killedUid
                  ? RESULT_IMAGES.lastNight
                  : RESULT_IMAGES.safe
              }
              alt={
                room?.killedUid
                  ? "Last Night Result"
                  : "Everyone Is Safe"
              }
            />

            {room?.killedUid &&
              (() => {
                const killedPlayer = players.find(
                  (player) => player.uid === room.killedUid
                );

                return (
                  <div className="result-dynamic-content result-night-content">
                    <img
                      className="result-character-avatar"
                      src={getMomoAvatar(killedPlayer?.momoType)}
                      alt={killedPlayer?.name || "Eliminated player"}
                    />

                    <strong className="result-character-name">
                      {killedPlayer?.name}
                    </strong>
                  </div>
                );
              })()}

            {isHost ? (
              <button
                type="button"
                className="result-continue-button"
                onClick={startDiscussion}
                aria-label="Continue to discussion"
              >
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Continue"
                />
              </button>
            ) : (
              <div className="result-continue-button result-continue-waiting">
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Waiting for host"
                />
              </div>
            )}
          </div>

          {!isHost && (
            <p className="result-waiting-message">
              Waiting for the host to continue...
            </p>
          )}
        </div>
      )}

      {roomCode && phase === "discussion" && (
        <div className="discussion-screen">
          <div className="discussion-header">
            <p>Day {room?.day}</p>
            <h2>Discussion</h2>
            <span>Talk. Accuse. Defend. Bluff.</span>
          </div>

          <div className="chat-box">
            {chatMessages.map((chat) => (
              <div
                key={chat.id}
                className={`chat-bubble ${
                  chat.uid === user?.uid ? "mine" : ""
                }`}
              >
                <strong>{chat.name}</strong>
                <p>{chat.text}</p>
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Type your message..."
            />
            <button onClick={sendChat}>Send</button>
          </div>

          {isHost && (
            <button className="werewolf-start-btn" onClick={startVoting}>
              Start Voting
            </button>
          )}
        </div>
      )}

      {roomCode && phase === "voting" && (
        <div className="werewolf-phase-card vote-card">
          <p className="phase-label">Voting</p>
          <h2>Choose who to banish</h2>

          <div className="target-grid">
            {alivePlayers
              .filter((p) => p.uid !== user?.uid)
              .map((player) => {
                const currentVote = mySelectedVote || room?.votes?.[user?.uid];
                const isSelected = currentVote === player.uid;

                return (
                  <button
                    key={player.uid}
                    type="button"
                    className={`vote-target-btn ${isSelected ? "voted" : ""}`}
                    onClick={() => submitVote(player.uid)}
                  >
                    <img
                      className="vote-momo-avatar"
                      src={getMomoAvatar(player.momoType)}
                      alt={player.momoType}
                    />
                    <strong>{player.name}</strong>

                    {isSelected && (
                      <small>✓ Voted</small>
                    )}
                  </button>
                );
              })}
          </div>

          <p className="small-note">
            Votes submitted: {Object.keys(room?.votes || {}).length} /{" "}
            {alivePlayers.length}
          </p>

          {room?.votes?.[user?.uid] && (
            <p className="werewolf-message">
              Your vote has been submitted.
            </p>
          )}

          {!me?.alive && (
            <p className="werewolf-message">
              You are out, so you cannot vote.
            </p>
          )}

          {isHost && (
            <button className="host-next-btn" onClick={resolveVote}>
              Host: Reveal Vote
            </button>
          )}

          {message && <p className="werewolf-message">{message}</p>}
        </div>
      )}

      {roomCode && phase === "voteResults" && (
        <div className="result-screen-wrapper">
          <div className="result-asset-panel">
            <img
              className="result-panel-image"
              src={RESULT_IMAGES.vote}
              alt="Vote Result"
            />

            {room?.executedUid &&
              (() => {
                const executedPlayer = players.find(
                  (player) => player.uid === room.executedUid
                );

                return (
                  <div className="result-dynamic-content result-vote-content">
                    <img
                      className="result-character-avatar"
                      src={getMomoAvatar(executedPlayer?.momoType)}
                      alt={executedPlayer?.name || "Eliminated player"}
                    />

                    <strong className="result-character-name">
                      {executedPlayer?.name}
                    </strong>
                  </div>
                );
              })()}

            {!room?.executedUid && (
              <div className="result-no-elimination-text">
                No one was eliminated.
              </div>
            )}

            {isHost ? (
              <button
                type="button"
                className="result-continue-button"
                onClick={nextRound}
                aria-label="Continue to the next night"
              >
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Continue"
                />
              </button>
            ) : (
              <div className="result-continue-button result-continue-waiting">
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Waiting for host"
                />
              </div>
            )}
          </div>

          {!isHost && (
            <p className="result-waiting-message">
              Waiting for the host to continue...
            </p>
          )}
        </div>
      )}

{/* =========================
   HOST CONTROL PANEL - START
   Keep this for real gameplay
   ========================= */}

{isHost &&
  roomCode &&
  phase !== "lobby" &&
  phase !== "gameOver" &&
  phase !== "gameSummary" && (
  <div className="host-control-panel">
    <strong>Host Controls</strong>

    <div>
      {phase === "discussion" && (
        <button onClick={hostEndDiscussion}>
          End Discussion
        </button>
      )}

      {phase === "voting" && (
        <button onClick={hostEndVoting}>
          Reveal Vote
        </button>
      )}

      {(phase === "night" || phase === "dayResults" || phase === "voteResults") && (
        <button onClick={hostRestartNight}>
          Restart Night
        </button>
      )}

      <button onClick={hostBackToLobby}>
        Back to Lobby
      </button>
    </div>
  </div>
)}

{/* =========================
   HOST CONTROL PANEL - END
   ========================= */}

      {roomCode && phase === "gameOver" && (
        <div className="result-screen-wrapper">
          <div className="result-asset-panel winner-result-panel">
            <img
              className="result-panel-image"
              src={
                room?.winner === "Werewolves"
                  ? RESULT_IMAGES.werewolvesWin
                  : RESULT_IMAGES.villageWin
              }
              alt={
                room?.winner === "Werewolves"
                  ? "Werewolves Win"
                  : "Village Wins"
              }
            />

            {isHost ? (
              <button
                type="button"
                className="result-continue-button"
                onClick={showGameSummary}
                aria-label="View game summary"
              >
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Continue"
                />
              </button>
            ) : (
              <div className="result-continue-button result-continue-waiting">
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Waiting for host"
                />
              </div>
            )}
          </div>

          {!isHost && (
            <p className="result-waiting-message">
              Waiting for the host to continue...
            </p>
          )}
        </div>
      )}


      {roomCode && phase === "gameSummary" && (
        <div className="result-screen-wrapper">
          <div className="result-asset-panel summary-result-panel">
            <img
              className="result-panel-image"
              src={RESULT_IMAGES.summary}
              alt="Game Summary"
            />

            <div className="game-summary-player-list">
              {players.map((player) => (
                <div
                  className="game-summary-player-row"
                  key={player.uid}
                >
                  <img
                    className="game-summary-avatar"
                    src={getMomoAvatar(player.momoType)}
                    alt={player.name}
                  />

                  <div className="game-summary-player-info">
                    <strong>{player.name}</strong>

                   <small
                    className={
                      player.role === ROLES.WEREWOLF ||
                      player.role === ROLES.MINION
                        ? "evil-role"
                        : ""
                    }
                  >
                    {player.role}
                  </small>
                  </div>

                  <span
                    className={`game-summary-team ${
                      ROLE_INFO[player.role]?.team === "Evil"
                        ? "evil"
                        : "good"
                    }`}
                  >
                    {ROLE_INFO[player.role]?.team}
                  </span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                className="result-continue-button summary-continue-button"
                onClick={playAgain}
                aria-label="Return to lobby"
              >
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Continue"
                />
              </button>
            ) : (
              <div className="result-continue-button summary-continue-button result-continue-waiting">
                <img
                  src={RESULT_IMAGES.continueButton}
                  alt="Waiting for host"
                />
              </div>
            )}
          </div>

          {!isHost && (
            <p className="result-waiting-message">
              Waiting for the host to return to the lobby...
            </p>
          )}
        </div>
      )}


    </div>
  );
}