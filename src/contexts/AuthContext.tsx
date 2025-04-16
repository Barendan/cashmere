
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from '@supabase/supabase-js';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "employee";

// Simplified Auth State with fewer transitions
export type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated', session: Session, user: AuthUser }
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
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Single timeout for the entire auth process
const AUTH_TIMEOUT = 8000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });
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

  // Combined function to fetch user and profile data
  const fetchCompleteUserData = async (session: Session): Promise<AuthUser | null> => {
    try {
      // Fetch user profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.warn("Error fetching profile:", error.message);
        throw new Error("Failed to load user profile");
      }

      // Return the complete user data
      return {
        id: session.user.id,
        name: profile.name || session.user.email?.split('@')[0] || 'Unknown User',
        email: profile.email || session.user.email || '',
        role: profile.role as UserRole || 'employee',
      };
    } catch (err) {
      console.error("Failed to fetch complete user data:", err);
      throw err;
    }
  };

  // Retry authentication after an error
  const retryAuth = async () => {
    try {
      setAuthState({ status: 'authenticating' });
      
      // Set timeout for auth process
      setNewTimeout(() => {
        console.warn("Authentication timed out");
        setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
      }, AUTH_TIMEOUT);

      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        const user = await fetchCompleteUserData(data.session);
        
        clearActiveTimeout();
        
        if (user) {
          setAuthState({ 
            status: 'authenticated', 
            session: data.session, 
            user 
          });
          console.log("Authentication successful");
        } else {
          setAuthState({ status: 'error', error: "Failed to load user profile" });
        }
      } else {
        clearActiveTimeout();
        setAuthState({ status: 'unauthenticated' });
      }
    } catch (err: any) {
      clearActiveTimeout();
      console.error("Error during retry authentication:", err);
      setAuthState({ status: 'error', error: err.message || "Authentication failed" });
    }
  };

  // Set up auth state listeners
  useEffect(() => {
    // Keep track of mounted state to prevent state updates after unmount
    let isMounted = true;
    
    // Start with a timeout for authentication
    setNewTimeout(() => {
      if (isMounted) {
        console.warn("Authentication timed out, resetting to error state");
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
            
            // Only update to authenticating if not already authenticated
            if (authState.status !== 'authenticated') {
              setAuthState({ status: 'authenticating' });
            }
            
            // Fetch the complete user data (synchronously within the setState call)
            fetchCompleteUserData(session)
              .then(user => {
                if (isMounted) {
                  clearActiveTimeout();
                  setAuthState({ 
                    status: 'authenticated', 
                    session, 
                    user 
                  });
                }
              })
              .catch(err => {
                if (isMounted) {
                  clearActiveTimeout();
                  setAuthState({ 
                    status: 'error', 
                    error: err.message || "Failed to load user data" 
                  });
                }
              });
          } else {
            console.log("Auth state change - user not authenticated");
            
            clearActiveTimeout();
            
            if (isMounted) {
              setAuthState({ status: 'unauthenticated' });
            }
          }
        } catch (err) {
          console.error("Error processing auth state change:", err);
          
          if (isMounted) {
            clearActiveTimeout();
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
          
          try {
            // Fetch the complete user data
            const user = await fetchCompleteUserData(data.session);
            
            clearActiveTimeout();
            
            if (isMounted) {
              setAuthState({ 
                status: 'authenticated', 
                session: data.session, 
                user 
              });
            }
          } catch (err: any) {
            clearActiveTimeout();
            
            if (isMounted) {
              setAuthState({ 
                status: 'error', 
                error: err.message || "Failed to load user profile" 
              });
            }
          }
        } else {
          console.log("No existing session found");
          
          clearActiveTimeout();
          
          if (isMounted) {
            setAuthState({ status: 'unauthenticated' });
          }
        }
      } catch (err: any) {
        console.error("Error checking existing session:", err);
        
        if (isMounted) {
          clearActiveTimeout();
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
      
      // Set timeout for auth process
      setNewTimeout(() => {
        console.warn("Authentication timed out");
        setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
      }, AUTH_TIMEOUT);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        try {
          // Fetch the complete user data
          const user = await fetchCompleteUserData(data.session);
          
          clearActiveTimeout();
          
          setAuthState({ 
            status: 'authenticated', 
            session: data.session, 
            user 
          });
          
          toast.success("Successfully logged in!");
        } catch (err: any) {
          clearActiveTimeout();
          setAuthState({ status: 'error', error: err.message || "Failed to load user profile" });
          toast.error(err.message || "Failed to load user profile");
          throw err;
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      clearActiveTimeout();
      setAuthState({ status: 'error', error: error.message || "Failed to log in" });
      toast.error(error.message || "Failed to log in");
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set a temporary loading state
      setAuthState({ status: 'authenticating' });

      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      clearActiveTimeout();
      setAuthState({ status: 'unauthenticated' });
      
      toast.info("You have been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      
      clearActiveTimeout();
      setAuthState({ status: 'error', error: error.message || "Failed to log out" });
      toast.error("Error signing out");
      throw error;
    }
  };

  // Derive simplified states from the auth state machine
  const isAuthenticated = authState.status === 'authenticated';
  const isLoading = authState.status === 'authenticating';
  const error = authState.status === 'error' ? authState.error : null;
  const session = isAuthenticated ? authState.session : null;
  const user = isAuthenticated ? authState.user : null;
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
    retryAuth
  };

  // Show a minimalist loading screen only during authentication
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
