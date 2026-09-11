import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ask the backend whether the signed-in user is in the admin allow-list
  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setIsAdmin(false);
      return;
    }
    const API = import.meta.env.VITE_API_URL || "";
    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { is_admin: false }))
      .then((d) => setIsAdmin(!!d.is_admin))
      .catch(() => setIsAdmin(false));
  }, [session]);

  const value = {
    session,
    user: session?.user ?? null,
    token: session?.access_token ?? null,
    loading,
    isAdmin,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
