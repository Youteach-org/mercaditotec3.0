import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAkWKoXLU3Xaqy_4prycNsnJiz6YvYGE5M",
  authDomain: "mercadito3-1ff3e.firebaseapp.com",
  projectId: "mercadito3-1ff3e",
  storageBucket: "mercadito3-1ff3e.firebasestorage.app",
  messagingSenderId: "651367375320",
  appId: "1:651367375320:web:fd9ed5150a9c80eaa892ad",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
