import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app;
let db;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // Forzamos el Long Polling para saltar el bloqueo del firewall
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} else {
  app = getApp();
  db = getFirestore(app);
}

export { db };