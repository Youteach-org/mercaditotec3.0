import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  appUser: any;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<any>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setAppUser(null);
      return;
    }

    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setAppUser({ id: snap.id, ...snap.data() });
      } else {
        setAppUser(null);
      }
    });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, appUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
