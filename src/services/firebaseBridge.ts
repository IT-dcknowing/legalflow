/**
 * Pont Firebase Auth → session Supabase (identité Firebase, données Supabase).
 * Firebase : email/mot de passe + Google. Supabase : RLS, profils, journal.
 * Le RLS et tout le reste de l'app restent inchangés (session Supabase Queen).
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebase';
import { supabase } from './supabaseClient';

export const NEUTRAL_AUTH_ERROR =
  'Identifiants incorrects. Vérifiez votre saisie ou réinitialisez votre mot de passe.';

function firebaseErrorMessage(code: string, fallback: string): string {
  if (code === 'auth/email-already-in-use') return 'Cet email est déjà utilisé.';
  if (code === 'auth/weak-password') return 'Mot de passe trop faible (6 caractères minimum).';
  if (code === 'auth/too-many-requests') return 'Trop de tentatives, réessayez plus tard.';
  if (code === 'auth/popup-closed-by-user') return '';
  if (code === 'auth/unauthorized-domain')
    return 'Domaine non autorisé côté Firebase (ajoutez-le dans la console).';
  if (code === 'auth/operation-not-allowed')
    return 'Fournisseur non activé côté Firebase (console → Authentication).';
  if (code === 'auth/invalid-credential') return fallback;
  if (code === 'auth/user-not-found') return fallback;
  if (code === 'auth/wrong-password') return fallback;
  return fallback;
}

/** Échange un ID token Firebase contre une session Supabase (grant id_token). */
export async function bridgeToSupabase(idToken: string): Promise<string | null> {
  if (!supabase) return 'Backend non configuré.';
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'firebase',
    token: idToken,
  } as any);
  if (error) {
    const msg = error.message || '';
    if (/issuer|provider|allowed/i.test(msg)) {
      return 'Pont Firebase refusé par Supabase (issuer non autorisé : vérifiez la config third-party côté dashboard). Détail : ' + msg;
    }
    return 'Session impossible. Réessayez. Détail : ' + msg;
  }
  return null;
}

async function bridgeCurrentFirebaseUser(): Promise<string | null> {
  const fbUser = firebaseAuth?.currentUser;
  if (!fbUser) return 'Session Firebase introuvable. Réessayez.';
  const idToken = await fbUser.getIdToken();
  return bridgeToSupabase(idToken);
}

export async function firebaseSignIn(email: string, password: string): Promise<string | null> {
  if (!isFirebaseConfigured() || !firebaseAuth) return 'Backend non configuré.';
  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  } catch (err: any) {
    return firebaseErrorMessage(err?.code || '', NEUTRAL_AUTH_ERROR);
  }
  return bridgeCurrentFirebaseUser();
}

export async function firebaseSignUp(email: string, password: string): Promise<{ userId: string | null; error?: string }> {
  if (!isFirebaseConfigured() || !firebaseAuth)
    return { userId: null, error: 'Backend non configuré.' };
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const bridgeErr = await bridgeCurrentFirebaseUser();
    if (bridgeErr) return { userId: cred.user.uid, error: bridgeErr };
    return { userId: cred.user.uid };
  } catch (err: any) {
    return { userId: null, error: firebaseErrorMessage(err?.code || '', 'Inscription impossible. Réessayez.') || 'Inscription impossible. Réessayez.' };
  }
}

export async function firebaseGoogle(): Promise<string | null> {
  if (!isFirebaseConfigured() || !firebaseAuth) return 'Backend non configuré.';
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(firebaseAuth, provider);
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') return null;
    return firebaseErrorMessage(err?.code || '', 'Connexion Google impossible. Réessayez.');
  }
  return bridgeCurrentFirebaseUser();
}

export async function firebasePasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured() || !firebaseAuth) return;
  try {
    await sendPasswordResetEmail(firebaseAuth, email);
  } catch {
    /* neutre dans tous les cas : on ne révèle rien */
  }
}

export async function firebaseSignOut(): Promise<void> {
  try {
    if (firebaseAuth) await fbSignOut(firebaseAuth);
  } catch {
    /* noop */
  }
  try {
    if (supabase) await supabase.auth.signOut();
  } catch {
    /* noop */
  }
}

export function watchFirebaseAuth(cb: (user: FirebaseUser | null) => void): () => void {
  if (!firebaseAuth) return () => undefined;
  return onAuthStateChanged(firebaseAuth, cb);
}
