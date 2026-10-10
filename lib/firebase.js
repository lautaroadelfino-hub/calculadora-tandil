import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// storageBucket es opcional: sólo lo usa el panel para subir los archivos de los
// acuerdos (lib/archivos.js). Si la variable falta, Firestore y Auth siguen
// igual y el panel avisa que no puede subir archivos.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
};

let app;
let db;
let auth;

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
  auth = getAuth(app);
}

export { app, db, auth };
