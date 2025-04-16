
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
  const { authState, retryProfileLoad, isAuthenticated, user, error } = useAuth();
  const navigate = useNavigate();

  // Show loading state only for profile loading
  if (authState.status === 'profile-loading') {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spa-sage"></div>
            <p className="text-spa-deep">Loading your profile...</p>
            <p className="text-sm text-muted-foreground">You can continue using basic features while we load your full profile.</p>
          </div>
          <Outlet />
        </div>
      </Layout>
    );
  }

  // Show error state with retry button
  if (authState.status === 'error') {
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
              onClick={() => retryProfileLoad()}
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for required role - only enforce if profile is fully loaded
  if (requiredRole && user?.role !== requiredRole && authState.status === 'profile-loaded') {
    // Redirect non-admin users from admin routes to the default page
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has the required role (or role check is pending), render the layout with outlet
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
