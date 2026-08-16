# Environment Setup Instructions

This project uses environment variables to securely manage configuration and secrets (like our Firebase API keys) without exposing them on GitHub.

Because these secrets are sensitive, the actual `.env` file is intentionally ignored by Git (via `.gitignore`) and will **not** be included when you clone or pull the repository.

To get the project running locally, you must set up your own `.env` file by following these steps:

## Step 1: Create your local `.env` file
1. In the root of the project, you will find a file named `.env.example`. This file contains the names of all the variables the project needs, but without the actual secret values.
2. Duplicate the `.env.example` file and rename the new copy to **`.env`**.
   * *(Note: Ensure the file is named exactly `.env` with no additional extensions)*

## Step 2: Fill in the secret values
Open your newly created `.env` file. It should look like this:

```env
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
```

Replace the placeholder values (e.g., `your_project_id_here`) with the actual Firebase keys. 

> **Important:** Please contact the project lead/admin directly through a secure channel (like Slack or a password manager) to get the actual values for these keys. **Do not ask for them on GitHub issues or PRs.**

## Step 3: Run the project
Once your `.env` file is saved with the correct values, you can start the development server as usual:

```bash
npm run dev
```

## Troubleshooting
- **"Firebase: No Firebase App..." error:** Double-check that your `.env` file is in the root directory (same level as `package.json`) and that all keys are spelled correctly.
- **Changes not applying:** If you modify the `.env` file while the development server is running, you may need to restart the server (`Ctrl + C`, then `npm run dev` again) for Vite to pick up the changes.
