import { ReactNode, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Suspense
      fallback={
        fallback || (
          <div className="min-h-screen w-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
