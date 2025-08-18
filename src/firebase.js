// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";  // <-- import storage

const firebaseConfig = {
  apiKey: "AIzaSyA8KUZh2lP408UeLQ3jymMlVDiUk_KDr3I",
  authDomain: "grocery-store-app-dd66e.firebaseapp.com",
  projectId: "grocery-store-app-dd66e",
  storageBucket: "grocery-store-app-dd66e.firebasestorage.app",
  messagingSenderId: "970095661126",
  appId: "1:970095661126:web:9392c1a2f63675ec01ba47",
  measurementId: "G-FJEZXCSC4X"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);  // <-- export storage
