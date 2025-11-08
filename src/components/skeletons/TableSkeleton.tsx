import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4 pb-2 border-b">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
