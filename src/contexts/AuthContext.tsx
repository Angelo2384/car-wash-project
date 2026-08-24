import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  refreshUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // updateProfile() mutates auth.currentUser in-place without firing onAuthStateChanged.
  // Spreading into a new object forces React to re-render all useAuth() consumers.
  const refreshUser = () => {
    if (auth.currentUser) {
      setCurrentUser({ ...auth.currentUser } as User);
    }
  };

  const value = {
    currentUser,
    loading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
