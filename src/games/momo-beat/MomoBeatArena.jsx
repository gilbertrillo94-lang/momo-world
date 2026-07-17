import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./MomoBeatArena.css";
import {
  generateBeatmap,
  prewarmBeatmap,
} from "./beatmapGenerator";

const MAX_PLAYERS = 6;
const APPROACH_MS = 1550;

const HIT_WINDOWS = {
  perfect: 52,
  great: 96,
  good: 145,
  miss: 185,
};

const SCORE_VALUES = {
  perfect: 1000,
  great: 700,
  good: 400,
};

const SONGS = [
  {
    id: "someday-maybe",
    title: "Someday Maybe",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 237,
    speed: 6.0,
    bpm: 96,
    audioOffset: 0,
    audio: "/assets/songs/song1.mp3",
    preview: "/assets/songs/song1.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover2.png",
    background: "/assets/background.jpeg",
    patternOffset: 20,
    accent: "#ff88c5",
  },
  {
    id: "dear-future-lover",
    title: "Dear Future Lover",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 175,
    speed: 5.8,
    bpm: 105,
    audioOffset: 0,
    audio: "/assets/songs/song2.mp3",
    preview: "/assets/songs/song2.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover1.png",
    background: "/assets/background.jpeg",
    patternOffset: 19,
    accent: "#72ddff",
  },
  {
    id: "simpleng-tao",
    title: "Simpleng Tao",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 244,
    speed: 5.7,
    bpm: 150,
    audioOffset: 0,
    audio: "/assets/songs/song3.mp3",
    preview: "/assets/songs/song3.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover3.png",
    background: "/assets/background.jpeg",
    patternOffset: 18,
    accent: "#ffe36e",
  },
  {
    id: "caramel-dansen",
    title: "Caramel Dansen",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 177,
    speed: 6.8,
    bpm: 165,
    audioOffset: 0,
    audio: "/assets/songs/song4.mp3",
    preview: "/assets/songs/song4.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover4.png",
    background: "/assets/background.jpeg",
    patternOffset: 17,
    accent: "#a98fff",
  },
  {
    id: "kimi-ga-kureta-mono",
    title: "Kimi Ga Kureta Mono",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 358,
    speed: 5.3,
    bpm: 90,
    audioOffset: 0,
    audio: "/assets/songs/song5.mp3",
    preview: "/assets/songs/song5.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover5.png",
    background: "/assets/background.jpeg",
    patternOffset: 16,
    accent: "#ffb7d8",
  },
  {
    id: "zen-zen",
    title: "Zen Zen",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 284,
    speed: 7.0,
    bpm: 190,
    audioOffset: 0,
    audio: "/assets/songs/song6.mp3",
    preview: "/assets/songs/song6.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover6.png",
    background: "/assets/background.jpeg",
    patternOffset: 15,
    beatmapFile: "/assets/beatmaps/zen-zen.osu",
    accent: "#70e1ff",
  },
  {
    id: "we-are-one-piece",
    title: "We Are! One Piece",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 242,
    speed: 4.5,
    bpm: 130,
    audioOffset: 0,
    audio: "/assets/songs/song7.mp3",
    preview: "/assets/songs/song7.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover7.png",
    background: "/assets/background.jpeg",
    patternOffset: 2,
    accent: "#ffd66e",
  },
  {
    id: "nandemonaiya",
    title: "Nandemonaiya Kimi No Nawa",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 344,
    speed: 6.6,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song8.mp3",
    preview: "/assets/songs/song8.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover8.png",
    background: "/assets/background.jpeg",
    patternOffset: 14,
    accent: "#8ed8ff",
  },
  {
    id: "only-you-miss-a",
    title: "Only You (Miss A)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 201,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song9.mp3",
    preview: "/assets/songs/song9.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover9.png",
    background: "/assets/background.jpeg",
    patternOffset: 2,
    accent: "#ff8ac9",
  },
  {
    id: "someday-iu",
    title: "Someday (IU)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 220,
    speed: 5.5,
    bpm: 135,
    audioOffset: 0,
    audio: "/assets/songs/song10.mp3",
    preview: "/assets/songs/song10.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover10.png",
    background: "/assets/background.jpeg",
    patternOffset: 11,
    accent: "#d29bff",
  },
  {
    id: "dream-high",
    title: "Dream High",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 224,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song11.mp3",
    preview: "/assets/songs/song11.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover11.png",
    background: "/assets/background.jpeg",
    patternOffset: 0,
    accent: "#78e7ff",
  },
  {
    id: "mr-chu",
    title: "Mr. Chu",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 205,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song12.mp3",
    preview: "/assets/songs/song12.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover12.png",
    background: "/assets/background.jpeg",
    patternOffset: 1,
    accent: "#ff9acb",
  },
  {
    id: "you-and-i-iu",
    title: "You and I (IU)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 223,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song13.mp3",
    preview: "/assets/songs/song13.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover13.png",
    background: "/assets/background.jpeg",
    patternOffset: 9,
    accent: "#c99bff",
  },
  {
    id: "blue-valentine",
    title: "Blue Valentine (NMIXX)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 184,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song14.mp3",
    preview: "/assets/songs/song14.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover14.png",
    background: "/assets/background.jpeg",
    patternOffset: 2,
    beatmapFile: "/assets/beatmaps/blue-valentine.osu",
    accent: "#69cfff",
  },
  {
    id: "celebration",
    title: "Celebration (LE SSERAFIM)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 150,
    speed: 5.5,
    bpm: 130,
    audioOffset: 0,
    audio: "/assets/songs/song15.mp3",
    preview: "/assets/songs/song15.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover15.png",
    background: "/assets/background.jpeg",
    patternOffset: 4,
    accent: "#ffd76c",
  },
  {
    id: "turn-the-page",
    title: "Turn The Page (Sam Lim)",
    artist: "Element Beat",
    difficulty: "HARD",
    duration: 157,
    speed: 5.5,
    bpm: 168,
    audioOffset: 0,
    audio: "/assets/songs/song16.mp3",
    preview: "/assets/songs/song16.mp3",
    previewStart: 42,
    cover: "/assets/covers/cover16.png",
    background: "/assets/background.jpeg",
    patternOffset: 25,
    accent: "#ff7b9e",
  },
  {
    id: "join-us-for-a-bite",
    title: "Join Us for a Bite (FNAF)",
    artist: "Element Beat",
    difficulty: "NORMAL",
    duration: 251,
    speed: 3.5,
    bpm: 130,
    audioOffset: 0,
    audio: "/assets/songs/song17.mp3",
    preview: "/assets/songs/song17.mp3",
    previewStart: 27,
    cover: "/assets/covers/cover17.png",
    background: "/assets/background.jpeg",
    patternOffset: 30,
    accent: "#ff8e6e",
  },
  {
    id: "bride-in-dream",
    title: "Bride in Dream",
    artist: "Element Beat",
    difficulty: "HARD",
    duration: 151,
    speed: 7.5,
    bpm: 116,
    audioOffset: 0,
    audio: "/assets/songs/song18.mp3",
    preview: "/assets/songs/song18.mp3",
    previewStart: 27,
    cover: "/assets/covers/cover18.png",
    background: "/assets/background.jpeg",
    patternOffset: 30,
    beatmapFile: "/assets/beatmaps/bride-in-dream.osu",
    accent: "#cf8cff",
  },
];

const LANE_META = [
  { id: 0, key: "d", color: "#faf7ff", glow: "#ffffff" },
  { id: 1, key: "f", color: "#65dcff", glow: "#65dcff" },
  { id: 2, key: "j", color: "#ff8cc4", glow: "#ff8cc4" },
  { id: 3, key: "k", color: "#ffe36e", glow: "#ffe36e" },
];

