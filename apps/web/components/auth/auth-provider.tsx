"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  supabase: SupabaseClient;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const e2eSession = readE2ETestSession();
    if (e2eSession) {
      setSession(e2eSession);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }

      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      supabase,
      user: session?.user ?? null,
    }),
    [isLoading, session, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function readE2ETestSession(): Session | null {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_E2E_AUTH !== "true" ||
    typeof window === "undefined"
  ) {
    return null;
  }

  const rawUser = window.localStorage.getItem("um_nexus_e2e_user");
  if (!rawUser) {
    return null;
  }

  try {
    const storedUser = JSON.parse(rawUser) as { id?: string; email?: string };
    if (!storedUser.id) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const user = {
      id: storedUser.id,
      aud: "authenticated",
      role: "authenticated",
      email: storedUser.email ?? `${storedUser.id}@siswa.um.edu.my`,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(now * 1000).toISOString(),
    } as User;

    return {
      access_token: "e2e-access-token",
      refresh_token: "e2e-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now + 3600,
      user,
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
