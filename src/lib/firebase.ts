import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env || {};

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'car-wash-demo',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456:web:abcdef',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'car-wash-demo.appspot.com',
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoApiKeyForCarWashProject',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'car-wash-demo.firebaseapp.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