function emptyStats() {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    judged: 0,
    lastJudgement: "",
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = String(safe % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function accuracyFrom(stats) {
  if (!stats.judged) return 100;

  return (
    ((stats.perfect + stats.great * 0.7 + stats.good * 0.4) /
      stats.judged) *
    100
  );
}

function gradeFrom(accuracy) {
  if (accuracy >= 98) return "S";
  if (accuracy >= 93) return "A";
  if (accuracy >= 85) return "B";
  if (accuracy >= 75) return "C";
  return "D";
}



function normalizePlayer(uid, data = {}) {
  return {
    uid,
    name: data.name || "Player",
    avatar: data.avatar || "/momo-beat/ui/default-avatar.png",
    ready: Boolean(data.ready),
    voteSongId: data.voteSongId || SONGS[0].id,
    voteDifficulty: data.voteDifficulty || "NORMAL",
    score: Number(data.score || 0),
    combo: Number(data.combo || 0),
    maxCombo: Number(data.maxCombo || 0),
    accuracy: Number(data.accuracy ?? 100),
    perfect: Number(data.perfect || 0),
    great: Number(data.great || 0),
    good: Number(data.good || 0),
    miss: Number(data.miss || 0),
    beatmapReady: Boolean(data.beatmapReady),
    finished: Boolean(data.finished),
  };
}

export default function MomoBeatArena({
  user,
  momoImage = "/momo-beat/ui/default-avatar.png",
  initialRoomCode = "",
  onExit = () => {},
}) {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("solo");
  const [selectedSongId, setSelectedSongId] = useState(SONGS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState("NORMAL");
  const [songSelectionSource, setSongSelectionSource] = useState("solo");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [showJoinRoomPopup, setShowJoinRoomPopup] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState({});
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);

  const [countdown, setCountdown] = useState(null);
  const [gameStats, setGameStats] = useState(emptyStats());
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [hasForfeited, setHasForfeited] = useState(false);
  const [resultRows, setResultRows] = useState([]);

  const [beatmapLoading, setBeatmapLoading] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const previewAudioRef = useRef(null);
  const songSwipeStartXRef = useRef(null);
  const animationFrameRef = useRef(null);
  const frameLoopRef = useRef(null);
  const countdownTimersRef = useRef([]);
  const chartRef = useRef([]);
  const visibleNotesRef = useRef([]);
  const nextNoteIndexRef = useRef(0);
  const pressedLanesRef = useRef(new Set());
  const hitLineFlashRef = useRef(0);
  const lastHitLaneRef = useRef(-1);
  const hitImpactRef = useRef({
  lane: -1,
  startedAt: 0,
  judgement: "",
});
  const statsRef = useRef(emptyStats());
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const lastLiveSyncRef = useRef(0);
  const lastHudSyncRef = useRef(0);
  const pausedRef = useRef(false);
  const inviteJoinAttemptedRef = useRef(false);

  const currentUser = useMemo(
    () => ({
      uid: user?.uid || "local-player",
      name: user?.displayName || user?.name || "Player",
      avatar: momoImage,
    }),
    [momoImage, user]
  );

  const selectedSong =
    SONGS.find((song) => song.id === selectedSongId) || SONGS[0];

useEffect(() => {
  if (screen !== "songs") {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }

    return;
  }

  if (!selectedSong?.preview) return;

  if (previewAudioRef.current) {
    previewAudioRef.current.pause();
    previewAudioRef.current.currentTime = 0;
  }

  const previewAudio = new Audio(selectedSong.preview);

  previewAudio.volume = 0.35;
  previewAudio.preload = "auto";

  const startPreview = () => {
    const previewStart = Number(selectedSong.previewStart || 0);
    const safeStart = Math.min(
      previewStart,
      Math.max(0, previewAudio.duration - 1)
    );

    previewAudio.currentTime = safeStart;

    previewAudio.play().catch(() => {
      // Mobile browsers may block autoplay until the player taps.
    });
  };

  if (previewAudio.readyState >= 1) {
    startPreview();
  } else {
    previewAudio.addEventListener(
      "loadedmetadata",
      startPreview,
      { once: true }
    );
  }

  previewAudioRef.current = previewAudio;

  return () => {
    previewAudio.pause();
    previewAudio.removeEventListener(
      "loadedmetadata",
      startPreview
    );

    if (previewAudioRef.current === previewAudio) {
      previewAudioRef.current = null;
    }
  };
}, [screen, selectedSong]);

  const roomSong =
    SONGS.find((song) => song.id === room?.songId) || selectedSong;

  const currentRoomPlayer = players.find(
    (player) => player.uid === currentUser.uid
  );

  const isHost = room?.hostUid === currentUser.uid;

  const clearTimers = useCallback(() => {
    countdownTimersRef.current.forEach(window.clearTimeout);
    countdownTimersRef.current = [];
  }, []);

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }, []);

  const stopEngine = useCallback(() => {
  window.cancelAnimationFrame(animationFrameRef.current);
  clearTimers();
  stopAudio();

  if (previewAudioRef.current) {
    previewAudioRef.current.pause();
    previewAudioRef.current.currentTime = 0;
    previewAudioRef.current = null;
  }

  startedRef.current = false;
  pausedRef.current = false;
}, [clearTimers, stopAudio]);

  useEffect(() => {
    return stopEngine;
  }, [stopEngine]);

  useEffect(() => {
    async function joinFromInvite() {
      if (
  !initialRoomCode ||
  !currentUser.uid ||
  roomId ||
  inviteJoinAttemptedRef.current
) {
  return;
}

inviteJoinAttemptedRef.current = true;

      const code = initialRoomCode.trim().toUpperCase();
      if (!code) return;

      try {
        const roomRef = doc(db, "momoBeatRooms", code);
        const snapshot = await getDoc(roomRef);

        if (!snapshot.exists()) {
          setMessage("This Beat Arena room no longer exists.");
          return;
        }

        const roomData = snapshot.data();

        if (roomData.status !== "lobby") {
          setMessage("That Beat Arena match has already started.");
          return;
        }

        await setDoc(
          doc(db, "momoBeatRooms", code, "players", currentUser.uid),
          {
            name: currentUser.name,
            avatar: currentUser.avatar,
            ready: false,
            beatmapReady: false,
            voteSongId: roomData.songId || SONGS[0].id,
            voteDifficulty: roomData.difficulty || "NORMAL",
            ...emptyStats(),
            accuracy: 100,
            finished: false,
            joinedAt: serverTimestamp(),
          }
        );

        setMode(roomData.mode || "battle");
        setRoomId(code);
        setScreen("lobby");
      } catch (error) {
        console.error(error);
        setMessage("Could not join the invited Beat Arena room.");
      }
    }

    joinFromInvite();
  }, [currentUser, initialRoomCode, roomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    const roomRef = doc(db, "momoBeatRooms", roomId);
    const playerCollection = collection(
      db,
      "momoBeatRooms",
      roomId,
      "players"
    );

    const messagesQuery = query(
    collection(db, "momoBeatRooms", roomId, "messages"),
    orderBy("createdAt", "asc")
    );

    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessage("The room was closed.");
        setRoomId(null);
        setRoom(null);
        setPlayers([]);
        setScreen("home");
        return;
      }

      setRoom({ id: snapshot.id, ...snapshot.data() });
    });

    const unsubscribePlayers = onSnapshot(
      playerCollection,
      (snapshot) => {
        setPlayers(
          snapshot.docs.map((playerDoc) =>
            normalizePlayer(playerDoc.id, playerDoc.data())
          )
        );
      }
    );

    const unsubscribeMessages = onSnapshot(
  messagesQuery,
  (snapshot) => {
    setChatMessages(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }
);

   return () => {
    unsubscribeRoom();
    unsubscribePlayers();
    unsubscribeMessages();
    };
  }, [roomId]);

  useEffect(() => {
    if (!room || !roomId) return;

    if (room.songId) {
  setSelectedSongId(room.songId);
}

if (room.difficulty) {
  setSelectedDifficulty(room.difficulty);
}

    if (
      room.status === "playing" &&
      room.startAt &&
      !startedRef.current
    ) {
      setSelectedSongId(room.songId);
      setSelectedDifficulty(room.difficulty || "NORMAL");
      setScreen("game");
    }

    if (room.status === "results" && screen !== "results") {
      setResultRows([...players].sort((a, b) => b.score - a.score));
      setScreen("results");
    }
  }, [players, room, roomId, screen]);

