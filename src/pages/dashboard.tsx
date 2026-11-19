import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Users,
  Plus,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Preset = "today" | "7d" | "30d" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

// Indian short form for axis ticks: ₹45k, ₹1.2L, ₹3.4Cr
const formatCompact = (value: number) => {
  if (value >= 1_00_00_000) return `₹${+(value / 1_00_00_000).toFixed(1)}Cr`;
  if (value >= 1_00_000) return `₹${+(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${+(value / 1_000).toFixed(0)}k`;
  return `₹${value}`;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const shortDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Local timezone as "+05:30" so the server groups sales by the shop's calendar day
const tzOffset = () => {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/** Works out the selected period, the chart window and the labels for it. */
function usePeriod(preset: Preset, custom: DateRange | undefined) {
  return useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    let from = today;
    let to = tomorrow;
    if (preset === "7d") from = addDays(today, -6);
    if (preset === "30d") from = addDays(today, -29);
    if (preset === "custom" && custom?.from) {
      from = startOfDay(custom.from);
      to = addDays(startOfDay(custom.to ?? custom.from), 1);
    }
    const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);

    // Chart: a single day gets the last 7 days for context; long ranges go monthly
    const groupBy: "day" | "month" = days > 62 ? "month" : "day";
    const trendFrom =
      days === 1 ? addDays(to, -7) : groupBy === "month" ? new Date(from.getFullYear(), from.getMonth(), 1) : from;
    const trendTo = to;

    const rangeText =
      days === 1
        ? from.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
        : `${shortDate(from)} – ${addDays(to, -1).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

    const salesLabel =
      preset === "today"
        ? "Sales today"
        : preset === "7d"
          ? "Sales in the last 7 days"
          : preset === "30d"
            ? "Sales in the last 30 days"
            : days === 1
              ? `Sales on ${shortDate(from)}`
              : "Sales in this period";

    const previousLabel =
      preset === "today"
        ? "yesterday"
        : days === 1
          ? "the day before"
          : `the previous ${days} days`;

    const params = {
      from: from.toISOString(),
      to: to.toISOString(),
      trendFrom: trendFrom.toISOString(),
      trendTo: trendTo.toISOString(),
      groupBy,
      tz: tzOffset(),
    };

    return { from, to, days, groupBy, trendFrom, trendTo, rangeText, salesLabel, previousLabel, params };
  }, [preset, custom?.from?.getTime(), custom?.to?.getTime()]);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const [preset, setPreset] = useState<Preset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const period = usePeriod(preset, customRange);

  const { data: dashboardData, isLoading: statsLoading, isFetching } =
    useDashboardStats(period.params);
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    limit: 1,
  });

  const overview = dashboardData?.overview || {};
  const current = dashboardData?.period || {
    sales: 0,
    invoices: 0,
    cashReceived: 0,
    balance: 0,
    unpaidInvoices: 0,
  };
  const previous = dashboardData?.previousPeriod;
  const invoicesList: any[] =
    dashboardData?.periodInvoices ?? dashboardData?.recentInvoices ?? [];

  const change =
    previous && previous.sales > 0
      ? ((current.sales - previous.sales) / previous.sales) * 100
      : null;
  const averageBill = current.invoices > 0 ? current.sales / current.invoices : 0;
  const collectedShare =
    current.cashReceived + current.balance > 0
      ? Math.round((current.cashReceived / (current.cashReceived + current.balance)) * 100)
      : 0;

  // Fill every day/month in the chart window, including ones with no sales
  const chartData = useMemo(() => {
    const byKey = new Map<string, any>(
      (dashboardData?.trend || []).map((t: any) => [t.key, t])
    );
    const rows: { key: string; label: string; fullLabel: string; sales: number; invoices: number }[] = [];
    if (period.groupBy === "month") {
      for (
        let d = new Date(period.trendFrom);
        d < period.trendTo;
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      ) {
        const key = monthKey(d);
        rows.push({
          key,
          label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          fullLabel: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
          sales: byKey.get(key)?.sales || 0,
          invoices: byKey.get(key)?.invoices || 0,
        });
      }
    } else {
      for (let d = new Date(period.trendFrom); d < period.trendTo; d = addDays(d, 1)) {
        const key = dayKey(d);
        rows.push({
          key,
          label: shortDate(d),
          fullLabel: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" }),
          sales: byKey.get(key)?.sales || 0,
          invoices: byKey.get(key)?.invoices || 0,
        });
      }
    }
    return rows;
  }, [dashboardData?.trend, period]);

  const isLoading = statsLoading || customersLoading;

  const choosePreset = (id: Preset) => {
    if (id === "custom") {
      setDraftRange(customRange ?? { from: period.from, to: addDays(period.to, -1) });
      setPickerOpen(true);
      return;
    }
    setPreset(id);
  };

  const applyCustomRange = () => {
    if (!draftRange?.from) return;
    setCustomRange(draftRange);
    setPreset("custom");
    setPickerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">{greeting()}</h1>
        </div>
        <Button
          size="lg"
          onClick={() => setLocation("/create-invoice")}
          className="w-full sm:w-auto"
          data-testid="button-create-invoice"
        >
          <Plus className="mr-2 h-4 w-4" />
          New invoice
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <div
            role="radiogroup"
            aria-label="Date range"
            className="grid grid-cols-4 gap-1 rounded-lg border bg-muted/50 p-1 md:inline-grid md:w-auto"
          >
            {PRESETS.map((p) => {
              const selected = preset === p.id;
              const button = (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choosePreset(p.id)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:text-sm",
                    selected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`filter-${p.id}`}
                >
                  {p.id === "custom" && <CalendarDays className="hidden h-3.5 w-3.5 sm:block" />}
                  {p.label}
                </button>
              );
              return p.id === "custom" ? (
                <PopoverTrigger asChild key={p.id}>
                  {button}
                </PopoverTrigger>
              ) : (
                button
              );
            })}
          </div>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={draftRange?.from ? addDays(draftRange.from, isMobile ? 0 : -15) : undefined}
              disabled={{ after: new Date() }}
              initialFocus
            />
            <div className="flex items-center justify-between gap-3 border-t p-3">
              <p className="text-sm text-muted-foreground">
                {draftRange?.from
                  ? draftRange.to && dayKey(draftRange.to) !== dayKey(draftRange.from)
                    ? `${shortDate(draftRange.from)} – ${shortDate(draftRange.to)}`
                    : shortDate(draftRange.from)
                  : "Pick a start date"}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={applyCustomRange} disabled={!draftRange?.from}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <CalendarDays className="h-4 w-4" />
          {period.rangeText}
          {isFetching && !isLoading && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-label="Updating" />
          )}
        </p>
      </div>

      {/* Headline: sales for the selected period */}
      <Card
        className="overflow-hidden border-primary/30 bg-primary/[0.07]"
        data-testid="card-today-sales"
      >
        <CardContent className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{period.salesLabel}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-11 w-48" />
            ) : (
              <p
                className="mt-1 truncate text-4xl font-bold tabular-nums tracking-tight sm:text-5xl"
                data-testid="text-today-sales"
              >
                {formatCurrency(current.sales)}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {!isLoading && (
                <span>
                  {current.invoices === 0
                    ? "No bills in this period."
                    : `From ${current.invoices} ${current.invoices === 1 ? "bill" : "bills"}.`}
                </span>
              )}
              {change !== null && !isLoading && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-medium",
                    change >= 0 ? "text-green-700 dark:text-green-500" : "text-destructive"
                  )}
                >
                  {change >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(change).toFixed(0)}% vs {period.previousLabel}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-primary/20 bg-primary/20 text-sm">
            <div className="bg-card px-4 py-3">
              <p className="text-muted-foreground">Average bill</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-24" />
              ) : (
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {formatCurrency(averageBill)}
                </p>
              )}
            </div>
            <div className="bg-card px-4 py-3">
              <p className="truncate text-muted-foreground first-letter:uppercase">
                {period.previousLabel.replace(/^the /, "")}
              </p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-24" />
              ) : (
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {formatCurrency(previous?.sales || 0)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key figures for the period */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          testId="card-total-invoices"
          valueTestId="text-total-invoices"
          icon={FileText}
          label="Invoices"
          value={isLoading ? null : String(current.invoices)}
          note={isLoading ? "" : `${current.unpaidInvoices} with balance due`}
          onClick={() => setLocation("/invoices")}
        />
        <StatCard
          testId="card-total-customers"
          valueTestId="text-total-customers"
          icon={Users}
          label="Customers"
          value={isLoading ? null : String(customersData?.pagination?.total || 0)}
          note="All registered customers"
          onClick={() => setLocation("/customers")}
        />
        <StatCard
          testId="card-cash-received"
          valueTestId="text-cash-received"
          icon={Wallet}
          label="Cash collected"
          value={isLoading ? null : formatCurrency(current.cashReceived)}
          note={isLoading ? "" : `${collectedShare}% of the amount billed`}
        >
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Share of billed amount collected"
            aria-valuenow={collectedShare}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-green-600 transition-[width] duration-500"
              style={{ width: `${collectedShare}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          testId="card-total-balance"
          valueTestId="text-total-balance"
          icon={AlertCircle}
          label="Outstanding"
          value={isLoading ? null : formatCurrency(current.balance)}
          valueClassName={current.balance > 0 ? "text-destructive" : undefined}
          note={isLoading ? "" : `All time: ${formatCurrency(overview.totalBalance || 0)}`}
          onClick={() => setLocation("/invoices")}
        />
      </div>

      {/* Sales trend and invoices for the period */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle>{period.groupBy === "month" ? "Monthly sales" : "Daily sales"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {period.days === 1
                ? "Last 7 days, ending on the selected day"
                : period.rangeText}
            </p>
          </CardHeader>
          <CardContent className="p-2 pt-2 sm:p-6 sm:pt-2">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      width={52}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={formatCompact}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                      content={<SalesTooltip />}
                    />
                    <Bar
                      dataKey="sales"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle>Latest invoices</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 text-muted-foreground"
              onClick={() => setLocation("/invoices")}
            >
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-4 sm:pt-0">
            {isLoading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : invoicesList.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No invoices in this period.
                </p>
                <Button size="sm" onClick={() => setLocation("/create-invoice")}>
                  <Plus className="mr-1 h-4 w-4" />
                  New invoice
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {invoicesList.map((invoice) => (
                  <li key={invoice._id}>
                    <button
                      type="button"
                      onClick={() => setLocation("/invoices")}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                      data-testid={`invoice-item-${invoice._id}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                        {(invoice.customerName || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {invoice.customerName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {invoice.invoiceNumber}, {shortDate(new Date(invoice.invoiceDate))}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular-nums">
                          {formatCurrency(invoice.total)}
                        </span>
                        <InvoiceStatus invoice={invoice} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  valueClassName,
  testId,
  valueTestId,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  note: string;
  valueClassName?: string;
  testId: string;
  valueTestId: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const body = (
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p
          className={cn(
            "mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl",
            valueClassName
          )}
          data-testid={valueTestId}
        >
          {value}
        </p>
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">{note || " "}</p>
      {children}
    </CardContent>
  );

  return (
    <Card data-testid={testId} className="min-w-0">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full rounded-[inherit] text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        body
      )}
    </Card>
  );
}

function InvoiceStatus({ invoice }: { invoice: any }) {
  if (invoice.status === "cancelled") {
    return <span className="text-xs text-muted-foreground">Cancelled</span>;
  }
  if ((invoice.balanceAmount || 0) > 0) {
    return (
      <span className="flex items-center justify-end gap-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3 w-3" />
        {formatCurrency(invoice.balanceAmount)} due
      </span>
    );
  }
  return (
    <span className="flex items-center justify-end gap-1 text-xs font-medium text-green-700 dark:text-green-500">
      <CheckCircle2 className="h-3 w-3" />
      Paid
    </span>
  );
}

function SalesTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{d.fullLabel}</p>
      <p className="mt-1 tabular-nums">{formatCurrency(d.sales)}</p>
      <p className="text-xs text-muted-foreground">
        {d.invoices} {d.invoices === 1 ? "invoice" : "invoices"}
      </p>
    </div>
  );
}
