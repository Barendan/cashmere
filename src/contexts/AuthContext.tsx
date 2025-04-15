
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from '@supabase/supabase-js';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "employee";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          console.log("Auth state change - user authenticated:", session.user.id);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error("Error fetching user profile:", error);
          }

          if (profile) {
            const authUser: AuthUser = {
              id: session.user.id,
              name: profile.name || 'Unknown User',
              email: profile.email || session.user.email || '',
              role: profile.role as UserRole || 'employee',
            };
            console.log("Setting auth user:", authUser);
            setUser(authUser);
          } else {
            console.warn("No profile found for user:", session.user.id);
            setUser(null);
          }
        } else {
          console.log("Auth state change - user not authenticated");
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("Existing session found, fetching profile");
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error("Error fetching user profile:", error);
            }
            
            if (profile) {
              setUser({
                id: session.user.id,
                name: profile.name || 'Unknown User',
                email: profile.email || session.user.email || '',
                role: profile.role as UserRole || 'employee',
              });
            }
            setLoading(false);
          });
      } else {
        console.log("No existing session found");
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success("Successfully logged in!");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
      throw error;
    }
    setUser(null);
    toast.info("You have been logged out");
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
