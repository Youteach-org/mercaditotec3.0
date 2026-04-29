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
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      const unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setAppUser(snap.data() as AppUser);
          } else {
            setAppUser(null);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

      return () => unsubDoc();
    });

    return () => unsubAuth();
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

