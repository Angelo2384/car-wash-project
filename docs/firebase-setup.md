# Firebase Authentication Setup Guide

This guide outlines the steps required to set up Firebase Authentication from scratch for a new web project using the Firebase CLI.

## 1. Prerequisites

- Node.js installed
- A Google account

## 2. Install Firebase CLI & Login

Install the Firebase CLI and log into your Google account:
```bash
npm install -g firebase-tools
firebase login
```
*(Note: If you run into issues on a remote terminal, use `firebase login --no-localhost`)*

## 3. Create a New Firebase Project

Create a globally unique project using the CLI:
```bash
firebase projects:create <your-unique-project-id> --display-name "Your App Name"
```
Wait for the provisioning to finish. Firebase will automatically make it your active project.

## 4. Register a Web App

You need to register a "Web App" inside your Firebase project to get the API keys.
```bash
firebase apps:create WEB "Your App Name Web"
```

After creation, the CLI will output your `appId`. Use it to fetch your config:
```bash
firebase apps:sdkconfig WEB <your-app-id>
```
Copy the JSON config output—you will need it for your frontend code.

## 5. Enable Authentication Providers

You can enable Authentication providers (like Email/Password) directly by deploying a `firebase.json` configuration file, or by visiting the Firebase Console.

**Using CLI:**
Create a `firebase.json` file in your project root:
```json
{
  "auth": {
    "providers": {
      "emailPassword": true
    }
  }
}
```
Deploy the configuration:
```bash
firebase deploy --only auth
```

## 6. Frontend Integration (React)

1. **Install the SDK:**
   ```bash
   npm install firebase
   ```

2. **Initialize Firebase (`src/lib/firebase.ts`):**
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     // Paste the config obtained from step 4 here
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   ```

3. **Use Auth Methods in your Components:**
   Import `auth` and use Firebase methods like `createUserWithEmailAndPassword` or `signInWithEmailAndPassword`.
   ```typescript
   import { auth } from '../../lib/firebase';
   import { createUserWithEmailAndPassword } from 'firebase/auth';

   // Inside a form submit handler
   try {
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     console.log("Registered user:", userCredential.user);
   } catch (error) {
     console.error("Auth error:", error.message);
   }
   ```
