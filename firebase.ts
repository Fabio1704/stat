// firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAJ6OriRGSqt4UVrqDBYBlsffTmrSBhdcM",
  authDomain: "statistique-3bd12.firebaseapp.com",
  databaseURL: "https://statistique-3bd12-default-rtdb.firebaseio.com", // tena ilaina
  projectId: "statistique-3bd12",
  storageBucket: "statistique-3bd12.firebasestorage.app",
  messagingSenderId: "470252021858",
  appId: "1:470252021858:web:8c22035016d8dc287a493b"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { app, database };
