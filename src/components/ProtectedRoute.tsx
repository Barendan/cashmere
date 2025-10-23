
import React from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "./Layout";
import { Button } from "./ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface ProtectedRouteProps {
  requiredRole?: "admin" | "employee";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { authState, retryAuth, isAuthenticated, user, error } = useAuth();
  const navigate = useNavigate();

  // Show error state with retry button
  if (authState.status === 'error') {
    console.log("Protected route rendering error state");
    
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{error || "There was a problem with authentication."}</AlertDescription>
          </Alert>
          
          <div className="flex justify-center mb-6">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => {
                console.log("Retry button clicked");
                retryAuth();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button 
              variant="default" 
              className="ml-2"
              onClick={() => navigate("/login")}
            >
              Return to Login
            </Button>
          </div>
          
          {/* Show limited functionality */}
          <div className="opacity-50 pointer-events-none">
            <Outlet />
          </div>
        </div>
      </Layout>
    );
  }

  // Only redirect if definitively unauthenticated, not during brief auth checks
  if (authState.status === 'unauthenticated') {
    console.log("Protected route redirecting to login - user not authenticated");
    return <Navigate to="/login" replace />;
  }

  // During 'authenticating' status, keep the page mounted to preserve form state
  // Only show if we don't have a user yet (initial load scenario)
  if (authState.status === 'authenticating' && !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Verifying session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Check for required role
  if (requiredRole && user?.role !== requiredRole) {
    console.log(`Protected route redirecting to home - user doesn't have required role: ${requiredRole}`);
    // Redirect non-admin users from admin routes to the default page
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has the required role, render the layout with outlet
  console.log("Protected route rendering authorized content");
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
