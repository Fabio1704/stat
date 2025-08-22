// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJ6OriRGSqt4UVrqDBYBlsffTmrSBhdcM",
  authDomain: "statistique-3bd12.firebaseapp.com",
  projectId: "statistique-3bd12",
  storageBucket: "statistique-3bd12.firebasestorage.app",
  messagingSenderId: "470252021858",
  appId: "1:470252021858:web:8c22035016d8dc287a493b",
  measurementId: "G-0TZ1YHD2XW"
};

// Initialize Firebase
let app;
let analytics;
let database;

if (typeof window !== 'undefined') {
  // Ces codes ne s'exécuteront que côté client
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  database = getDatabase(app);
}

export { app, analytics, database };