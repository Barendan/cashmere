
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (error) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (type: "admin" | "employee") => {
    setIsLoading(true);
    try {
      if (type === "admin") {
        await login("admin@serenityspa.com", "admin123");
      } else {
        await login("employee@serenityspa.com", "employee123");
      }
      navigate("/");
    } catch (error) {
      setError("Could not login with demo account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-spa-sand/30">
      <div className="w-full max-w-md p-4">
        <Card className="border-spa-sand shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Leaf className="h-10 w-10 text-spa-sage" />
            </div>
            <CardTitle className="text-2xl text-spa-deep">Serenity Spa</CardTitle>
            <CardDescription>Inventory Management System</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
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
                    disabled={isLoading}
                    className="border-spa-sand focus:border-spa-sage"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-spa-sage text-spa-deep hover:bg-spa-deep hover:text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center mb-2">Demo Accounts:</div>
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                className="flex-1 text-xs border-spa-sand"
                onClick={() => handleDemoLogin("admin")}
                disabled={isLoading}
              >
                Admin Demo
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-xs border-spa-sand"
                onClick={() => handleDemoLogin("employee")}
                disabled={isLoading}
              >
                Employee Demo
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
