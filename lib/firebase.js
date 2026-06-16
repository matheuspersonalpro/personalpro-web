'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDV-R3QRvtze918vhZLnER5c_G9yP7dLWA",
  authDomain: "personalpro-1d4bc.firebaseapp.com",
  projectId: "personalpro-1d4bc",
  storageBucket: "personalpro-1d4bc.firebasestorage.app",
  messagingSenderId: "703552257798",
  appId: "1:703552257798:web:a2027c9417ef4fbbaea887",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
