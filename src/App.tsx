
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { CartProvider } from "./contexts/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import SalesLog from "./pages/SalesLog";
import Inventory from "./pages/Inventory";
import Metrics from "./pages/Metrics";
import Finance from "./pages/Finance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<SalesLog />} />
                  <Route path="/finance" element={<Finance />} />
                </Route>
                
                {/* Admin-only routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/metrics" element={<Metrics />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CartProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
