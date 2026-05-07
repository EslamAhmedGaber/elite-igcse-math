# Firebase Activation - Short Version

Only use the free **Spark** plan. Do not enable SMS login. Do not upgrade to Blaze.

## You Do These Clicks

1. Open https://console.firebase.google.com
2. Add project: `elite-igcse-progress`
3. Keep it free Spark plan.
4. Add Web App, nickname: `Elite IGCSE Website`
5. Copy the `firebaseConfig`.
6. Enable Authentication -> Google.
7. Authentication -> Settings -> Authorized domains:
   - `eliteigcse.com`
   - `www.eliteigcse.com`
   - `eslamahmedgaber.github.io`
   - `localhost`
8. Create Firestore Database in production mode.
9. Firestore Rules: paste the contents of `docs/firestore.rules`.

## Then Send Me This

Send me only the Firebase web config block that looks like this:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Then I will paste it into `firebase-config.js`, activate `enabled: true`, push, and test login.

## Where You See Student Data Later

Firebase Console -> Firestore Database -> `student_progress`

Each document is one student, named by their Google user ID.
