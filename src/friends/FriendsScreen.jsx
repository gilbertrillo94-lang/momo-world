import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const CHARACTER_PROFILE_IMAGES = {
  Momo: "/moods/momo/happy.png",
  Bubu: "/moods/bubu/happy.png",
  Kiki: "/moods/kiki/happy.png",
  Lulu: "/moods/lulu/happy.png",
  Riko: "/moods/riko/happy.png",
  Nini: "/moods/nini/happy.png",
};

const CHARACTER_TITLES = {
  Momo: "The Optimist",
  Bubu: "The Comfort Lover",
  Kiki: "The Adventurer",
  Lulu: "The Dreamer",
  Riko: "The Determined One",
  Nini: "The Gentle Soul",
};

export default function FriendsScreen({
  momo,
  displayName,
  bondTitle,
  bondPoints,
  friends,
  onVisitFriend,
  onSendPostcard,
}) {
  const [profile, setProfile] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [foundFriend, setFoundFriend] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  

  useEffect(() => {
    async function loadProfile() {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfile(data);
        setUsernameInput(data.playerName || data.username || displayName || "New Friend");
      }
    }

    loadProfile();
  }, [displayName]);




  async function saveUsername() {
    const user = auth.currentUser;
    if (!user) return;

    const cleanName = usernameInput.trim() || "New Friend";

    setSaving(true);

    await setDoc(
      doc(db, "users", user.uid),
      {
        playerName: cleanName,
username: cleanName,
        lastSeen: Date.now(),
      },
      { merge: true }
    );

    setProfile((prev) => ({
      ...prev,
      username: cleanName,
    }));

    setSaving(false);
  }

  const momoType = profile?.momoType || momo || "Momo";
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : "Today";

    async function copyFriendCode() {
  if (!profile?.friendCode) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(profile.friendCode);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = profile.friendCode;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1400);
  } catch (err) {
    console.error("Copy failed:", err);
    setCopied(false);
  }
}

async function searchFriendCode() {
  const code = friendCodeInput.trim();

  setFoundFriend(null);
  setSearchMessage("");

  if (!code) {
    setSearchMessage("Enter a Friend Code first.");
    return;
  }

  if (!/^MOMO-[A-Z0-9]{4}$/.test(code)) {
    setSearchMessage("Friend Codes must look like MOMO-A7K2.");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("friendCode", "==", code));
  const snap = await getDocs(q);

  if (snap.empty) {
    setSearchMessage("No Momo friend found with that code.");
    return;
  }

  const friendDoc = snap.docs[0];
  const data = friendDoc.data();

  if (friendDoc.id === user.uid) {
    setSearchMessage("That’s your own Friend Code.");
    return;
  }

  setFoundFriend({
    uid: friendDoc.id,
    ...data,
  });
}

async function sendFriendRequest() {
  const user = auth.currentUser;
  if (!user || !foundFriend || !profile) return;

  setSendingRequest(true);

  const requestId = `${user.uid}_${foundFriend.uid}`;

  await setDoc(
    doc(db, "friendRequests", requestId),
    {
      fromUid: user.uid,
      toUid: foundFriend.uid,
      fromUsername: profile.playerName || profile.username || "New Friend",
      fromFriendCode: profile.friendCode,
      fromMomoType: profile.momoType || momo || "Momo",
      toUsername: foundFriend.playerName || foundFriend.username || "New Friend",
      toFriendCode: foundFriend.friendCode,
      status: "pending",
      createdAt: Date.now(),
    },
    { merge: true }
  );

  setSearchMessage("Friend request sent! ✨");
  setSendingRequest(false);
}


  return (
    <div className="friends-panel friends-profile-panel">
      <div className="friends-profile-card">
        <div className="friends-profile-glow" />

        <img
          src={CHARACTER_PROFILE_IMAGES[momoType]}
          alt={momoType}
          className="friends-profile-avatar"
        />

        <p className="tiny-label">My Momo Profile</p>

        <h3>{profile?.playerName || profile?.username || "New Friend"}</h3>

        <button
        className={`friends-code-box ${copied ? "copied" : ""}`}
        onClick={copyFriendCode}
        disabled={!profile?.friendCode}
        >
        <span>{copied ? "Copied!" : "Tap to Copy Friend Code"}</span>
        <strong>{profile?.friendCode || "Loading..."}</strong>
        </button>

        <div className="friends-profile-details">
          <div>
            <span>Companion</span>
            <strong>{momoType}</strong>
            <small>{CHARACTER_TITLES[momoType]}</small>
          </div>

          <div>
            <span>Bond</span>
            <strong>{bondTitle}</strong>
            <small>{bondPoints} points</small>
          </div>

          <div>
            <span>Joined</span>
            <strong>{joinedDate}</strong>
            <small>Momo World</small>
          </div>
        </div>
      </div>

      <div className="friends-edit-card">
        <label>Display Name</label>

        <input
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          placeholder="Your friend name"
          maxLength={18}
        />

        <button className="primary-btn full" onClick={saveUsername}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <div className="friends-add-card">
  <h3>➕ Add Friend</h3>
  <p>Enter their exact Momo Friend Code.</p>

  <input
    value={friendCodeInput}
    onChange={(e) => setFriendCodeInput(e.target.value)}
    placeholder="MOMO-A7K2"
    maxLength={9}
  />

  <button className="primary-btn full" onClick={searchFriendCode}>
    Search
  </button>

  {searchMessage && <p className="friends-search-message">{searchMessage}</p>}

  {foundFriend && (
    <div className="friends-found-card">
      <strong>{foundFriend.playerName || foundFriend.username || "New Friend"}</strong>
      <span>{foundFriend.friendCode}</span>
      <small>{foundFriend.momoType || "Momo"} Companion</small>

      <button onClick={sendFriendRequest} disabled={sendingRequest}>
        {sendingRequest ? "Sending..." : "Send Friend Request"}
      </button>
    </div>
  )}
</div>



<div className="friends-list-card">
  <h3>📖 Friends Book</h3>

  {friends.length === 0 ? (
    <p>No friends yet. Add someone with their Friend Code.</p>
  ) : (
    friends.map((friend) => (
      <div className="friends-list-item" key={friend.id}>
        <img
          src={`/moods/${(friend.momoType || "Momo").toLowerCase()}/happy.png`}
          alt={friend.momoType || "Momo"}
        />

        <div>
          <strong>{friend.playerName || friend.username || "New Friend"}</strong>
          <span>{friend.friendCode}</span>
          <small>{friend.momoType || "Momo"} Companion</small>
        </div>

        <div className="friend-action-buttons">
        <button onClick={() => onVisitFriend(friend)}>
            Visit
        </button>
        </div>
      </div>
    ))
  )}
</div>

      <p className="empty-text">
        Friend requests, visits, messages, and gifts will unlock next.
      </p>
    </div>
  );
}