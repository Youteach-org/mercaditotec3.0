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

export function useSession() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!mounted) return;

        if (unsubDoc) {
          unsubDoc();
          unsubDoc = null;
        }

        setFirebaseUser(user);
        // Auth ya resolvió. El perfil de Firestore se carga por separado y no debe
        // mantener bloqueada toda la interfaz si tarda o falla.
        setLoading(false);

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
        setFirebaseUser(null);
        setAppUser(null);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
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
