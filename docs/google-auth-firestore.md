# Google Authentication & Firestore Integration Guide

This guide outlines the steps to add Google Sign-In to your Firebase project and automatically sync the authenticated user's data into a Firestore database.

## 1. Enable Google Sign-In in Firebase Console

Unlike Email/Password authentication, Google Auth requires a quick manual step in the Firebase Console to configure the OAuth consent screen.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left sidebar, go to **Build** -> **Authentication**.
4. Click on the **Sign-in method** tab.
5. Click **Add new provider** and select **Google**.
6. Toggle the **Enable** switch.
7. Select a **Project support email** from the dropdown (this is required by Google).
8. Click **Save**.

## 2. Initialize Firestore in your App

To store user data, you first need to initialize the Firestore database alongside your Authentication service.

Update your `src/lib/firebase.ts` file to include Firestore:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // <-- Add this

const firebaseConfig = {
  // Your config here...
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // <-- Export the database instance
```

## 3. Implement the Google Sign-In Logic

Create a function in your component that triggers the Google Sign-In popup. Once the user successfully authenticates, use their unique ID (`uid`) to create or update their profile in Firestore.

Here is the complete logic you can attach to a "Sign in with Google" button:

```typescript
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

// Initialize the Google Auth Provider
const googleProvider = new GoogleAuthProvider();

const handleGoogleSignIn = async () => {
  try {
    // 1. Trigger the Google login popup
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // 2. Define a reference to the user's document in Firestore
    // This points to the "users" collection, using the user's unique Firebase ID as the document ID
    const userDocRef = doc(db, "users", user.uid);

    // 3. Check if this user already has a document in our database
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // 4. If they are a new user, create their profile document
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: "customer", // Default role, can be modified later
        createdAt: serverTimestamp(), // Firebase's official server time
        lastLogin: serverTimestamp(),
      });
      console.log("New user profile created in Firestore!");
    } else {
      // Optional: Update their last login time if they already exist
      await setDoc(userDocRef, {
        lastLogin: serverTimestamp()
      }, { merge: true }); // 'merge: true' ensures we don't overwrite their existing data
      
      console.log("Existing user logged in.");
    }

  } catch (error) {
    console.error("Error signing in with Google:", error);
  }
};
```

## 4. Securing your Database (Firestore Rules)

Once Firestore is running, you need to ensure that users can only access their own data. This is done via Firestore Security Rules in the Firebase Console (or via your `firebase.json` if deploying from the CLI).

Basic rules to allow users to read and write only their own profile document:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Match any document in the 'users' collection
    match /users/{userId} {
      // Only allow read/write if the user is logged in AND their auth UID matches the document ID
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
