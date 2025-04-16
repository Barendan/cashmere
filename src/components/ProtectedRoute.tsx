
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
              onClick={() => retryAuth()}
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

  // Check for required role
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect non-admin users from admin routes to the default page
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has the required role, render the layout with outlet
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