useEffect(() => {
  if (
    mode === "solo" ||
    !roomId ||
    room?.status !== "preparing" ||
    !room?.songId ||
    !currentRoomPlayer ||
    currentRoomPlayer.beatmapReady
  ) {
    return;
  }

  let cancelled = false;

  async function prepareOnlineBeatmap() {
    const song =
      SONGS.find((item) => item.id === room.songId) ||
      SONGS[0];

    const difficulty =
      room.difficulty || "NORMAL";

    setBeatmapLoading(true);
    setMessage("Creating automatic beatmap...");

    try {
      await prewarmBeatmap(song, difficulty);

      if (cancelled) return;

      await updateDoc(
        doc(
          db,
          "momoBeatRooms",
          roomId,
          "players",
          currentUser.uid
        ),
        {
          beatmapReady: true,
        }
      );

      setMessage("Beatmap ready. Waiting for players...");
    } catch (error) {
      console.error(error);

      if (!cancelled) {
        setMessage("Could not prepare the automatic beatmap.");
      }
    } finally {
      if (!cancelled) {
        setBeatmapLoading(false);
      }
    }
  }

  prepareOnlineBeatmap();

  return () => {
    cancelled = true;
  };
}, [
  currentRoomPlayer,
  currentUser.uid,
  mode,
  room?.difficulty,
  room?.songId,
  room?.status,
  roomId,
]);

  const createRoom = useCallback(
    async (roomMode) => {
      setMessage("");

      const code = makeRoomCode();
      const roomRef = doc(db, "momoBeatRooms", code);

      await setDoc(roomRef, {
        code,
        mode: roomMode,
        hostUid: currentUser.uid,
        status: "lobby",
        songId: selectedSongId,
        difficulty: selectedDifficulty,
        maxPlayers: MAX_PLAYERS,
        startAt: null,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "momoBeatRooms", code, "players", currentUser.uid),
        {
          name: currentUser.name,
          avatar: currentUser.avatar,
          ready: false,
          beatmapReady: false,
          voteSongId: selectedSongId,
          voteDifficulty: selectedDifficulty,
          ...emptyStats(),
          accuracy: 100,
          finished: false,
          joinedAt: serverTimestamp(),
        }
      );

      setMode(roomMode);
      setRoomId(code);
      setScreen("lobby");
    },
    [currentUser, selectedDifficulty, selectedSongId]
  );

  const joinRoom = useCallback(async (enteredCode = roomCodeInput) => {
  const code = enteredCode.trim().toUpperCase();

    if (!code) {
      setMessage("Enter a room code.");
      return;
    }

    setMessage("");

    const roomRef = doc(db, "momoBeatRooms", code);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
      setMessage("Room not found.");
      return;
    }

    const roomData = snapshot.data();

    if (roomData.status !== "lobby") {
      setMessage("That match has already started.");
      return;
    }

    if (mode !== "solo" && roomData.mode && roomData.mode !== mode) {
      setMessage(`This code belongs to a ${roomData.mode === "battle" ? "Battle" : "Co-op"} room.`);
      return;
    }

    await setDoc(
      doc(db, "momoBeatRooms", code, "players", currentUser.uid),
      {
        name: currentUser.name,
        avatar: currentUser.avatar,
        ready: false,
        beatmapReady: false,
        voteSongId: roomData.songId || SONGS[0].id,
        voteDifficulty: roomData.difficulty || "NORMAL",
        ...emptyStats(),
        accuracy: 100,
        finished: false,
        joinedAt: serverTimestamp(),
      }
    );

    setMode(roomData.mode || "battle");
    setRoomId(code);
    setScreen("lobby");
  }, [currentUser, roomCodeInput]);

  const leaveRoom = useCallback(async () => {
    if (!roomId) {
      setScreen("home");
      return;
    }

    try {
      await deleteDoc(
        doc(db, "momoBeatRooms", roomId, "players", currentUser.uid)
      );

      if (isHost) {
        await deleteDoc(doc(db, "momoBeatRooms", roomId));
      }
    } catch (error) {
      console.warn(error);
    }

    setRoomId(null);
    setRoom(null);
    setPlayers([]);
    setShowInvitePanel(false);
    setInvitedFriends({});
    setRoomCodeCopied(false);
    setScreen("home");
  }, [currentUser.uid, isHost, mode, roomId]);

  const loadFriends = useCallback(async () => {
    if (!currentUser.uid) {
      setMessage("Still loading your player profile.");
      return;
    }

    try {
      const friendsSnapshot = await getDocs(
        collection(db, "users", currentUser.uid, "friends")
      );

      const loadedFriends = friendsSnapshot.docs.map((friendDoc) => ({
        id: friendDoc.id,
        uid: friendDoc.data().uid || friendDoc.id,
        ...friendDoc.data(),
      }));

      setFriends(loadedFriends);
      setShowInvitePanel(true);

      if (loadedFriends.length === 0) {
        setMessage("No friends found yet. You can still share the room code.");
      } else {
        setMessage("");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not load your friends.");
      setShowInvitePanel(true);
    }
  }, [currentUser.uid]);

  const inviteFriend = useCallback(
    async (friend) => {
      if (!roomId || !currentUser.uid) return;

      const friendUid = friend.uid || friend.id;

      if (!friendUid) {
        setMessage("Could not find this friend's ID.");
        return;
      }

      const inviteId = `beat-${roomId}-${currentUser.uid}`;

      try {
        await setDoc(
          doc(db, "users", friendUid, "postcards", inviteId),
          {
            id: inviteId,
            type: "beatArenaInvite",
            game: "momoBeatArena",
            mode,
            fromUid: currentUser.uid,
            fromUsername: currentUser.name,
            fromAvatar: currentUser.avatar,
            roomCode: roomId,
            message: `${currentUser.name} invited you to a ${
              mode === "battle" ? "Battle" : "Co-op"
            } match in Momo Beat Arena.`,
            read: false,
            createdAt: Date.now(),
          },
          { merge: true }
        );

        setInvitedFriends((current) => ({
          ...current,
          [friendUid]: true,
        }));

        setMessage(
          `Invited ${
            friend.username || friend.playerName || friend.name || "friend"
          }!`
        );
      } catch (error) {
        console.error(error);
        setMessage("Could not send that invitation.");
      }
    },
    [currentUser, mode, roomId]
  );

  const copyRoomCode = useCallback(async () => {
    if (!roomId) return;

    const code = roomId.trim().toUpperCase();

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

      window.setTimeout(() => {
        setRoomCodeCopied(false);
        setMessage("");
      }, 1400);
    } catch (error) {
      console.error(error);
      setMessage(`Copy failed. Room code: ${code}`);
    }
  }, [roomId]);

  const sendChatMessage = useCallback(async () => {
  if (!roomId || !chatText.trim()) return;

  try {
    await addDoc(
      collection(db, "momoBeatRooms", roomId, "messages"),
      {
        uid: currentUser.uid,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: chatText.trim(),
        createdAt: serverTimestamp(),
      }
    );

    setChatText("");
  } catch (error) {
    console.error(error);
  }
}, [chatText, currentUser, roomId]);

