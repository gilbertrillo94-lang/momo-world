import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdpNfzpfWJIlFX6l5TbfIIMKhb9H42sas",
  authDomain: "momo-world.firebaseapp.com",
  projectId: "momo-world",
  storageBucket: "momo-world.firebasestorage.app",
  messagingSenderId: "836774921333",
  appId: "1:836774921333:web:ad7cfbe2bc8108153c243c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);