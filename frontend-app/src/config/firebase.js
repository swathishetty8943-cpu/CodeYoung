import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// These are Firebase's public client-side identifiers (not secrets - it's
// fine for them to end up in the built JS bundle, unlike an API/SMTP key).
// Fill in the blanks from Firebase Console -> Project Settings -> General
// -> "Your apps" -> Web app -> SDK setup and configuration.
//
// Values can also be overridden via frontend-app/.env (VITE_FIREBASE_*),
// which takes priority if set - handy for keeping different values per
// environment without editing this file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'codeyoung-b618a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

// Guard the actual initializeApp() call so importing this module never
// throws before the config is filled in - components can check
// `firebaseConfigured` and render a fallback instead.
export const firebaseApp = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();

// Always show Google's account chooser instead of silently reusing the
// account the browser last picked, so a different Gmail can be used each time.
googleProvider.setCustomParameters({ prompt: 'select_account' });