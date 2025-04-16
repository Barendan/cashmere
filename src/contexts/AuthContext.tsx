
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from '@supabase/supabase-js';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "employee";

// Define a proper auth state type
export type AuthState = 
  | { status: 'idle' }
  | { status: 'authenticating' }
  | { status: 'authenticated', session: Session }
  | { status: 'profile-loading', session: Session }
  | { status: 'profile-loaded', session: Session, user: AuthUser }
  | { status: 'error', error: string };

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  session: Session | null;
  retryProfileLoad: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum duration to wait for initial authentication
const AUTH_TIMEOUT = 10000; 
// Maximum duration to wait for profile loading
const PROFILE_TIMEOUT = 8000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'idle' });
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Clear any active timeout
  const clearActiveTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // Set a new timeout
  const setNewTimeout = (callback: () => void, duration: number) => {
    clearActiveTimeout();
    const id = setTimeout(callback, duration);
    setTimeoutId(id);
  };

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

  // Load user profile data
  const loadUserProfile = async (session: Session) => {
    try {
      setAuthState({ status: 'profile-loading', session });
      
      // Set a timeout for profile loading
      setNewTimeout(() => {
        console.warn("Profile loading timed out, allowing navigation with limited data");
        // Continue with a basic user profile even if full profile loading fails
        const basicUser: AuthUser = {
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Unknown User',
          email: session.user.email || '',
          role: 'employee'
        };
        setAuthState({ status: 'profile-loaded', session, user: basicUser });
      }, PROFILE_TIMEOUT);
      
      const user = await createUserFromSession(session);
      
      // Clear timeout as profile loaded successfully
      clearActiveTimeout();
      
      if (user) {
        setAuthState({ status: 'profile-loaded', session, user });
      } else {
        setAuthState({ status: 'error', error: "Failed to load user profile" });
      }
    } catch (err: any) {
      clearActiveTimeout();
      console.error("Error loading profile:", err);
      setAuthState({ status: 'error', error: err.message || "Failed to load user profile" });
    }
  };

  // Retry loading the profile if it failed
  const retryProfileLoad = async () => {
    if (authState.status === 'error' || authState.status === 'profile-loading') {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        loadUserProfile(data.session);
      } else {
        setAuthState({ status: 'idle' });
      }
    }
  };

  // Set up auth state listeners
  useEffect(() => {
    // Keep track of mounted state to prevent state updates after unmount
    let isMounted = true;
    
    // Start with a timeout for initial authentication
    setNewTimeout(() => {
      if (isMounted) {
        console.warn("Authentication timed out, resetting to idle state");
        setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
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
            
            // Clear the auth timeout
            clearActiveTimeout();
            
            // Update state to authenticated immediately
            setAuthState({ status: 'authenticated', session });
            
            // Then load the user profile asynchronously
            setTimeout(() => {
              if (isMounted) {
                loadUserProfile(session);
              }
            }, 0);
          } else {
            console.log("Auth state change - user not authenticated");
            
            clearActiveTimeout();
            
            if (isMounted) {
              setAuthState({ status: 'idle' });
            }
          }
        } catch (err) {
          console.error("Error processing auth state change:", err);
          
          if (isMounted) {
            setAuthState({ status: 'error', error: "Authentication error. Please try again." });
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
          
          // Clear the auth timeout
          clearActiveTimeout();
          
          // Update state to authenticated immediately
          setAuthState({ status: 'authenticated', session: data.session });
          
          // Then load the user profile asynchronously
          setTimeout(() => {
            if (isMounted) {
              loadUserProfile(data.session!);
            }
          }, 0);
        } else {
          console.log("No existing session found");
          
          clearActiveTimeout();
          
          if (isMounted) {
            setAuthState({ status: 'idle' });
          }
        }
      } catch (err) {
        console.error("Error checking existing session:", err);
        
        if (isMounted) {
          setAuthState({ status: 'error', error: "Failed to check authentication status" });
        }
      }
    };

    // Call the function to check existing session
    checkExistingSession();

    // Clean up
    return () => {
      isMounted = false;
      clearActiveTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState({ status: 'authenticating' });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Auth state listener will handle the successful login
      // Don't set state here - let the auth state listener do it
      
      toast.success("Successfully logged in!");
    } catch (error: any) {
      console.error("Login error:", error);
      
      setAuthState({ status: 'error', error: error.message || "Failed to log in" });
      toast.error(error.message || "Failed to log in");
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set a temporary loading state
      if (authState.status === 'profile-loaded' || authState.status === 'authenticated') {
        setAuthState({ status: 'authenticating' });
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Auth state listener will handle setting user to null
      // Don't set auth state here - let the auth state listener do it
      
      toast.info("You have been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      
      setAuthState({ status: 'error', error: error.message || "Failed to log out" });
      toast.error("Error signing out");
      throw error;
    }
  };

  // Derive simplified states from the auth state machine for backward compatibility
  const isAuthenticated = authState.status === 'authenticated' || 
                           authState.status === 'profile-loading' || 
                           authState.status === 'profile-loaded';
  const isLoading = authState.status === 'authenticating' || authState.status === 'profile-loading';
  const error = authState.status === 'error' ? authState.error : null;
  const session = isAuthenticated ? 
    (authState as { session: Session }).session : null;
  const user = authState.status === 'profile-loaded' ? authState.user : null;
  const isAdmin = user?.role === "admin";

  const value = {
    authState,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isLoading,
    user,
    error,
    session,
    retryProfileLoad
  };

  // Show a minimalist loading screen only for the initial authentication
  if (authState.status === 'authenticating') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-spa-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spa-sage"></div>
          <p className="text-spa-deep">Authenticating...</p>
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
