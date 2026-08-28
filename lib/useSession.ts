"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AppUser = {
  role?: "admin" | "user";
  email?: string;
  emailLocalPart?: string;
  emailVerified?: boolean;
  plan?: "free" | "premium";
  isActive?: boolean;
  blocked?: boolean;
  displayName?: string;
  photoURL?: string;
  createdAt?: number;
};

const AUTH_RESOLUTION_TIMEOUT_MS = 4000;

export function useSession() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubDoc: (() => void) | null = null;

    const finishAuthResolution = (user: User | null) => {
      if (!mounted) return;
      setFirebaseUser(user);
      setLoading(false);
    };

    const timeoutId = window.setTimeout(() => {
      // Nunca mantener la interfaz bloqueada indefinidamente. Si Firebase Auth no
      // emite el estado inicial a tiempo, usamos el usuario que tenga disponible
      // en ese momento y permitimos que el observador lo actualice después.
      finishAuthResolution(auth.currentUser);
    }, AUTH_RESOLUTION_TIMEOUT_MS);

    const unsubAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!mounted) return;
        window.clearTimeout(timeoutId);

        if (unsubDoc) {
          unsubDoc();
          unsubDoc = null;
        }

        finishAuthResolution(user);

        if (!user) {
          setAppUser(null);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        unsubDoc = onSnapshot(
          userRef,
          (snap) => {
            if (!mounted) return;
            setAppUser(snap.exists() ? (snap.data() as AppUser) : null);
          },
          () => {
            if (!mounted) return;
            setAppUser(null);
          },
        );
      },
      () => {
        if (!mounted) return;
        window.clearTimeout(timeoutId);
        setAppUser(null);
        finishAuthResolution(null);
      },
    );

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      if (unsubDoc) unsubDoc();
      unsubAuth();
    };
  }, []);

  async function logout() {
    await signOut(auth);
  }

  return {
    firebaseUser,
    appUser,
    loading,
    logout,
  };
}
