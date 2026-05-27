/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Build Google Provider with required Google Sheets & Drive scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Memory state cache
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state checker
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
): () => void => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but token was cleared in-memory, we can prompt for sign-in again or keep present state
        // If we don't have cachedAccessToken, we trigger login flow or clear
        if (!isSigningIn) {
          cachedAccessToken = null;
          onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Sign in trigger (invoked from user action)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve OAuth Access Token from sign-in credentials.');
    }

    cachedAccessToken = credential.accessToken;
    // Persist accessToken in local storage temporarily to survive app restarts if user is logged in
    // Note: The workspace skill says:
    // "You MUST implement in-memory caching for the access token. Do NOT store the access token in localStorage or sessionStorage."
    // We will strictly follow this constraint and store ONLY in cachedAccessToken!
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Firebase Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};
