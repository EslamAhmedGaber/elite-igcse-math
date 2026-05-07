# Free Google Login + Cloud Progress Setup

This setup keeps the website on GitHub Pages and adds free cloud progress sync using Firebase.

Use the **Firebase Spark plan** only. Do not upgrade to Blaze unless you deliberately want paid capacity later.

## What Students Get

- Continue with Google
- Progress saved locally first
- Progress synced to cloud after login
- Restore progress on another phone/laptop

## What Dr Eslam Gets

- Access to student progress rows inside the Firebase Console
- Each student is stored in `student_progress/{google_user_id}`
- Data includes name, email, target grade, solved questions, selected questions, mistake box, readiness result, and activity

## Step 1 - Create the Free Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project**
3. Name it something like `elite-igcse-progress`
4. Keep it on the free **Spark** plan
5. Google Analytics is optional; you can disable it

## Step 2 - Add a Web App

1. Open the Firebase project
2. Click the web icon `</>`
3. App nickname: `Elite IGCSE Website`
4. Do not enable hosting; GitHub Pages already hosts the website
5. Copy the `firebaseConfig` values

Paste them into:

```js
// firebase-config.js
window.ELITE_FIREBASE = {
  enabled: true,
  config: {
    apiKey: "PASTE_HERE",
    authDomain: "PASTE_HERE",
    projectId: "PASTE_HERE",
    storageBucket: "PASTE_HERE",
    messagingSenderId: "PASTE_HERE",
    appId: "PASTE_HERE"
  }
};
```

## Step 3 - Enable Google Login

1. Firebase Console -> **Authentication**
2. Click **Get started**
3. Go to **Sign-in method**
4. Enable **Google**
5. Choose your support email
6. Save

## Step 4 - Add Authorized Domains

Firebase Console -> Authentication -> Settings -> Authorized domains

Make sure these exist:

- `eliteigcse.com`
- `www.eliteigcse.com`
- `eslamahmedgaber.github.io`
- `localhost`

## Step 5 - Create Firestore Database

1. Firebase Console -> **Firestore Database**
2. Create database
3. Start in production mode
4. Choose a nearby region

Then set these rules:

```txt
Copy the contents of docs/firestore.rules
```

These rules mean each student can only read/write their own progress.
As the project owner, Dr Eslam can still view all rows from the Firebase Console.

## Step 6 - Deploy

After editing `firebase-config.js`:

```powershell
git add firebase-config.js
git commit -m "Enable Firebase cloud progress"
git push
```

Wait 30-90 seconds, then open:

https://eliteigcse.com/progress.html

The **Continue with Google** button should become active.

## Important Free-Plan Notes

- Google login itself is free.
- Firestore has a free quota that is enough for early student progress tracking.
- Do not enable SMS/phone login; SMS can cost money.
- Do not upgrade to Blaze unless you intentionally want paid capacity.
- If free limits are exceeded, Firebase may block/limit writes instead of billing you on Spark.