useEffect(() => {
  if (!chatMessagesRef.current) return;

  chatMessagesRef.current.scrollTop =
    chatMessagesRef.current.scrollHeight;
}, [chatMessages]);


  const toggleReady = useCallback(async () => {
    if (!roomId || !currentRoomPlayer) return;

    await updateDoc(
      doc(db, "momoBeatRooms", roomId, "players", currentUser.uid),
      {
        ready: !currentRoomPlayer.ready,
      }
    );
  }, [currentRoomPlayer, currentUser.uid, roomId]);

  const voteSong = useCallback(
  async (songId) => {
    setSelectedSongId(songId);

    if (!roomId) return;

    await updateDoc(
      doc(db, "momoBeatRooms", roomId, "players", currentUser.uid),
      {
        voteSongId: songId,
      }
    );

    if (isHost) {
      await updateDoc(
        doc(db, "momoBeatRooms", roomId),
        {
          songId,
        }
      );
    }
  },
  [currentUser.uid, isHost, roomId]
);

  const voteDifficulty = useCallback(
  async (difficulty) => {
    setSelectedDifficulty(difficulty);

    if (!roomId) return;

    await updateDoc(
      doc(db, "momoBeatRooms", roomId, "players", currentUser.uid),
      {
        voteDifficulty: difficulty,
      }
    );

    if (isHost) {
      await updateDoc(
        doc(db, "momoBeatRooms", roomId),
        {
          difficulty,
        }
      );
    }
  },
  [currentUser.uid, isHost, roomId]
);

  const winningVoteDifficulty = useCallback(() => {
    const totals = new Map();

    players.forEach((player) => {
      totals.set(
        player.voteDifficulty,
        (totals.get(player.voteDifficulty) || 0) + 1
      );
    });

    return (
      [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      selectedDifficulty
    );
  }, [players, selectedDifficulty]);

  const winningVoteSong = useCallback(() => {
    const totals = new Map();

    players.forEach((player) => {
      totals.set(
        player.voteSongId,
        (totals.get(player.voteSongId) || 0) + 1
      );
    });

    return (
      [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      selectedSongId
    );
  }, [players, selectedSongId]);

  const startOnlineMatch = useCallback(async () => {
  if (!roomId || !isHost) return;

  if (players.length < 2) {
    setMessage("At least two players are required.");
    return;
  }

  if (!players.every((player) => player.ready)) {
    setMessage("Everyone must be ready.");
    return;
  }

  setMessage("Preparing beatmaps...");

  const songId = winningVoteSong();
  const difficulty = winningVoteDifficulty();

  await Promise.all(
    players.map((player) =>
      updateDoc(
        doc(
          db,
          "momoBeatRooms",
          roomId,
          "players",
          player.uid
        ),
        {
          ...emptyStats(),
          accuracy: 100,
          finished: false,
          ready: false,
          beatmapReady: false,
        }
      )
    )
  );

  await updateDoc(
    doc(db, "momoBeatRooms", roomId),
    {
      status: "preparing",
      songId,
      difficulty,
      startAt: null,
    }
  );
}, [
  isHost,
  players,
  roomId,
  winningVoteDifficulty,
  winningVoteSong,
]);

useEffect(() => {
  if (
    !isHost ||
    !roomId ||
    room?.status !== "preparing" ||
    players.length === 0
  ) {
    return;
  }

  const everyoneBeatmapReady = players.every(
    (player) => player.beatmapReady
  );

  if (!everyoneBeatmapReady) return;

  updateDoc(doc(db, "momoBeatRooms", roomId), {
    status: "playing",
    startAt: Date.now() + 4200,
  }).catch((error) => {
    console.error(error);
    setMessage("Could not start the match.");
  });
}, [
  isHost,
  players,
  room?.status,
  roomId,
]);

  const publishLiveScore = useCallback(async () => {
    if (!roomId || mode === "solo") return;

    const now = Date.now();
    if (now - lastLiveSyncRef.current < 350) return;
    lastLiveSyncRef.current = now;

    const stats = statsRef.current;

    await updateDoc(
      doc(db, "momoBeatRooms", roomId, "players", currentUser.uid),
      {
        score: stats.score,
        combo: stats.combo,
        maxCombo: stats.maxCombo,
        perfect: stats.perfect,
        great: stats.great,
        good: stats.good,
        miss: stats.miss,
        accuracy: accuracyFrom(stats),
      }
    );
  }, [currentUser.uid, mode, roomId]);

  const finishSolo = useCallback(() => {
    const stats = statsRef.current;

    setResultRows([
      {
        uid: currentUser.uid,
        name: currentUser.name,
        avatar: currentUser.avatar,
        ...stats,
        accuracy: accuracyFrom(stats),
        finished: true,
      },
    ]);

    setScreen("results");
  }, [currentUser]);

  const finishOnline = useCallback(async () => {
    if (!roomId) return;

    const stats = statsRef.current;

    await updateDoc(
      doc(db, "momoBeatRooms", roomId, "players", currentUser.uid),
      {
        score: stats.score,
        combo: stats.combo,
        maxCombo: stats.maxCombo,
        perfect: stats.perfect,
        great: stats.great,
        good: stats.good,
        miss: stats.miss,
        accuracy: accuracyFrom(stats),
        finished: true,
      }
    );
  }, [currentUser.uid, roomId]);

  const forfeitOnlineMatch = useCallback(async () => {
  if (!roomId || mode === "solo" || hasForfeited) return;

  finishedRef.current = true;
  pausedRef.current = false;

  window.cancelAnimationFrame(animationFrameRef.current);

  if (audioRef.current) {
    audioRef.current.pause();
  }

  const forfeitedStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    accuracy: 0,
    finished: true,
  };

  statsRef.current = {
    ...emptyStats(),
    ...forfeitedStats,
  };

  setGameStats({
    ...emptyStats(),
    ...forfeitedStats,
  });

  try {
    await updateDoc(
      doc(
        db,
        "momoBeatRooms",
        roomId,
        "players",
        currentUser.uid
      ),
      forfeitedStats
    );

    setHasForfeited(true);
    setShowForfeitConfirm(false);
  } catch (error) {
    console.error(error);
    setMessage("Could not forfeit the match.");
  }
}, [
  currentUser.uid,
  hasForfeited,
  mode,
  roomId,
]);

  const finishGame = useCallback(async () => {
    if (finishedRef.current) return;

    finishedRef.current = true;
    window.cancelAnimationFrame(animationFrameRef.current);
    audioRef.current?.pause();

    if (mode === "solo") {
      finishSolo();
    } else {
      await finishOnline();
    }
  }, [finishOnline, finishSolo, mode]);

  useEffect(() => {
    if (
      mode === "solo" ||
      !roomId ||
      room?.status !== "playing" ||
      players.length === 0
    ) {
      return;
    }

    if (players.every((player) => player.finished)) {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      setResultRows(sorted);

      if (isHost) {
        updateDoc(doc(db, "momoBeatRooms", roomId), {
          status: "results",
          startAt: null,
        }).catch(console.warn);
      }
    }
  }, [isHost, mode, players, room?.status, roomId]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;

    if (!canvas || !audio) return;

    const context = canvas.getContext("2d");
    const rectangle = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const targetWidth = Math.floor(rectangle.width * dpr);
    const targetHeight = Math.floor(rectangle.height * dpr);

    if (
      canvas.width !== targetWidth ||
      canvas.height !== targetHeight
    ) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rectangle.width, rectangle.height);

    const laneWidth = rectangle.width / 4;
    const hitLineY = rectangle.height - 80;
    const currentTime = audio.currentTime * 1000;

    const laneGradient = context.createLinearGradient(
      0,
      0,
      0,
      rectangle.height
    );
    laneGradient.addColorStop(0, "rgba(255,255,255,0.018)");
    laneGradient.addColorStop(1, "rgba(255,255,255,0.065)");

    for (let lane = 0; lane < 4; lane += 1) {
      context.fillStyle = pressedLanesRef.current.has(lane)
        ? "rgba(255,255,255,0.14)"
        : laneGradient;

      context.fillRect(
        lane * laneWidth,
        0,
        laneWidth,
        rectangle.height
      );

      if (lane > 0) {
        context.strokeStyle = "rgba(255,255,255,0.10)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(lane * laneWidth, 0);
        context.lineTo(lane * laneWidth, rectangle.height);
        context.stroke();
      }
    }

    context.fillStyle = "rgba(255,255,255,0.10)";
    context.fillRect(0, hitLineY - 45, rectangle.width, 78);

    const hitLineFlashProgress = clamp(
        1 - (performance.now() - hitLineFlashRef.current) / 130,
        0,
        1
     );

    context.shadowColor = "#ffffff";
    context.shadowBlur = 16 + hitLineFlashProgress * 22;

    context.fillStyle = hitLineFlashProgress > 0
    ? `rgba(255,255,255,${0.88 + hitLineFlashProgress * 0.12})`
    : "#ffffff";

    context.fillRect(
    0,
    hitLineY - hitLineFlashProgress * 2,
    rectangle.width,
    4 + hitLineFlashProgress * 4
    );

    context.shadowBlur = 0;

    const hitImpactAge =
  performance.now() - hitImpactRef.current.startedAt;

if (
  hitImpactRef.current.lane >= 0 &&
  hitImpactAge >= 0 &&
  hitImpactAge < 150
) {
  const impactProgress = hitImpactAge / 150;
  const impactLane = hitImpactRef.current.lane;

  const impactX =
    impactLane * laneWidth + laneWidth / 2;

  const impactAlpha = 1 - impactProgress;
  const burstHeight = 24 + impactProgress * 42;
  const burstWidth = laneWidth * 0.42;

  const impactColor =
    hitImpactRef.current.judgement === "perfect"
      ? "255, 240, 160"
      : hitImpactRef.current.judgement === "great"
      ? "114, 221, 255"
      : "145, 246, 168";

  const burstGradient = context.createLinearGradient(
    impactX,
    hitLineY,
    impactX,
    hitLineY - burstHeight
  );

  burstGradient.addColorStop(
    0,
    `rgba(${impactColor}, ${0.78 * impactAlpha})`
  );

  burstGradient.addColorStop(
    1,
    `rgba(${impactColor}, 0)`
  );

  context.save();

  context.globalAlpha = impactAlpha;
  context.fillStyle = burstGradient;
  context.shadowColor = `rgba(${impactColor}, 0.9)`;
  context.shadowBlur = 18;

  context.beginPath();
  context.moveTo(
    impactX - burstWidth / 2,
    hitLineY
  );
  context.lineTo(
    impactX - burstWidth * 0.18,
    hitLineY - burstHeight
  );
  context.lineTo(
    impactX + burstWidth * 0.18,
    hitLineY - burstHeight
  );
  context.lineTo(
    impactX + burstWidth / 2,
    hitLineY
  );
  context.closePath();
  context.fill();

  context.fillStyle = `rgba(${impactColor}, ${
    0.9 * impactAlpha
  })`;

  context.beginPath();
  context.arc(
    impactX,
    hitLineY,
    5 + impactProgress * 4,
    0,
    Math.PI * 2
  );
  context.fill();

  context.restore();
}

    visibleNotesRef.current.forEach((note) => {
      if (note.judged) return;

      const progress =
        1 - (note.time - currentTime) / APPROACH_MS;

      const y = clamp(progress, 0, 1) * hitLineY;
      const x = note.lane * laneWidth + 8;
      const width = laneWidth - 16;

      const lane = LANE_META[note.lane];

      context.shadowColor = lane.glow;
      context.shadowBlur = 18;
      context.fillStyle = lane.color;
      context.beginPath();
      context.roundRect(x, y - 12, width, 24, 10);
      context.fill();
      context.shadowBlur = 0;

      context.fillStyle = "rgba(255,255,255,0.55)";
      context.beginPath();
      context.roundRect(x + 5, y - 8, width - 10, 5, 4);
      context.fill();
    });
  }, []);

  const registerMiss = useCallback(() => {
    const stats = statsRef.current;

    stats.combo = 0;
    stats.miss += 1;
    stats.judged += 1;
    stats.lastJudgement = "MISS";

    const now = Date.now();
    if (now - lastHudSyncRef.current > 50) {
      setGameStats({ ...stats });
      lastHudSyncRef.current = now;
    }
  }, []);

    const registerHit = useCallback((judgement) => {
    const stats = statsRef.current;

    stats.combo += 1;
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
    stats[judgement] += 1;
    stats.judged += 1;
    stats.lastJudgement = judgement.toUpperCase();

    hitLineFlashRef.current = performance.now();

    hitImpactRef.current = {
    lane: lastHitLaneRef.current,
    startedAt: performance.now(),
    judgement,
    };

    const multiplier =
      1 + Math.min(1.5, Math.floor(stats.combo / 25) * 0.2);

    stats.score += Math.round(
      SCORE_VALUES[judgement] * multiplier
    );

    setGameStats({ ...stats });
  }, []);

  const hitLane = useCallback(
    (lane) => {
      if (
        !audioRef.current ||
        pausedRef.current ||
        countdown !== null
      ) {
        return;
      }

      const now = audioRef.current.currentTime * 1000;

      const candidate = visibleNotesRef.current
        .filter((note) => note.lane === lane && !note.judged)
        .sort(
          (a, b) =>
            Math.abs(a.time - now) - Math.abs(b.time - now)
        )[0];

      if (!candidate) return;

      const distance = Math.abs(candidate.time - now);

      if (distance > HIT_WINDOWS.miss) return;

      candidate.judged = true;
      lastHitLaneRef.current = lane;

      if (distance <= HIT_WINDOWS.perfect) {
        registerHit("perfect");
      } else if (distance <= HIT_WINDOWS.great) {
        registerHit("great");
      } else {
        registerHit("good");
      }
    },
    [countdown, registerHit]
  );

  const pressLane = useCallback(
    (lane) => {
      if (pressedLanesRef.current.has(lane)) return;

      pressedLanesRef.current.add(lane);
      hitLane(lane);
      drawCanvas();
    },
    [drawCanvas, hitLane]
  );

  const releaseLane = useCallback(
    (lane) => {
      pressedLanesRef.current.delete(lane);
      drawCanvas();
    },
    [drawCanvas]
  );

  useEffect(() => {
    const keyboardMap = {
      d: 0,
      f: 1,
      j: 2,
      k: 3,
    };

    function handleKeyDown(event) {
      const lane = keyboardMap[event.key.toLowerCase()];
      if (lane === undefined) return;

      event.preventDefault();
      pressLane(lane);
    }

    function handleKeyUp(event) {
      const lane = keyboardMap[event.key.toLowerCase()];
      if (lane === undefined) return;

      event.preventDefault();
      releaseLane(lane);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressLane, releaseLane]);

  const startEngine = useCallback(
  async (song, scheduledStart) => {
    stopEngine();

    finishedRef.current = false;
    startedRef.current = true;
    pausedRef.current = false;
    statsRef.current = emptyStats();

    setGameStats(emptyStats());
    setRemaining(song.duration);
    setPaused(false);
    setMessage("");

const engineDifficulty =
  mode === "solo"
    ? selectedDifficulty
    : room?.difficulty || selectedDifficulty;

let generatedBeatmap;

try {
  generatedBeatmap = await prewarmBeatmap(
    song,
    engineDifficulty
  );
} catch (error) {
      console.error(error);
      startedRef.current = false;
      setMessage("The automatic beatmap could not be created.");
      return;
    }

    chartRef.current = generatedBeatmap.notes;
    visibleNotesRef.current = [];
    nextNoteIndexRef.current = 0;
    pressedLanesRef.current.clear();

    const audio = new Audio(song.audio);
    audio.preload = "auto";
    audio.volume = 0.88;
    audioRef.current = audio;

    setRemaining(
      generatedBeatmap.duration || song.duration
    );

    setMessage("");

    const wait = Math.max(
      0,
      scheduledStart - Date.now()
    );

    [3, 2, 1].forEach((number, index) => {
      countdownTimersRef.current.push(
        window.setTimeout(
          () => setCountdown(number),
          wait + index * 800
        )
      );
    });

    countdownTimersRef.current.push(
      window.setTimeout(async () => {
        setCountdown(null);

        try {
          await audio.play();
        } catch (error) {
          console.error(error);
          startedRef.current = false;
          setMessage(
            "The song could not start. Check the MP3 path."
          );
          return;
        }

        function frame() {
          if (
            !audioRef.current ||
            finishedRef.current ||
            pausedRef.current
          ) {
            return;
          }

          const currentMs =
            audioRef.current.currentTime * 1000;

          while (
            nextNoteIndexRef.current <
              chartRef.current.length &&
            chartRef.current[
              nextNoteIndexRef.current
            ].time <=
              currentMs + APPROACH_MS
          ) {
            visibleNotesRef.current.push({
              ...chartRef.current[
                nextNoteIndexRef.current
              ],
              judged: false,
            });

            nextNoteIndexRef.current += 1;
          }

          visibleNotesRef.current.forEach((note) => {
            if (
              !note.judged &&
              currentMs - note.time >
                HIT_WINDOWS.miss
            ) {
              note.judged = true;
              registerMiss();
            }
          });

          visibleNotesRef.current =
            visibleNotesRef.current.filter(
              (note) =>
                !note.judged ||
                currentMs - note.time <
                  HIT_WINDOWS.miss + 90
            );

          const duration =
            audioRef.current.duration ||
            generatedBeatmap.duration ||
            song.duration;

          setRemaining(
            Math.max(
              0,
              duration -
                audioRef.current.currentTime
            )
          );

          publishLiveScore().catch(console.warn);
          drawCanvas();

          if (
            audioRef.current.ended ||
            currentMs >= duration * 1000 ||
            (nextNoteIndexRef.current >=
              chartRef.current.length &&
              visibleNotesRef.current.every(
                (note) => note.judged
              ))
          ) {
            finishGame();
            return;
          }

          animationFrameRef.current =
            window.requestAnimationFrame(frame);
        }

        frameLoopRef.current = frame;
        animationFrameRef.current =
          window.requestAnimationFrame(frame);
      }, wait + 2400)
    );
  },
  [
    drawCanvas,
    finishGame,
    mode,
    publishLiveScore,
    registerMiss,
    room?.difficulty,
    selectedDifficulty,
    stopEngine,
  ]
);

  useEffect(() => {
    if (screen !== "game" || startedRef.current) return;

    if (mode === "solo") {
      startEngine(selectedSong, Date.now() + 150);
      return;
    }

    if (room?.startAt) {
      startEngine(roomSong, room.startAt);
    }
  }, [
    mode,
    room?.startAt,
    roomSong,
    screen,
    selectedSong,
    startEngine,
  ]);

  const startSolo = useCallback(() => {
    setMode("solo");
    setMessage("");
    setScreen("soloHome");
  }, []);

  const openOnlineMode = useCallback((roomMode) => {
    setMode(roomMode);
    setMessage("");
    setRoomCodeInput("");
    setScreen(`${roomMode}Home`);
  }, []);

const selectedSongIndex = useMemo(() => {
  const index = SONGS.findIndex(
    (song) => song.id === selectedSongId
  );

  return index >= 0 ? index : 0;
}, [selectedSongId]);

const visibleCarouselSongs = useMemo(() => {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const index =
      (selectedSongIndex + offset + SONGS.length) %
      SONGS.length;

    return {
      song: SONGS[index],
      offset,
    };
  });
}, [selectedSongIndex]);

