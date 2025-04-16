
import React, { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "./Layout";

interface ProtectedRouteProps {
  requiredRole?: "admin" | "employee";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const navigate = useNavigate();

  // Handle authentication errors
  useEffect(() => {
    if (error && !isLoading && !isAuthenticated) {
      console.error("Auth error in protected route:", error);
      navigate("/login");
    }
  }, [error, isLoading, isAuthenticated, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-spa-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spa-sage"></div>
          <p className="text-spa-deep">Verifying access...</p>
        </div>
      </div>
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
