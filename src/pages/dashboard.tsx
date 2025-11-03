import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, Users, TrendingUp, Plus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocation } from "wouter";
import { useDashboardStats, useCustomers } from "@/lib/hooks";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: dashboardData, isLoading: statsLoading } = useDashboardStats();
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    limit: 1,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate today's sales from recent invoices
  const todaySales =
    dashboardData?.recentInvoices
      ?.filter((inv: any) => {
        const today = new Date().toISOString().split("T")[0];
        const invDate = new Date(inv.invoiceDate).toISOString().split("T")[0];
        return invDate === today;
      })
      .reduce((sum: number, inv: any) => sum + inv.total, 0) || 0;

  // Process chart data from monthly revenue
  const chartData =
    dashboardData?.monthlyRevenue?.slice(-7).map((item: any) => ({
      date: `${item._id.month}/${item._id.year}`,
      sales: item.revenue,
    })) || [];

  const isLoading = statsLoading || customersLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to M J Jewellers billing system
          </p>
        </div>
        <Button
          onClick={() => setLocation("/create-invoice")}
          data-testid="button-create-invoice"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-today-sales">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-sales">
              {isLoading ? "..." : formatCurrency(todaySales)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue from today's invoices
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-invoices">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-invoices"
            >
              {isLoading ? "..." : dashboardData?.overview?.totalInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All time invoice count
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-customers"
            >
              {isLoading ? "..." : customersData?.pagination?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered customer base
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-unpaid-amount">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-unpaid-amount"
            >
              {isLoading
                ? "..."
                : formatCurrency(dashboardData?.overview?.totalPending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unpaid invoices total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="sales"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading...
                </p>
              ) : !dashboardData?.recentInvoices?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No invoices yet. Create your first invoice to get started.
                </p>
              ) : (
                dashboardData.recentInvoices.map((invoice: any) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                    data-testid={`invoice-item-${invoice._id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invoice.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(invoice.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
