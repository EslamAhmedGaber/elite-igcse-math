// Free cloud progress setup:
// 1. Create a Firebase project on the free Spark plan.
// 2. Enable Authentication -> Google provider.
// 3. Enable Firestore Database.
// 4. Paste the web app config below and set enabled to true.
//
// This file is safe to publish. Firebase web config identifies the project;
// security comes from Firebase Auth + Firestore rules, not from hiding this file.
window.ELITE_FIREBASE = {
  enabled: false,
  config: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
