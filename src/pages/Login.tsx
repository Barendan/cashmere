
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, AlertCircle, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_CONFIG } from "@/config/app";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { login, authState, error: authError, retryAuth } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.status === 'authenticated') {
      navigate("/");
    }
  }, [authState, navigate]);

  // Clear local errors when auth state changes
  useEffect(() => {
    // If system is in error state, we'll show the retry UI instead of local errors
    if (authState.status === 'error') {
      setLocalError("");
    }
  }, [authState.status]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setIsProcessing(true);
    
    try {
      // Validate inputs
      if (!email.trim() || !password.trim()) {
        setLocalError("Email and password are required");
        setIsProcessing(false);
        return;
      }
      
      await login(email, password);
      // Navigate is handled by the useEffect
    } catch (error: any) {
      // Show login errors in local state for better UX
      console.error("Login form error:", error);
      setLocalError(error.message || "Failed to log in");
    } finally {
      setIsProcessing(false);
    }
  };

  // Self-registration is intentionally disabled. New accounts must be
  // provisioned by an admin via the Supabase dashboard.


  // Show retry option if in error state
  const showRetryOption = authState.status === 'error';

  // Determine if button should be disabled
  const isLoginDisabled = isProcessing || authState.status === 'authenticating';
  // Signup disabled — no signup-specific state needed.

  return (
    <div className="min-h-screen flex items-center justify-center bg-spa-sand/30">
      <div className="w-full max-w-md p-4">
        <Card className="border-spa-sand shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Leaf className="h-10 w-10 text-spa-sage" />
            </div>
            <CardTitle className="text-2xl text-spa-deep">{APP_CONFIG.companyName}</CardTitle>
            <CardDescription>Inventory Management System</CardDescription>
          </CardHeader>
          
          {showRetryOption && (
            <div className="px-6 pb-4">
              <Alert variant="destructive" className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError || "Authentication system error. Please try again."}</AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                className="w-full gap-2 mt-2" 
                onClick={() => retryAuth()}
              >
                <RefreshCw className="h-4 w-4" />
                Retry Authentication
              </Button>
            </div>
          )}
          
          <CardContent>
            {!showRetryOption && localError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoginDisabled}
                    className="border-spa-sand focus:border-spa-sage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoginDisabled}
                    className="border-spa-sand focus:border-spa-sage"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
                  disabled={isLoginDisabled}
                >
                  {isLoginDisabled ? "Signing In..." : "Sign In"}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Accounts are provisioned by an administrator. Contact your admin if you need access.
                </p>
              </div>
            </form>
          </CardContent>

        </Card>
      </div>
    </div>
  );
};

export default Login;
