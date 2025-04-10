
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, LayoutDashboard, Package, LogOut, BarChart3, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/config/app";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    {
      name: "Sales Log",
      path: "/",
      icon: <Package size={20} />,
      adminOnly: false,
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: <LayoutDashboard size={20} />,
      adminOnly: true,
    },
    {
      name: "Finance",
      path: "/finance",
      icon: <DollarSign size={20} />,
      adminOnly: false,
    },
    {
      name: "Metrics",
      path: "/metrics",
      icon: <BarChart3 size={20} />,
      adminOnly: false,
    },
  ];

  // Filter out admin-only items if the user is not an admin
  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="min-h-screen flex flex-col bg-spa-cream">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Leaf className="h-8 w-8 text-spa-sage mr-2" />
              <h1 className="text-xl font-medium text-spa-deep">{APP_CONFIG.companyName}</h1>
            </div>
            <div className="flex items-center">
              {user && (
                <>
                  <span className="mr-4 text-sm text-spa-deep">
                    <span className="font-medium">{user.name}</span>
                    <span className="ml-1 px-2 py-1 bg-spa-sage/20 text-spa-deep rounded-full text-xs">
                      {user.role}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="text-spa-deep hover:text-destructive"
                  >
                    <LogOut size={18} />
                    <span className="ml-2">Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {user && (
        <nav className="bg-white border-t border-b border-spa-sand">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4">
              {filteredMenuItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "gap-2 rounded-none border-b-2 py-4",
                    isActive(item.path)
                      ? "border-spa-sage text-spa-deep"
                      : "border-transparent text-muted-foreground hover:border-spa-sage/40"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  {item.icon}
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="flex-grow spa-container">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-spa-sand py-4 text-center text-sm text-spa-deep">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {APP_CONFIG.companyName} &copy; {APP_CONFIG.copyrightYear}
        </div>
      </footer>
    </div>
  );
};

export default Layout;
