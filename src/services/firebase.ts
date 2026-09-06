/**
 * Firebase — utilisé UNIQUEMENT pour l'hébergement (Hosting) et la console.
 * L'authentification reste Supabase Auth (RLS) : migrer l'auth casserait
 * profiles, journal, RLS et tout le périmètre par niveau.
 * Config via VITE_FIREBASE_* (.env local, jamais commité).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let auth: Auth | null = null;

if (isConfigured && typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  try {
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
  auth = getAuth(app);
}

export const isFirebaseConfigured = (): boolean => app !== null;
export { app as firebaseApp, analytics, auth as firebaseAuth };
