import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <-- NUEVO

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app;
let db;
let auth; // <-- NUEVO

if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } else {
    app = getApp();
    db = getFirestore(app);
  }
  auth = getAuth(app); // <-- NUEVO
}

export { db, auth }; // <-- Exportamos auth también