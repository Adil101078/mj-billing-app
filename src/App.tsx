import { lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

// Lazy load pages
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const CreateInvoice = lazy(() => import("@/pages/create-invoice"));
const Invoices = lazy(() => import("@/pages/invoices"));
const Customers = lazy(() => import("@/pages/customers"));
const SettingsPage = lazy(() => import("@/pages/settings"));

function Router() {

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => (
          <ProtectedRoute fallback={<DashboardSkeleton />}>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/create-invoice">
        {() => (
          <ProtectedRoute fallback={<FormSkeleton />}>
            <CreateInvoice />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/invoices">
        {() => (
          <ProtectedRoute fallback={<TableSkeleton />}>
            <Invoices />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/customers">
        {() => (
          <ProtectedRoute fallback={<TableSkeleton />}>
            <Customers />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <ProtectedRoute fallback={<FormSkeleton />}>
            <SettingsPage />
          </ProtectedRoute>
        )}
      </Route>
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // If not authenticated, show login page without sidebar
  if (!isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
