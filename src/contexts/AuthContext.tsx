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

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum duration to wait for authentication operations
const AUTH_TIMEOUT = 5000; 

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  });

  const createUserFromSession = async (session: Session): Promise<AuthUser | null> => {
    try {
      // Fetch user profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.warn("Error fetching profile:", error.message);
        
        // Create basic user from session if profile not found
        return {
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Unknown User',
          email: session.user.email || '',
          role: 'employee'
        };
      }

      return {
        id: session.user.id,
        name: profile.name || session.user.email?.split('@')[0] || 'Unknown User',
        email: profile.email || session.user.email || '',
        role: profile.role as UserRole || 'employee',
      };
    } catch (err) {
      console.error("Failed to create user from session:", err);
      return null;
    }
  };

  // Set up auth state listeners
  useEffect(() => {
    // Keep track of mounted state to prevent state updates after unmount
    let isMounted = true;
    
    // Set up authentication timeout
    const authTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Authentication timed out, resetting loading state");
        setAuthState(state => ({
          ...state,
          isLoading: false,
          error: "Authentication timed out. Please try again."
        }));
      }
    }, AUTH_TIMEOUT);

    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change event:", event);

        if (!isMounted) return;

        try {
          if (session) {
            console.log("Auth state change - user authenticated:", session.user.id);
            
            // Update state immediately to reflect authentication
            setAuthState(state => ({
              ...state,
              session,
              isLoading: true,
              error: null
            }));
            
            // Then fetch the user profile
            const user = await createUserFromSession(session);
            
            if (isMounted) {
              setAuthState(state => ({
                ...state, 
                user,
                isLoading: false
              }));
            }
          } else {
            console.log("Auth state change - user not authenticated");
            
            if (isMounted) {
              setAuthState({
                user: null,
                session: null,
                isLoading: false,
                error: null
              });
            }
          }
        } catch (err) {
          console.error("Error processing auth state change:", err);
          
          if (isMounted) {
            setAuthState(state => ({
              ...state,
              isLoading: false,
              error: "Authentication error. Please try again."
            }));
          }
        }
      }
    );

    // THEN check for existing session
    const checkExistingSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (data.session) {
          console.log("Existing session found");
          
          // Update state immediately to reflect authentication
          setAuthState(state => ({
            ...state,
            session: data.session,
            isLoading: true,
            error: null
          }));
          
          // Then fetch the user profile
          const user = await createUserFromSession(data.session);
          
          if (isMounted) {
            setAuthState(state => ({
              ...state,
              user,
              isLoading: false
            }));
          }
        } else {
          console.log("No existing session found");
          
          if (isMounted) {
            setAuthState(state => ({
              ...state,
              isLoading: false
            }));
          }
        }
      } catch (err) {
        console.error("Error checking existing session:", err);
        
        if (isMounted) {
          setAuthState(state => ({
            ...state,
            isLoading: false,
            error: "Failed to check authentication status"
          }));
        }
      }
    };

    // Call the function to check existing session
    checkExistingSession();

    // Clean up
    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState(state => ({
        ...state,
        isLoading: true,
        error: null
      }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Auth state listener will handle the successful login
      // Don't set loading to false here - let the auth state listener do it
      
      toast.success("Successfully logged in!");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Ensure loading state is reset
      setAuthState(state => ({
        ...state,
        isLoading: false,
        error: error.message || "Failed to log in"
      }));
      
      toast.error(error.message || "Failed to log in");
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthState(state => ({
        ...state,
        isLoading: true,
        error: null
      }));

      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Auth state listener will handle setting user to null
      // Don't set auth state here - let the auth state listener do it
      
      toast.info("You have been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      
      setAuthState(state => ({
        ...state,
        isLoading: false,
        error: error.message || "Failed to log out"
      }));
      
      toast.error("Error signing out");
      throw error;
    }
  };

  const { user, isLoading, error } = authState;

  const value = {
    ...authState,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-spa-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spa-sage"></div>
          <p className="text-spa-deep">Loading...</p>
        </div>
      </div>
    );
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
