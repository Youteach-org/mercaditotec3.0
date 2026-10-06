"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { StudentTrustStatus } from "@/lib/security/domain";

export type AppUser = {
  role?: "admin" | "administrator" | "superadmin" | "subadmin" | "user";
  email?: string;
  emailLocalPart?: string;
  emailVerified?: boolean;
  plan?: "free" | "premium";
  isActive?: boolean;
  blocked?: boolean;
  blockedUntil?: number | string | { toDate?: () => Date } | null;
  blockedReason?: string | null;
  blockedBy?: string | null;
  displayName?: string;
  nickname?: string;
  nicknameNormalized?: string;
  photoURL?: string;
  createdAt?: number;
  studentStatus?: StudentTrustStatus;
  studentEndorsementCount?: number;
  studentVerifiedAt?: number | null;
  studentRevokedAt?: number | null;
  unreadNotificationCount?: number;
};

interface SessionValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);
const AUTH_RESOLUTION_TIMEOUT_MS = 4000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubDoc: (() => void) | null = null;

    const resolveUserAndProfile = (user: User | null) => {
      if (!mounted) return;

      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      // Auth can resolve before the Firestore profile that carries role/nickname.
      // Keep the session loading until the profile snapshot resolves so protected
      // pages never evaluate permissions against a temporary null appUser.
      setAppUser(null);
      setLoading(true);

      const userRef = doc(db, "users", user.uid);
      unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (!mounted) return;
          setAppUser(snap.exists() ? (snap.data() as AppUser) : null);
          setLoading(false);
        },
        () => {
          if (!mounted) return;
          setAppUser(null);
          setLoading(false);
        },
      );
    };

    const timeoutId = window.setTimeout(() => {
      resolveUserAndProfile(auth.currentUser);
    }, AUTH_RESOLUTION_TIMEOUT_MS);

    const unsubAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!mounted) return;
        window.clearTimeout(timeoutId);
        resolveUserAndProfile(user);
      },
      () => {
        if (!mounted) return;
        window.clearTimeout(timeoutId);
        resolveUserAndProfile(null);
      },
    );

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      if (unsubDoc) unsubDoc();
      unsubAuth();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      firebaseUser,
      appUser,
      loading,
      logout,
    }),
    [firebaseUser, appUser, loading, logout],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return session;
}
