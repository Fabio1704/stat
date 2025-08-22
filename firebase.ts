import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAJ6OriRGSqt4UVrqDBYBlsffTmrSBhdcM",
  authDomain: "statistique-3bd12.firebaseapp.com",
  databaseURL: "https://statistique-3bd12-default-rtdb.firebaseio.com",
  projectId: "statistique-3bd12",
  storageBucket: "statistique-3bd12.appspot.com",
  messagingSenderId: "470252021858",
  appId: "1:470252021858:web:8c22035016d8dc287a493b",
  measurementId: "G-0TZ1YHD2XW",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Analytics removed (SSR-safe)
export { app, database };
