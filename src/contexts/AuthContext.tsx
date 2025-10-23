
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
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

// Single timeout for the entire auth process - increased for more reliability
const AUTH_TIMEOUT = 15000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });
  
  // Set up auth state listeners
  useEffect(() => {
    let isMounted = true;
    console.log("Setting up auth state listeners");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);

        if (!isMounted) return;

        try {
          if (session) {
            console.log("Auth state change - user authenticated:", session.user.id);
            
            // If already authenticated, just silently update the session without re-authenticating
            if (authState.status === 'authenticated') {
              console.log("Already authenticated - silently updating session");
              setAuthState({ 
                status: 'authenticated', 
                session, 
                user: authState.user // Keep existing user data
              });
            } else {
              // Only process full login flow if not already authenticated
              setAuthState({ status: 'authenticating' });
              
              // Use setTimeout to avoid potential Supabase deadlock
              setTimeout(() => {
                processSessionLogin(session, isMounted);
              }, 0);
            }
          } else {
            console.log("Auth state change - user not authenticated");
            
            // Clear any active timeout
            clearAllTimeouts();
            
            if (isMounted) {
              setAuthState({ status: 'unauthenticated' });
            }
          }
        } catch (err) {
          console.error("Error processing auth state change:", err);
          
          if (isMounted) {
            // Clear any active timeout
            clearAllTimeouts();
            
            setAuthState({ status: 'error', error: "Authentication error. Please try again." });
          }
        }
      }
    );

    // THEN check for existing session
    const checkExistingSession = async () => {
      try {
        // Set initial timeout for the complete authentication process
        setAuthTimeout(() => {
          if (isMounted) {
            console.warn("Initial authentication timed out");
            setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
          }
        }, AUTH_TIMEOUT);
        
        const { data } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (data.session) {
          console.log("Existing session found");
          
          // Use setTimeout to avoid potential Supabase deadlock
          setTimeout(() => {
            processSessionLogin(data.session, isMounted);
          }, 0);
        } else {
          console.log("No existing session found");
          
          // Clear timeout when no session found
          clearAllTimeouts();
          
          if (isMounted) {
            setAuthState({ status: 'unauthenticated' });
          }
        }
      } catch (err: any) {
        console.error("Error checking existing session:", err);
        
        if (isMounted) {
          // Clear timeout on error
          clearAllTimeouts();
          
          setAuthState({ status: 'error', error: "Failed to check authentication status" });
        }
      }
    };

    // Call the function to check existing session
    checkExistingSession();

    // Clean up
    return () => {
      isMounted = false;
      clearAllTimeouts();
      subscription.unsubscribe();
    };
  }, []);

  // Handle processing a session login - extracted to reduce duplicate code
  const processSessionLogin = (session: Session, isMounted: boolean) => {
    fetchCompleteUserData(session)
      .then(user => {
        if (isMounted) {
          // Clear any lingering timeouts
          clearAllTimeouts();
          
          setAuthState({ 
            status: 'authenticated', 
            session, 
            user 
          });
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Profile fetch error:", err.message);
          
          // Create a fallback user with basic info from the session
          const fallbackUser: AuthUser = createFallbackUser(session);
          
          // Clear any lingering timeouts
          clearAllTimeouts();
          
          setAuthState({ 
            status: 'authenticated', 
            session, 
            user: fallbackUser
          });
          
          // Notify user about profile issue
          toast.warning("Profile data couldn't be loaded completely. Using basic user information.");
        }
      });
  };

  // Create a fallback user from session data
  const createFallbackUser = (session: Session): AuthUser => {
    return {
      id: session.user.id,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      // Default to employee role for security (least privilege)
      role: (session.user.user_metadata?.role as UserRole) || 'employee'
    };
  };

  // Removed visibility change handler - Supabase handles token refresh automatically
  // No need to re-authenticate when user switches browser tabs

  // Use a ref to track timeouts - prevents stale closure issues
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any active timeout
  const clearAllTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log("Auth timeout cleared");
    }
  };

  // Set a new timeout and track it with the ref
  const setAuthTimeout = (callback: () => void, duration: number) => {
    // Always clear existing timeout first
    clearAllTimeouts();
    
    console.log(`Setting new auth timeout for ${duration}ms`);
    timeoutRef.current = setTimeout(callback, duration);
  };

  // Combined function to fetch user and profile data
  const fetchCompleteUserData = async (session: Session): Promise<AuthUser> => {
    // First, extract basic user info from the session - this will be our fallback
    const basicUserInfo = {
      id: session.user.id,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: (session.user.user_metadata?.role as UserRole) || 'employee'
    };

    try {
      // Try to get the profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching profile:", error.message);
        throw error;
      }

      // If profile exists, use that data, otherwise use basic info
      if (profile) {
        return {
          id: session.user.id,
          name: profile.name || basicUserInfo.name,
          email: profile.email || basicUserInfo.email,
          role: (profile.role as UserRole) || basicUserInfo.role,
        };
      } else {
        console.log("No profile found, using basic user info");
        return basicUserInfo;
      }
    } catch (err) {
      console.error("Failed to fetch complete user data:", err);
      
      // Return the basic info we extracted from the session
      return basicUserInfo;
    }
  };

  // Retry authentication after an error
  const retryAuth = async () => {
    try {
      setAuthState({ status: 'authenticating' });
      
      // Set timeout for auth process - will be cleared on success
      setAuthTimeout(() => {
        console.warn("Authentication retry timed out");
        setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
      }, AUTH_TIMEOUT);

      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        // Use setTimeout to avoid potential deadlock
        setTimeout(() => {
          processSessionLogin(data.session, true);
        }, 0);
      } else {
        clearAllTimeouts();
        setAuthState({ status: 'unauthenticated' });
      }
    } catch (err: any) {
      clearAllTimeouts();
      console.error("Error during retry authentication:", err);
      setAuthState({ status: 'error', error: err.message || "Authentication failed" });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState({ status: 'authenticating' });
      
      // Set timeout for auth process
      setAuthTimeout(() => {
        console.warn("Login timed out");
        setAuthState({ status: 'error', error: "Authentication timed out. Please try again." });
      }, AUTH_TIMEOUT);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        // Use setTimeout to avoid potential deadlock
        setTimeout(() => {
          processSessionLogin(data.session, true);
        }, 0);
        
        toast.success("Successfully logged in!");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Clear timeout on error
      clearAllTimeouts();
      
      setAuthState({ status: 'error', error: error.message || "Failed to log in" });
      toast.error(error.message || "Failed to log in");
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set a temporary loading state
      setAuthState({ status: 'authenticating' });

      // Check if there's a current session before attempting to sign out
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Only attempt to sign out if there's an active session
      if (currentSession) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        console.log("No active session found during logout, setting unauthenticated state directly");
      }
      
      // Clear any active timeout
      clearAllTimeouts();
      
      // Always set to unauthenticated regardless of whether there was an active session
      setAuthState({ status: 'unauthenticated' });
      
      toast.info("You have been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      
      // Clear any active timeout
      clearAllTimeouts();
      
      // Even if there's an error, we should set the state to unauthenticated
      // This ensures users can still log in again
      setAuthState({ status: 'unauthenticated' });
      
      toast.error("Error signing out, but you've been logged out of this application");
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
