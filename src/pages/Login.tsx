
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, AlertCircle, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APP_CONFIG } from "@/config/app";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setIsProcessing(true);
    
    try {
      // Validate inputs
      if (!email.trim() || !password.trim() || !name.trim()) {
        setLocalError("All fields are required");
        setIsProcessing(false);
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'employee' // Default role for new users
          }
        }
      });

      if (error) throw error;

      toast.success("Registration successful! Please check your email for confirmation.");
      setLocalError("Please check your email for the confirmation link.");
    } catch (error: any) {
      console.error("Signup error:", error);
      setLocalError(error.message || "Registration failed");
      toast.error(error.message || "Registration failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show retry option if in error state
  const showRetryOption = authState.status === 'error';

  // Determine if button should be disabled
  const isLoginDisabled = isProcessing || authState.status === 'authenticating';
  const isSignupDisabled = isProcessing || authState.status === 'authenticating';

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
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
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
                  </div>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardContent>
                {!showRetryOption && localError && (
                  <Alert variant={localError.includes("check your email") ? "default" : "destructive"} className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{localError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSignUp}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSignupDisabled}
                        className="border-spa-sand focus:border-spa-sage"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your-email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSignupDisabled}
                        className="border-spa-sand focus:border-spa-sage"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Choose a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSignupDisabled}
                        className="border-spa-sand focus:border-spa-sage"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
                      disabled={isSignupDisabled}
                    >
                      {isSignupDisabled ? "Signing Up..." : "Sign Up"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