const moveSongCarousel = useCallback(
  (direction) => {
    const nextIndex =
      (selectedSongIndex + direction + SONGS.length) %
      SONGS.length;

    setSelectedSongId(SONGS[nextIndex].id);
  },
  [selectedSongIndex]
);

const chooseRandomSong = useCallback(() => {
  if (SONGS.length <= 1) return;

  let randomIndex = selectedSongIndex;

  while (randomIndex === selectedSongIndex) {
    randomIndex = Math.floor(Math.random() * SONGS.length);
  }

  setSelectedSongId(SONGS[randomIndex].id);
}, [selectedSongIndex]);

  const beginSoloSong = useCallback(() => {
    setScreen("difficulty");
  }, []);

  const confirmSoloDifficulty = useCallback(async () => {
  if (beatmapLoading) return;

  setBeatmapLoading(true);
  setMessage("Analyzing song and creating beatmap...");

  try {
    await prewarmBeatmap(
      selectedSong,
      selectedDifficulty
    );

    startedRef.current = false;
    setMessage("");
    setScreen("game");
  } catch (error) {
    console.error(error);
    setMessage("Could not prepare the automatic beatmap.");
  } finally {
    setBeatmapLoading(false);
  }
}, [
  beatmapLoading,
  selectedDifficulty,
  selectedSong,
]);

  const pauseSolo = useCallback(() => {
    if (mode !== "solo" || !audioRef.current) return;

    pausedRef.current = true;
    setPaused(true);
    audioRef.current.pause();
    window.cancelAnimationFrame(animationFrameRef.current);
  }, [mode]);

  const resumeSolo = useCallback(async () => {
    if (mode !== "solo" || !audioRef.current) return;

    pausedRef.current = false;
    setPaused(false);

    try {
      await audioRef.current.play();
      if (frameLoopRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(
          frameLoopRef.current
        );
      }
    } catch {
      setMessage("The song could not resume.");
    }
  }, [mode]);

  const returnFromResults = useCallback(async () => {
    stopEngine();

    if (mode === "solo") {
      setScreen("soloHome");
      return;
    }

    if (roomId && isHost) {
      await updateDoc(doc(db, "momoBeatRooms", roomId), {
        status: "lobby",
        startAt: null,
      });
    }

    setScreen("lobby");
  }, [isHost, mode, roomId, stopEngine]);

  const liveRanking = useMemo(() => {
    if (mode === "solo") {
      return [
        {
          uid: currentUser.uid,
          name: currentUser.name,
          score: gameStats.score,
        },
      ];
    }

    return [...players].sort((a, b) => b.score - a.score);
  }, [currentUser, gameStats.score, mode, players]);

  if (screen === "home") {
  return (
    <section className="mba-app mba-new-home-screen">
      <button
        type="button"
        className="mba-new-home-exit"
        onClick={onExit}
        aria-label="Exit Momo Beat Arena"
      >
        ←
      </button>

      <div className="mba-new-home-buttons">
        <button
          type="button"
          className="mba-new-mode-button"
          onClick={() => {
            setMode("solo");
            setScreen("soloHome");
          }}
          aria-label="Open Solo mode"
        >
          <img
            src="/momo-beat/buttons/solo.png"
            alt="Solo"
            draggable="false"
          />
        </button>

        <button
          type="button"
          className="mba-new-mode-button"
          onClick={() => {
            setMode("battle");
            setScreen("battleHome");
          }}
          aria-label="Open Battle mode"
        >
          <img
            src="/momo-beat/buttons/battle.png"
            alt="Battle"
            draggable="false"
          />
        </button>

        <button
          type="button"
          className="mba-new-mode-button"
          onClick={() => {
            setMode("coop");
            setScreen("coopHome");
          }}
          aria-label="Open Co-op mode"
        >
          <img
            src="/momo-beat/buttons/coop.png"
            alt="Co-op"
            draggable="false"
          />
        </button>
      </div>
    </section>
  );
}

 if (screen === "soloHome") {
  return (
    <section className="mba-app mba-new-solo-screen">
      <button
        type="button"
        className="mba-new-solo-back"
        onClick={() => setScreen("home")}
        aria-label="Return to Momo Beat Arena home"
      >
        ←
      </button>

      <button
        type="button"
        className="mba-new-select-song-button"
        onClick={() => {
          setSongSelectionSource("solo");
          setScreen("songs");
        }}
        aria-label="Select a song"
      >
        <img
          src="/momo-beat/buttons/select-song.png"
          alt="Select a Song"
          draggable="false"
        />
      </button>
    </section>
  );
}

  if (screen === "battleHome" || screen === "coopHome") {
  const onlineMode =
    screen === "battleHome" ? "battle" : "coop";

  const isBattle = onlineMode === "battle";

  return (
    <section
      className={`mba-app ${
        isBattle
          ? "mba-new-battle-screen"
          : "mba-new-coop-screen"
      }`}
    >
      <button
        type="button"
        className="mba-new-battle-back"
        onClick={() => setScreen("home")}
        aria-label="Return to Momo Beat Arena home"
      >
        ←
      </button>

      <div className="mba-new-battle-actions">
        <button
          type="button"
          className="mba-new-battle-button"
          onClick={() => createRoom(onlineMode)}
          aria-label={`Create ${onlineMode} room`}
        >
          <img
            src={
              isBattle
                ? "/momo-beat/buttons/create-room.png"
                : "/momo-beat/buttons/create-room-coop.png"
            }
            alt="Create Room"
            draggable="false"
          />
        </button>

        <button
        type="button"
        className="mba-new-battle-button"
        onClick={() => {
            setMode(onlineMode);
            setRoomCodeInput("");
            setMessage("");
            setShowJoinRoomPopup(true);
        }}
        aria-label={`Join ${onlineMode} room`}
        >
        <img
            src="/momo-beat/buttons/join-room.png"
            alt="Join Room"
            draggable="false"
        />
        </button>
      </div>

      
           

      {showJoinRoomPopup && (
        <div
          className="mba-join-popup-backdrop"
          onClick={() => setShowJoinRoomPopup(false)}
        >
          <div
            className="mba-join-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="mba-join-popup-close"
              onClick={() => setShowJoinRoomPopup(false)}
              aria-label="Close join room panel"
            >
              ×
            </button>

            <small>
              {isBattle ? "BATTLE MODE" : "CO-OP MODE"}
            </small>

            <h2>ENTER ROOM CODE</h2>

            <input
              autoFocus
              type="text"
              value={roomCodeInput}
              maxLength={5}
              placeholder="ABCDE"
              onChange={(event) =>
                setRoomCodeInput(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  joinRoom(roomCodeInput);
                }
              }}
            />

            {message && (
              <div className="mba-join-popup-message">
                {message}
              </div>
            )}

            <button
              type="button"
              className="mba-join-popup-submit"
              onClick={() => joinRoom(roomCodeInput)}
            >
              ENTER ROOM
            </button>
          </div>
        </div>
      )}

    </section>



  );
}

  if (screen === "songs") {
  return (
    <section
      className="mba-app mba-carousel-song-screen"
      style={{
        "--mba-selected-cover": `url("${selectedSong.cover}")`,
        "--mba-accent": selectedSong.accent,
      }}
    >
      <div className="mba-carousel-background" />

      <header className="mba-mobile-header mba-carousel-header">
        <button
          type="button"
          className="mba-round-button"
          onClick={() => setScreen("soloHome")}
          aria-label="Back to Solo"
        >
          ←
        </button>

        <div>
          <small>SOLO PLAY</small>
          <strong>SELECT SONG</strong>
        </div>

        <span className="mba-song-position">
          {selectedSongIndex + 1}/{SONGS.length}
        </span>
      </header>

      <main className="mba-carousel-content">
        <section
  className="mba-song-carousel-area"
  onTouchStart={(event) => {
    songSwipeStartXRef.current =
      event.touches[0]?.clientX ?? null;
  }}
  onTouchEnd={(event) => {
    if (songSwipeStartXRef.current === null) return;

    const endX =
      event.changedTouches[0]?.clientX ??
      songSwipeStartXRef.current;

    const swipeDistance =
      endX - songSwipeStartXRef.current;

    songSwipeStartXRef.current = null;

    if (Math.abs(swipeDistance) < 45) return;

    if (swipeDistance < 0) {
      moveSongCarousel(1);
    } else {
      moveSongCarousel(-1);
    }
  }}
>
          <button
            type="button"
            className="mba-carousel-arrow mba-carousel-arrow-left"
            onClick={() => moveSongCarousel(-1)}
            aria-label="Previous song"
          >
            ‹
          </button>

          <div className="mba-seven-carousel">
            {visibleCarouselSongs.map(({ song, offset }) => (
              <button
                type="button"
                key={`${song.id}-${offset}`}
                className={`mba-carousel-song-card mba-carousel-offset-${offset} ${
                  offset === 0 ? "selected" : ""
                }`}
                onClick={() => {
                  if (offset === 0) return;

                  setSelectedSongId(song.id);
                }}
                aria-label={`Select ${song.title}`}
              >
                <img
                  src={song.cover}
                  alt={song.title}
                  draggable="false"
                />

                <div className="mba-carousel-cover-shade" />

                <div className="mba-carousel-song-label">
                  <span>{song.title}</span>
                  <small>{song.difficulty}</small>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mba-carousel-arrow mba-carousel-arrow-right"
            onClick={() => moveSongCarousel(1)}
            aria-label="Next song"
          >
            ›
          </button>
        </section>

        <section className="mba-now-selected-panel">
          <div className="mba-now-selected-heading">
            <small>NOW SELECTED</small>
            <h1>{selectedSong.title}</h1>
            <p>{selectedSong.artist || "Momo Beat Arena"}</p>
          </div>

          <div className="mba-now-selected-meta">
            <span>{selectedSong.difficulty}</span>
            <span>{selectedSong.bpm} BPM</span>
            <span>{formatTime(selectedSong.duration)}</span>
            <span>4 LANES</span>
          </div>
        </section>
      </main>

      <footer className="mba-carousel-actions">
        <button
          type="button"
          className="mba-carousel-random"
          onClick={chooseRandomSong}
        >
          RANDOM
        </button>

       <button
        type="button"
        className="mba-carousel-start"
        onClick={async () => {
           if (songSelectionSource === "online") {
            await voteSong(selectedSongId);
            setScreen("difficulty");
            return;
            }

            beginSoloSong();
        }}
        >
        CHOOSE SONG
        </button>
      </footer>
    </section>
  );
}

  if (screen === "difficulty") {
    const difficulties = [
      { id: "EASY", label: "EASY", detail: "Relaxed timing and lighter patterns" },
      { id: "NORMAL", label: "NORMAL", detail: "The complete standard chart" },
      { id: "HARD", label: "HARD", detail: "Faster patterns and more chords" },
      { id: "EXPERT", label: "EXPERT", detail: "Maximum speed and density" },
    ];

    return (
      <section className="mba-app mba-difficulty-screen" style={{ "--mba-selected-cover": `url("${selectedSong.cover}")`, "--mba-accent": selectedSong.accent }}>
        <div className="mba-song-blur" />
        <header className="mba-mobile-header">
          <button type="button" className="mba-round-button" onClick={() => setScreen("songs")}>←</button>
          <div><small>{selectedSong.title}</small><strong>DIFFICULTY</strong></div>
        </header>
        <main className="mba-difficulty-content">
          <img className="mba-difficulty-cover" src={selectedSong.cover} alt={selectedSong.title} />
          <div className="mba-difficulty-list">
            {difficulties.map((difficulty) => (
              <button key={difficulty.id} type="button" className={selectedDifficulty === difficulty.id ? "mba-difficulty-card selected" : "mba-difficulty-card"} onClick={() => setSelectedDifficulty(difficulty.id)}>
                <span>{difficulty.label}</span><small>{difficulty.detail}</small>
              </button>
            ))}
          </div>
        </main>
       <div className="mba-song-bottom-bar">
  <button
    type="button"
    onClick={async () => {
    if (songSelectionSource === "online") {
        await voteDifficulty(selectedDifficulty);
        setScreen("lobby");
        return;
    }

    confirmSoloDifficulty();
    }}
    disabled={beatmapLoading}
  >
    {beatmapLoading
    ? "CREATING BEATMAP..."
    : songSelectionSource === "online"
        ? `CHOOSE ${selectedDifficulty}`
        : `START ${selectedDifficulty}`}
  </button>
</div>
      </section>
    );
  }

  if (screen === "lobby") {
  const orderedLobbyPlayers = [
  ...players.filter(
    (player) => player.uid === room?.hostUid
  ),
  ...players.filter(
    (player) => player.uid !== room?.hostUid
  ),
];

const lobbySlots = Array.from(
  { length: MAX_PLAYERS },
  (_, index) => orderedLobbyPlayers[index] || null
);

  const votedSong =
  SONGS.find(
    (song) =>
      song.id ===
      (room?.songId || selectedSongId)
  ) || SONGS[0];

  const difficultyOptions = [
    "EASY",
    "NORMAL",
    "HARD",
    "EXPERT",
  ];

  function moveLobbySong(direction) {
    const currentIndex = SONGS.findIndex(
      (song) => song.id === votedSong.id
    );

    const nextIndex =
      (currentIndex + direction + SONGS.length) %
      SONGS.length;

    voteSong(SONGS[nextIndex].id);
  }

  function moveLobbyDifficulty(direction) {
    const currentDifficulty =
      currentRoomPlayer?.voteDifficulty ||
      selectedDifficulty ||
      "NORMAL";

    const currentIndex =
      difficultyOptions.indexOf(currentDifficulty);

    const nextIndex =
      (currentIndex +
        direction +
        difficultyOptions.length) %
      difficultyOptions.length;

    voteDifficulty(difficultyOptions[nextIndex]);
  }

  return (
    <section
      className={`mba-app mba-o2-lobby ${
        mode === "coop"
          ? "mba-o2-lobby-coop"
          : "mba-o2-lobby-battle"
      }`}
    >
      <header className="mba-o2-topbar">
        <button
          type="button"
          className="mba-o2-back"
          onClick={leaveRoom}
          aria-label="Leave room"
        >
          ←
        </button>

        <div className="mba-o2-title">
          <span className="mba-o2-mode-icon">
            {mode === "battle" ? "⚔" : "✦"}
          </span>

          <div>
            <strong>
              {mode === "battle"
                ? "BATTLE ROOM"
                : "CO-OP ROOM"}
            </strong>

            <small>
              {mode === "battle"
                ? "HIGHEST SCORE WINS"
                : "COMBINE YOUR SCORES"}
            </small>
          </div>
        </div>

        <div className="mba-o2-capacity">
          <span>♟</span>
          <strong>
            {players.length}/{MAX_PLAYERS}
          </strong>
        </div>
      </header>

      <main className="mba-o2-scroll">
        <section className="mba-o2-room-row">
          <button
            type="button"
            className="mba-o2-side-action"
            onClick={loadFriends}
          >
            <span>♟+</span>
            <strong>INVITE</strong>
            <small>FRIENDS</small>
          </button>

          <button
            type="button"
            className={`mba-o2-room-code ${
              roomCodeCopied ? "copied" : ""
            }`}
            onClick={copyRoomCode}
          >
            <small>ROOM CODE</small>

            <strong>{roomId}</strong>

            <span>
              {roomCodeCopied
                ? "COPIED ✓"
                : "TAP TO COPY ▢"}
            </span>
          </button>

          <button
            type="button"
            className="mba-o2-side-action"
            onClick={leaveRoom}
          >
            <span>↪</span>
            <strong>LEAVE</strong>
            <small>ROOM</small>
          </button>
        </section>

        <section className="mba-o2-player-grid">
          {lobbySlots.map((player, index) => {
            const occupied = Boolean(player);
            const playerIsHost =
              player?.uid === room?.hostUid;
            const playerIsMe =
              player?.uid === currentUser.uid;

            return (
              <article
                key={player?.uid || `empty-${index}`}
                className={`mba-o2-player-slot ${
                  occupied ? "occupied" : "empty"
                } ${
                  playerIsMe ? "me" : ""
                } ${
                  player?.ready ? "is-ready" : ""
                }`}
              >
                <span className="mba-o2-slot-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {playerIsHost && (
                  <div className="mba-o2-host-mark">
                    <span>♛</span>
                    <small>HOST</small>
                  </div>
                )}

                {occupied ? (
                  <>
                    <div className="mba-o2-avatar-ring">
                      <img
                        src={player.avatar}
                        alt={player.name}
                      />
                    </div>

                    <strong className="mba-o2-player-name">
                      {player.name}
                    </strong>

                    <span
                      className={`mba-o2-player-status ${
                        player.ready
                          ? "ready"
                          : "waiting"
                      }`}
                    >
                      {player.ready
                        ? "✓ READY"
                        : "WAITING"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="mba-o2-empty-avatar">
                      <span>●</span>
                    </div>

                    <strong className="mba-o2-empty-label">
                      WAITING FOR PLAYER
                    </strong>

                    <span className="mba-o2-player-status waiting">
                      WAITING
                    </span>
                  </>
                )}
              </article>
            );
          })}
        </section>

       <section className="mba-o2-song-panel">
    <div className="mba-o2-panel-header">
        <small>NOW PLAYING</small>
        <strong>SELECTED SONG</strong>
    </div>

    <div className="mba-o2-song-body">
        <div className="mba-o2-cover-glow">
        <img
            src={votedSong.cover}
            alt={votedSong.title}
            className="mba-o2-song-cover"
        />
        </div>

        <div className="mba-o2-song-details">
        <h2>{votedSong.title}</h2>

        <p>
            {votedSong.artist || "Momo Beat Arena"}
        </p>

        <div className="mba-o2-song-tags">
            <span className="tag-difficulty">
            {currentRoomPlayer?.voteDifficulty ||
                selectedDifficulty ||
                "NORMAL"}
            </span>

            <span className="tag-bpm">
            {votedSong.bpm} BPM
            </span>

            <span className="tag-length">
            {formatTime(votedSong.duration)}
            </span>
        </div>

        <div className="mba-o2-waveform">
            {Array.from({ length: 34 }).map((_, index) => (
            <i
                key={index}
                style={{
                animationDelay: `${index * 0.04}s`,
                height: `${22 + ((index * 13) % 68)}%`,
                }}
            />
            ))}
        </div>
        </div>

{isHost && (
        <button
            type="button"
            className="mba-o2-change-song"
            onClick={() => {
                setSongSelectionSource("online");
                setScreen("songs");
            }}
            >
        <span>♫</span>
        <strong>CHANGE SONG</strong>
        <em>›</em>
        </button>
        )}
    </div>

    <div className="mba-o2-setting-row">
        <div className="mba-o2-setting-card">
        <small>SPEED</small>
        <strong>
            {Number(votedSong.speed || 6).toFixed(1)}
        </strong>
        </div>

        <div className="mba-o2-setting-card">
        <small>DIFFICULTY</small>
        <strong className="difficulty">
            {currentRoomPlayer?.voteDifficulty ||
            selectedDifficulty ||
            "NORMAL"}
        </strong>
        </div>

        <div className="mba-o2-setting-card">
        <small>MODE</small>
        <strong className="mode">
            {mode === "battle" ? "BATTLE" : "CO-OP"}
        </strong>
        </div>
    </div>
    </section>


        <section className="mba-o2-bottom-area">
          <div className="mba-o2-room-feed">
            <p>
              <span>
                {currentUser.name}
              </span>{" "}
              has joined the room.
            </p>

            <p>
              Room host is{" "}
              <strong>
                {players.find(
                  (player) =>
                    player.uid === room?.hostUid
                )?.name || "Player"}
              </strong>
              .
            </p>

            <p>Everyone, let&apos;s have fun!</p>

            <p className="waiting">
              {players.length < 2
                ? "Waiting for more players..."
                : "Choose a song and ready up."}
            </p>

                <div
                    className="mba-o2-chat-messages"
                    ref={chatMessagesRef}
                    >
            {chatMessages.slice(-4).map((msg) => (
                <div
                key={msg.id}
                className={`mba-o2-chat-message ${
                    msg.uid === currentUser.uid ? "me" : ""
                }`}
                >
                <strong>{msg.name}</strong>
                <span>{msg.text}</span>
                </div>
            ))}
            </div>

            <div className="mba-o2-chat-input">
            <input
                type="text"
                placeholder="Type a message..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                if (e.key === "Enter") {
                    sendChatMessage();
                }
                }}
            />

            <button
                type="button"
                onClick={sendChatMessage}
            >
                ➤
            </button>
            </div>
          </div>

          <div className="mba-o2-match-actions">
            <button
              type="button"
              className={`mba-o2-ready ${
                currentRoomPlayer?.ready
                  ? "active"
                  : ""
              }`}
              onClick={toggleReady}
            >
              <span>✓</span>

              {currentRoomPlayer?.ready
                ? "READY ✓"
                : "READY UP"}
            </button>

            {isHost ? (
              <button
                type="button"
                className="mba-o2-start"
                onClick={startOnlineMatch}
              >
                START MATCH
              </button>
            ) : (
              <div className="mba-o2-host-wait">
                Waiting for the host to begin.
              </div>
            )}
          </div>
        </section>

        {message && (
          <div className="mba-o2-message">
            {message}
          </div>
        )}
      </main>

      {showInvitePanel && (
        <div
          className="mba-invite-backdrop"
          onClick={() =>
            setShowInvitePanel(false)
          }
        >
          <section
            className="mba-invite-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header className="mba-invite-head">
              <div>
                <small>
                  {mode === "battle"
                    ? "BATTLE ROOM"
                    : "CO-OP ROOM"}{" "}
                  {roomId}
                </small>

                <h2>Invite Friends</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowInvitePanel(false)
                }
              >
                ×
              </button>
            </header>

            {friends.length === 0 ? (
              <div className="mba-empty-invite">
                <strong>
                  No friends found yet.
                </strong>

                <span>
                  Share the room code so they can
                  join manually.
                </span>
              </div>
            ) : (
              <div className="mba-invite-list">
                {friends.map((friend) => {
                  const friendUid =
                    friend.uid || friend.id;

                  const alreadyInRoom =
                    players.some(
                      (player) =>
                        player.uid === friendUid
                    );

                  const sent = Boolean(
                    invitedFriends[friendUid]
                  );

                  return (
                    <article
                      className="mba-invite-row"
                      key={friendUid}
                    >
                      <img
                        src={
                          friend.avatar ||
                          friend.momoImage ||
                          "/momo-beat/ui/default-avatar.png"
                        }
                        alt=""
                      />

                      <div>
                        <strong>
                          {friend.username ||
                            friend.playerName ||
                            friend.name ||
                            "Friend"}
                        </strong>

                        <span>
                          {alreadyInRoom
                            ? "Already in room"
                            : friend.momoType ||
                              "Momo World friend"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={
                          alreadyInRoom || sent
                        }
                        onClick={() =>
                          inviteFriend(friend)
                        }
                      >
                        {alreadyInRoom
                          ? "JOINED"
                          : sent
                          ? "SENT ✓"
                          : "INVITE"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

  if (screen === "game") {
    const song = mode === "solo" ? selectedSong : roomSong;
    const accuracy = accuracyFrom(gameStats);

    return (
      <section
        className="mba-app mba-game-screen"
        style={{
          "--mba-stage-background": `url("${song.background}")`,
        }}
      >
        <div className="mba-stage-shade" />

        <header className="mba-game-topbar">
          <div className="mba-track-mini">
            <strong>{song.title}</strong>
            <span>{formatTime(remaining)}</span>
          </div>

          <div className="mba-main-score">
            <span>SCORE</span>
            <strong>{gameStats.score.toLocaleString()}</strong>
          </div>

          <button
            type="button"
            className="mba-game-menu-button"
            onClick={() => {
                if (mode === "solo") {
                pauseSolo();
                } else {
                setShowForfeitConfirm(true);
                }
            }}
            disabled={hasForfeited}
            >
            {mode === "solo" ? "Ⅱ" : "×"}
            </button>
        </header>

        <div className="mba-own-game-status">
          <span>{mode === "solo" ? "SOLO" : mode === "battle" ? "BATTLE LIVE" : "CO-OP LIVE"}</span>
          <strong>{mode === "solo" ? selectedDifficulty : room?.difficulty || selectedDifficulty}</strong>
          {mode !== "solo" && <em>{players.length} PLAYERS CONNECTED</em>}
        </div>

        <main className="mba-playfield">
          <div className="mba-performance-hud">
            <div className="mba-live-combo">
            <strong
                key={gameStats.combo}
                className={gameStats.combo > 0 ? "pop" : ""}
            >
                {gameStats.combo}
            </strong>

            <span>COMBO</span>
            </div>

            <div className="mba-live-accuracy">
              {accuracy.toFixed(2)}%
            </div>

            {gameStats.lastJudgement && (
              <div
                key={`${gameStats.lastJudgement}-${gameStats.judged}`}
                className={`mba-judgement mba-${gameStats.lastJudgement.toLowerCase()}`}
              >
                {gameStats.lastJudgement}
              </div>
            )}
          </div>

          <div className="mba-highway-shell">
            <canvas
                ref={canvasRef}
                className="mba-highway-canvas"
            />

            <div className="mba-full-lane-touch-layer">
                {LANE_META.map((lane) => (
                <button
                    key={lane.id}
                    type="button"
                    aria-label={`Rhythm lane ${lane.id + 1}`}
                    className={`mba-full-lane-touch mba-full-lane-touch-${lane.id}`}
                    onPointerDown={(event) => {
                    event.preventDefault();

                    event.currentTarget.setPointerCapture?.(
                        event.pointerId
                    );

                    pressLane(lane.id);
                    }}
                    onPointerUp={(event) => {
                    event.preventDefault();

                    event.currentTarget.releasePointerCapture?.(
                        event.pointerId
                    );

                    releaseLane(lane.id);
                    }}
                    onPointerCancel={() => releaseLane(lane.id)}
                    onPointerLeave={(event) => {
                    if (event.buttons === 0) {
                        releaseLane(lane.id);
                    }
                    }}
                    onContextMenu={(event) =>
                    event.preventDefault()
                    }
                />
                ))}
            </div>
            </div>
        </main>

        {countdown !== null && (
          <div className="mba-countdown-overlay">
            <strong>{countdown}</strong>
          </div>
        )}

        {paused && mode === "solo" && (
          <div className="mba-pause-screen">
            <div className="mba-pause-card">
              <small>SOLO PLAY</small>
              <h2>PAUSED</h2>

              <button type="button" onClick={resumeSolo}>
                RESUME
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  stopEngine();
                  setScreen("songs");
                }}
              >
                QUIT SONG
              </button>
            </div>
          </div>
        )}


{showForfeitConfirm &&
  mode !== "solo" &&
  !hasForfeited && (
    <div className="mba-pause-screen">
      <div className="mba-pause-card">
        <small>
          {mode === "battle"
            ? "BATTLE MATCH"
            : "CO-OP MATCH"}
        </small>

        <h2>LEAVE MATCH?</h2>

        <p>
          Your score will be forfeited and the other
          players will continue.
        </p>

        <button
          type="button"
          onClick={() =>
            setShowForfeitConfirm(false)
          }
        >
          KEEP PLAYING
        </button>

        <button
          type="button"
          className="secondary"
          onClick={forfeitOnlineMatch}
        >
          FORFEIT MATCH
        </button>
      </div>
    </div>
  )}

{hasForfeited && mode !== "solo" && (
  <div className="mba-pause-screen">
    <div className="mba-pause-card">
      <small>
        {mode === "battle"
          ? "BATTLE MATCH"
          : "CO-OP MATCH"}
      </small>

      <h2>MATCH FORFEITED</h2>

      <p>
        Waiting for the other players to finish…
      </p>
    </div>
  </div>
)}


        {message && (
          <div className="mba-game-toast">{message}</div>
        )}
      </section>
    );
  }

  return (
    <section className="mba-app mba-results-screen">
      <header className="mba-results-header">
        <span>
          {mode === "solo" ? "SONG COMPLETE" : mode === "coop" ? "CO-OP COMPLETE" : "MATCH COMPLETE"}
        </span>
        <h1>
          {mode === "solo" ? "YOUR RESULT" : mode === "coop" ? "TEAM SCORE" : "FINAL RANKING"}
        </h1>
      </header>

      {mode === "coop" && (
        <div className="mba-coop-total">
          <span>COMBINED SCORE</span>
          <strong>
            {resultRows
              .reduce(
                (total, player) =>
                  total + Number(player.score || 0),
                0
              )
              .toLocaleString()}
          </strong>
        </div>
      )}

      <main className="mba-results-list">
        {resultRows.map((player, index) => {
          const accuracy = Number(
            player.accuracy ?? accuracyFrom(player)
          );

          return (
            <article
              key={player.uid}
              className={
                index === 0
                  ? "mba-result-card winner"
                  : "mba-result-card"
              }
            >
              <div className="mba-result-place">
                {index === 0
                  ? "1ST"
                  : index === 1
                  ? "2ND"
                  : index === 2
                  ? "3RD"
                  : `${index + 1}TH`}
              </div>

              <img src={player.avatar} alt="" />

              <div className="mba-result-player">
                <strong>{player.name}</strong>
                <span>GRADE {gradeFrom(accuracy)}</span>
              </div>

              <div className="mba-result-score">
                <strong>
                  {Number(player.score || 0).toLocaleString()}
                </strong>
                <span>{accuracy.toFixed(2)}%</span>
              </div>

              <div className="mba-result-statline">
                <span>P {player.perfect || 0}</span>
                <span>G {player.great || 0}</span>
                <span>GD {player.good || 0}</span>
                <span>M {player.miss || 0}</span>
                <span>MAX {player.maxCombo || 0}</span>
              </div>
            </article>
          );
        })}
      </main>

      <footer className="mba-results-footer">
        <button
          type="button"
          className="mba-results-primary"
          onClick={returnFromResults}
        >
          {mode === "solo" ? "PLAY ANOTHER SONG" : "PLAY AGAIN"}
        </button>

        <button
          type="button"
          className="mba-results-secondary"
          onClick={
            mode === "solo"
              ? () => setScreen("home")
              : leaveRoom
          }
        >
          {mode === "solo" ? "MODE SELECT" : "LEAVE ROOM"}
        </button>
      </footer>
    </section>
  );
}