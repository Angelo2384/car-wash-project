import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "washwizzy-dev-49122",
  appId: "1:186558950093:web:c3a1341a464a802f4a1784",
  storageBucket: "washwizzy-dev-49122.firebasestorage.app",
  apiKey: "AIzaSyBvH-lIqxoc64EE44044l7XZQ9aSYOa0t0",
  authDomain: "washwizzy-dev-49122.firebaseapp.com",
  messagingSenderId: "186558950093",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
