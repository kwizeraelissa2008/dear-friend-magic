import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type AppRole = "dod" | "dos" | "principal" | "teacher" | "discipline_staff";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: { id: string; full_name: string; email: string } | null;
  userRole: AppRole | null;
  isLoading: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    userRole: null,
    isLoading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({ ...prev, session, user: session?.user ?? null }));
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setState(prev => ({ ...prev, profile: null, userRole: null, isLoading: false }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
    ]);

    setState(prev => ({
      ...prev,
      profile: profileRes.data,
      userRole: (roleRes.data?.role as AppRole) ?? null,
      isLoading: false,
    }));
  };

  const hasRole = (...roles: AppRole[]) => state.userRole !== null && roles.includes(state.userRole);

  return { ...state, hasRole };
};
