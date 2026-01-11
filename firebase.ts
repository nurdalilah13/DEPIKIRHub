// firebase/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";


const firebaseConfig = {
  apiKey: "AIzaSyA_tiwpNF3o7SZqVucDBNCees5JparvvuA",
  authDomain: "depikirhub.firebaseapp.com",
  projectId: "depikirhub",
  storageBucket: "depikirhub.firebasestorage.app",
  messagingSenderId: "707936053920",
  appId: "1:707936053920:android:8a78ca2c3f151c7dac77c5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-southeast1");
