import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Trash2,
  Save,
  UserPlus,
  Check,
  ChevronsUpDown,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  useCustomers,
  useCreateCustomer,
  useCreateInvoice,
  useSettings,
} from "@/lib/hooks";

interface InvoiceItem {
  id: string;
  description: string;
  hsnCode: string;
  itemType: string;
  pcs: number;
  grossWeight: number;
  lessWeight: number;
  netWeight: number;
  ratePerTenGram: number;
  metalAmount: number;
  labourChargeRate: number;
  labourChargeAmount: number;
  amount: number;
}

// Compact, spreadsheet-like cell inputs for the items table
const cellClass =
  "h-9 rounded-md border-transparent bg-muted/60 px-2.5 shadow-none transition-colors hover:border-border focus-visible:border-primary focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0";
const numberCellClass = cn(cellClass, "no-spinner px-2 text-right tabular-nums");

type NumericItemField =
  | "grossWeight"
  | "lessWeight"
  | "ratePerTenGram"
  | "labourChargeRate";

export default function CreateInvoice() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: customersData, isLoading: customersLoading } = useCustomers();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const createCustomer = useCreateCustomer();
  const createInvoice = useCreateInvoice();

  const customers = customersData?.customers || [];
  const productTypes = settings?.productTypes || [];

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [oldGoldWeight, setOldGoldWeight] = useState(0);
  const [oldGoldAmount, setOldGoldAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      hsnCode: "",
      itemType: "",
      pcs: 1,
      grossWeight: 0,
      lessWeight: 0,
      netWeight: 0,
      ratePerTenGram: 0,
      metalAmount: 0,
      labourChargeRate: 0,
      labourChargeAmount: 0,
      amount: 0,
    },
  ]);

  // Quick add customer state
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
  });

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        hsnCode: "",
        itemType: "",
        pcs: 1,
        grossWeight: 0,
        lessWeight: 0,
        netWeight: 0,
        ratePerTenGram: 0,
        metalAmount: 0,
        labourChargeRate: 0,
        labourChargeAmount: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Auto-fill HSN code and rate when type is selected
          if (field === "itemType") {
            const productType = productTypes.find(
              (pt: any) => pt.name === value
            );
            if (productType) {
              updated.ratePerTenGram = productType.ratePerTenGram;
              updated.hsnCode = productType.hsnCode || "";
            }
          }

          // Calculate net weight
          updated.netWeight = updated.grossWeight - updated.lessWeight;

          // Calculate metal amount (net weight / 10 * rate per 10gm)
          updated.metalAmount =
            (updated.netWeight / 10) * updated.ratePerTenGram;

          // Calculate labour charge amount
          updated.labourChargeAmount =
            updated.labourChargeRate * updated.netWeight;

          // Calculate total item amount
          updated.amount = updated.metalAmount + updated.labourChargeAmount;

          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const cgstRate = settings?.cgstRate || 0;
    const sgstRate = settings?.sgstRate || 0;
    const cgst = (subtotal * cgstRate) / 100;
    const sgst = (subtotal * sgstRate) / 100;
    const taxAmount = cgst + sgst;
    const totalBeforeOldGold = subtotal + taxAmount - discount;
    const totalAfterOldGold = totalBeforeOldGold - oldGoldAmount;
    const roundOff = Math.round(totalAfterOldGold) - totalAfterOldGold;
    const total = Math.round(totalAfterOldGold);
    const balance = total - cashReceived;
    return {
      subtotal,
      cgst,
      sgst,
      taxAmount,
      totalBeforeOldGold,
      oldGoldAmount,
      totalAfterOldGold,
      roundOff,
      total,
      cashReceived,
      balance,
      cgstRate,
      sgstRate,
    };
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomerForm.name || !newCustomerForm.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerData = {
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        email: newCustomerForm.email,
        address: {
          street: newCustomerForm.address,
          city: "",
          state: "",
          zipCode: "",
          country: "India",
        },
        gstNumber: newCustomerForm.gstNumber,
      };

      const result = await createCustomer.mutateAsync(customerData);
      setSelectedCustomerId(result.customer._id);
      setShowAddCustomer(false);
      setNewCustomerForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
      });

      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyItems = items.some(
      (item) => !item.description || !item.itemType || item.grossWeight <= 0
    );
    if (hasEmptyItems) {
      toast({
        title: "Error",
        description:
          "Please fill in all item details (description, type, and gross weight required)",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find((c: any) => c._id === selectedCustomerId);
    if (!customer) return;

    const totals = calculateTotals();

    try {
      await createInvoice.mutateAsync({
        customerId: selectedCustomerId,
        items: items.map((item) => ({
          description: item.description,
          hsnCode: item.hsnCode,
          itemType: item.itemType,
          pcs: item.pcs,
          grossWeight: item.grossWeight,
          lessWeight: item.lessWeight,
          netWeight: item.netWeight,
          ratePerTenGram: item.ratePerTenGram,
          metalAmount: item.metalAmount,
          labourChargeRate: item.labourChargeRate,
          labourChargeAmount: item.labourChargeAmount,
          amount: item.amount,
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        taxRate: totals.cgstRate + totals.sgstRate,
        cgstRate: totals.cgstRate,
        cgstAmount: totals.cgst,
        sgstRate: totals.sgstRate,
        sgstAmount: totals.sgst,
        discount: discount,
        roundOff: totals.roundOff,
        oldGoldWeight: oldGoldWeight,
        oldGoldAmount: oldGoldAmount,
        cashReceived: cashReceived,
        balanceAmount: totals.balance,
        total: totals.total,
        invoiceDate: invoiceDate,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      setLocation("/invoices");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const totals = calculateTotals();

  const itemTotals = items.reduce(
    (acc, item) => ({
      pcs: acc.pcs + (item.pcs || 0),
      gross: acc.gross + item.grossWeight,
      less: acc.less + item.lessWeight,
      net: acc.net + item.netWeight,
      amount: acc.amount + item.amount,
    }),
    { pcs: 0, gross: 0, less: 0, net: 0, amount: 0 }
  );

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    e.target.select();

  const numberInputProps = (
    item: InvoiceItem,
    field: NumericItemField,
    step: string
  ) => ({
    type: "number",
    inputMode: "decimal" as const,
    step,
    min: "0",
    value: item[field] || "",
    onFocus: selectOnFocus,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateItem(item.id, field, parseFloat(e.target.value) || 0),
  });

  const moneyInputProps = (
    value: number,
    setValue: (n: number) => void,
    step = "0.01"
  ) => ({
    type: "number",
    inputMode: "decimal" as const,
    step,
    min: "0",
    value: value || "",
    placeholder: "0",
    onFocus: selectOnFocus,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(parseFloat(e.target.value) || 0),
  });

  // Pcs may be cleared while typing; fall back to 1 when the field is left empty
  const pcsInputProps = (item: InvoiceItem) => ({
    type: "number",
    inputMode: "numeric" as const,
    min: "1",
    step: "1",
    value: item.pcs || "",
    placeholder: "1",
    onFocus: selectOnFocus,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateItem(item.id, "pcs", parseInt(e.target.value) || 0),
    onBlur: () => {
      if (!item.pcs || item.pcs < 1) updateItem(item.id, "pcs", 1);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedCustomer = customers.find(
    (c: any) => c._id === selectedCustomerId
  );
  const customerAddress = selectedCustomer?.address
    ? [selectedCustomer.address.street, selectedCustomer.address.city]
        .filter(Boolean)
        .join(", ")
    : "";

  if (customersLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">New invoice</h1>
        <p className="text-muted-foreground">
          Pick the customer, add items, and totals update as you type.
        </p>
      </div>

      {/* Customer and date */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-2">
              <Label htmlFor="customer">
                Customer <span className="text-primary">*</span>
              </Label>
              <div className="flex gap-2">
                <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="customer"
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerPickerOpen}
                      className="h-10 min-w-0 flex-1 justify-between px-3 font-normal"
                      data-testid="select-customer"
                    >
                      <span
                        className={cn(
                          "truncate",
                          !selectedCustomer && "text-muted-foreground"
                        )}
                      >
                        {selectedCustomer
                          ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                          : "Search by name or phone"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] min-w-[280px] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search by name or phone" />
                      <CommandList>
                        <CommandEmpty>
                          <div className="space-y-2 px-2">
                            <p>No customer found.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCustomerPickerOpen(false);
                                setShowAddCustomer(true);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add new customer
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer: any) => (
                            <CommandItem
                              key={customer._id}
                              value={`${customer.name} ${customer.phone} ${customer._id}`}
                              onSelect={() => {
                                setSelectedCustomerId(customer._id);
                                setCustomerPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-primary",
                                  selectedCustomerId === customer._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="truncate">{customer.name}</span>
                              <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">
                                {customer.phone}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setShowAddCustomer(true)}
                  aria-label="Add new customer"
                  title="Add new customer"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Invoice date</Label>
              <DatePicker
                date={invoiceDate}
                onDateChange={(date) => setInvoiceDate(date || new Date())}
                placeholder="Select invoice date"
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {selectedCustomer.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="font-medium">{selectedCustomer.name}</span>
              </div>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {selectedCustomer.phone}
              </span>
              {selectedCustomer.gstNumber && (
                <span className="text-muted-foreground">
                  GSTIN <span className="font-medium text-foreground">{selectedCustomer.gstNumber}</span>
                </span>
              )}
              {customerAddress && (
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{customerAddress}</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="items-cq overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b bg-muted/30 p-4 sm:p-6">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              Items
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {items.length}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choosing a type fills in its HSN code and today's rate.
            </p>
          </div>
          <Button onClick={addItem} size="sm" className="shrink-0" data-testid="button-add-item">
            <Plus className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Wide layout: one row per item */}
          <div className="items-table-view overflow-x-auto">
            <table className="w-full min-w-[940px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-[116px]" />
                <col className="w-[70px]" />
                <col className="w-[50px]" />
                <col className="w-[82px]" />
                <col className="w-[74px]" />
                <col className="w-[76px]" />
                <col className="w-[98px]" />
                <col className="w-[88px]" />
                <col className="w-[124px]" />
              </colgroup>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th colSpan={5} className="px-3 pb-1 pt-3 text-left font-semibold text-foreground">
                    Item
                  </th>
                  <th colSpan={3} className="border-l px-3 pb-1 pt-3 text-center font-semibold text-foreground">
                    Weight (g)
                  </th>
                  <th colSpan={2} className="border-l px-3 pb-1 pt-3 text-center font-semibold text-foreground">
                    Rate and value (₹)
                  </th>
                  <th className="sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)] border-l bg-card px-3 pb-1 pt-3" />
                </tr>
                <tr className="border-b text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-1 py-2 text-left">
                    Description <span className="text-primary">*</span>
                  </th>
                  <th className="px-1 py-2 text-left">
                    Type <span className="text-primary">*</span>
                  </th>
                  <th className="px-1 py-2 text-left">HSN</th>
                  <th className="px-1 py-2 text-right">Pcs</th>
                  <th className="border-l px-1 py-2 text-right">
                    Gross <span className="text-primary">*</span>
                  </th>
                  <th className="px-1 py-2 text-right">Less</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="border-l px-1 py-2 text-right">Per 10g</th>
                  <th className="px-1 py-2 text-right">Labour/g</th>
                  <th className="sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)] border-l bg-card px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="group border-b transition-colors hover:bg-muted/30 focus-within:bg-primary/5"
                    data-testid={`item-row-${index}`}
                  >
                    <td className="px-2 py-2.5">
                      <RowNumberButton
                        index={index}
                        canRemove={items.length > 1}
                        onRemove={() => removeItem(item.id)}
                      />
                    </td>
                    <td className="px-1 py-2.5">
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="e.g. Gold ring"
                        className={cellClass}
                        aria-label={`Item ${index + 1} description`}
                        data-testid={`input-item-description-${index}`}
                      />
                    </td>
                    <td className="px-1 py-2.5">
                      <ItemTypeSelect
                        value={item.itemType}
                        types={productTypes}
                        onChange={(value) => updateItem(item.id, "itemType", value)}
                        ariaLabel={`Item ${index + 1} type`}
                        testId={`select-item-type-${index}`}
                      />
                    </td>
                    <td className="px-1 py-2.5">
                      <Input
                        value={item.hsnCode}
                        onChange={(e) =>
                          updateItem(item.id, "hsnCode", e.target.value)
                        }
                        placeholder="—"
                        className={cn(cellClass, "px-2 tabular-nums")}
                        aria-label={`Item ${index + 1} HSN code`}
                        data-testid={`input-item-hsn-${index}`}
                      />
                    </td>
                    <td className="px-1 py-2.5">
                      <Input
                        {...pcsInputProps(item)}
                        className={numberCellClass}
                        aria-label={`Item ${index + 1} pieces`}
                        data-testid={`input-item-pcs-${index}`}
                      />
                    </td>
                    <td className="border-l px-1 py-2.5">
                      <Input
                        {...numberInputProps(item, "grossWeight", "0.001")}
                        placeholder="0.000"
                        className={numberCellClass}
                        aria-label={`Item ${index + 1} gross weight in grams`}
                        data-testid={`input-item-gross-weight-${index}`}
                      />
                    </td>
                    <td className="px-1 py-2.5">
                      <Input
                        {...numberInputProps(item, "lessWeight", "0.001")}
                        placeholder="0.000"
                        className={numberCellClass}
                        aria-label={`Item ${index + 1} less weight in grams`}
                        data-testid={`input-item-less-weight-${index}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <NetWeight
                        value={item.netWeight}
                        testId={`input-item-net-weight-${index}`}
                      />
                    </td>
                    <td className="border-l px-1 py-2.5">
                      <AffixInput
                        prefix="₹"
                        {...numberInputProps(item, "ratePerTenGram", "0.01")}
                        placeholder="0"
                        className={numberCellClass}
                        aria-label={`Item ${index + 1} rate per 10 grams`}
                        data-testid={`input-item-rate-${index}`}
                      />
                      {item.amount > 0 && (
                        <p className="mt-1 pr-2 text-right text-[11px] leading-none tabular-nums text-muted-foreground" title="Metal value">
                          {formatCurrency(item.metalAmount)}
                        </p>
                      )}
                    </td>
                    <td className="px-1 py-2.5">
                      <AffixInput
                        prefix="₹"
                        {...numberInputProps(item, "labourChargeRate", "0.01")}
                        placeholder="0"
                        className={numberCellClass}
                        aria-label={`Item ${index + 1} labour charge per gram`}
                        data-testid={`input-item-labour-rate-${index}`}
                      />
                      {item.amount > 0 && (
                        <p className="mt-1 pr-2 text-right text-[11px] leading-none tabular-nums text-muted-foreground" title="Labour charge">
                          {formatCurrency(item.labourChargeAmount)}
                        </p>
                      )}
                    </td>
                    <td className="sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)] border-l bg-card px-2 py-2.5 text-right tabular-nums">
                      <div
                        className={cn(
                          "whitespace-nowrap font-semibold",
                          item.amount === 0 && "text-muted-foreground"
                        )}
                        data-testid={`text-item-amount-${index}`}
                      >
                        {formatCurrency(item.amount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-semibold tabular-nums">
                  <td colSpan={4} className="px-3 py-3 text-muted-foreground">
                    Total
                  </td>
                  <td className="px-2 py-3 text-right">{itemTotals.pcs}</td>
                  <td className="border-l px-2 py-3 text-right">{itemTotals.gross.toFixed(3)}</td>
                  <td className="px-2 py-3 text-right">{itemTotals.less.toFixed(3)}</td>
                  <td className="px-3 py-3 text-right">{itemTotals.net.toFixed(3)}</td>
                  <td colSpan={2} className="border-l" />
                  <td className="sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)] border-l bg-muted px-3 py-3 text-right text-base">
                    {formatCurrency(itemTotals.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Narrow layout: one card per item */}
          <div className="items-card-view divide-y">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 p-4 transition-colors focus-within:bg-primary/5"
                data-testid={`item-row-${index}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.description || `Item ${index + 1}`}
                    </p>
                    {item.itemType && (
                      <p className="truncate text-xs text-muted-foreground">{item.itemType}</p>
                    )}
                  </div>
                  <span
                    className="text-base font-semibold tabular-nums"
                    data-testid={`text-item-amount-${index}`}
                  >
                    {formatCurrency(item.amount)}
                  </span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove item ${index + 1}`}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="item-fields">
                  <div className="item-field-wide space-y-1">
                    <Label htmlFor={`desc-${item.id}`} className="text-xs text-muted-foreground">
                      Description <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id={`desc-${item.id}`}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="e.g. Gold ring"
                      className={cellClass}
                      data-testid={`input-item-description-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Type <span className="text-primary">*</span>
                    </Label>
                    <ItemTypeSelect
                      value={item.itemType}
                      types={productTypes}
                      onChange={(value) => updateItem(item.id, "itemType", value)}
                      ariaLabel={`Item ${index + 1} type`}
                      testId={`select-item-type-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`hsn-${item.id}`} className="text-xs text-muted-foreground">HSN</Label>
                    <Input
                      id={`hsn-${item.id}`}
                      value={item.hsnCode}
                      onChange={(e) =>
                        updateItem(item.id, "hsnCode", e.target.value)
                      }
                      className={cn(cellClass, "tabular-nums")}
                      data-testid={`input-item-hsn-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`pcs-${item.id}`} className="text-xs text-muted-foreground">Pieces</Label>
                    <Input
                      id={`pcs-${item.id}`}
                      {...pcsInputProps(item)}
                      className={numberCellClass}
                      data-testid={`input-item-pcs-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`gross-${item.id}`} className="text-xs text-muted-foreground">
                      Gross wt (g) <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id={`gross-${item.id}`}
                      {...numberInputProps(item, "grossWeight", "0.001")}
                      placeholder="0.000"
                      className={numberCellClass}
                      data-testid={`input-item-gross-weight-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`less-${item.id}`} className="text-xs text-muted-foreground">Less wt (g)</Label>
                    <Input
                      id={`less-${item.id}`}
                      {...numberInputProps(item, "lessWeight", "0.001")}
                      placeholder="0.000"
                      className={numberCellClass}
                      data-testid={`input-item-less-weight-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-muted-foreground">Net wt (g)</span>
                    <div
                      className={cn(
                        "flex h-9 items-center justify-end rounded-md border border-dashed px-2 text-sm tabular-nums",
                        item.netWeight < 0 && "border-destructive"
                      )}
                    >
                      <NetWeight
                        value={item.netWeight}
                        testId={`input-item-net-weight-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`rate-${item.id}`} className="text-xs text-muted-foreground">Rate per 10g</Label>
                    <AffixInput
                      id={`rate-${item.id}`}
                      prefix="₹"
                      {...numberInputProps(item, "ratePerTenGram", "0.01")}
                      placeholder="0"
                      className={numberCellClass}
                      data-testid={`input-item-rate-${index}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`lab-${item.id}`} className="text-xs text-muted-foreground">Labour per g</Label>
                    <AffixInput
                      id={`lab-${item.id}`}
                      prefix="₹"
                      {...numberInputProps(item, "labourChargeRate", "0.01")}
                      placeholder="0"
                      className={numberCellClass}
                      data-testid={`input-item-labour-rate-${index}`}
                    />
                  </div>
                </div>

                {item.amount > 0 && (
                  <p className="text-right text-xs tabular-nums text-muted-foreground">
                    Metal {formatCurrency(item.metalAmount)} + labour{" "}
                    {formatCurrency(item.labourChargeAmount)}
                  </p>
                )}
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-4 text-sm font-semibold tabular-nums">
              <span className="text-muted-foreground">
                {itemTotals.pcs} pcs, {itemTotals.net.toFixed(3)} g net
              </span>
              <span className="text-base">{formatCurrency(itemTotals.amount)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-2 border-t border-dashed py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />
            Add another item
          </button>
        </CardContent>
      </Card>

      {/* Adjustments, payment and bill summary */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle>Adjustments and payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-2 sm:grid-cols-2 sm:p-6 sm:pt-2">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <AffixInput
                id="discount"
                prefix="₹"
                {...moneyInputProps(discount, setDiscount)}
                className="no-spinner text-right tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-received">Cash received</Label>
              <div className="flex gap-2">
                <AffixInput
                  id="cash-received"
                  prefix="₹"
                  wrapperClassName="flex-1"
                  {...moneyInputProps(cashReceived, setCashReceived)}
                  className="no-spinner text-right tabular-nums"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setCashReceived(Math.max(totals.total, 0))}
                  disabled={totals.total <= 0 || cashReceived === totals.total}
                >
                  Full amount
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="old-gold-weight">Old gold weight</Label>
              <AffixInput
                id="old-gold-weight"
                suffix="g"
                {...moneyInputProps(oldGoldWeight, setOldGoldWeight, "0.001")}
                placeholder="0.000"
                className="no-spinner text-right tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="old-gold-amount">Old gold value</Label>
              <AffixInput
                id="old-gold-amount"
                prefix="₹"
                {...moneyInputProps(oldGoldAmount, setOldGoldAmount)}
                className="no-spinner text-right tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Deducted from the bill total.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle>Bill summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-2 text-sm tabular-nums sm:p-6 sm:pt-2">
            <SummaryRow label="Items subtotal" value={formatCurrency(totals.subtotal)} testId="text-subtotal" />
            <SummaryRow label={`CGST (${totals.cgstRate}%)`} value={formatCurrency(totals.cgst)} testId="text-cgst" />
            <SummaryRow label={`SGST (${totals.sgstRate}%)`} value={formatCurrency(totals.sgst)} testId="text-sgst" />
            {discount > 0 && (
              <SummaryRow label="Discount" value={`− ${formatCurrency(discount)}`} />
            )}
            {oldGoldAmount > 0 && (
              <SummaryRow
                label={oldGoldWeight > 0 ? `Old gold (${oldGoldWeight.toFixed(3)} g)` : "Old gold"}
                value={`− ${formatCurrency(oldGoldAmount)}`}
              />
            )}
            {Math.abs(totals.roundOff) >= 0.01 && (
              <SummaryRow label="Round off" value={totals.roundOff.toFixed(2)} />
            )}

            <div className="!mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">Net amount</span>
                <span className="text-2xl font-bold" data-testid="text-total">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>

            <SummaryRow label="Cash received" value={formatCurrency(cashReceived)} />
            <div className="flex items-center justify-between gap-3 border-t pt-2.5">
              <span className="font-medium">Balance</span>
              {totals.total <= 0 && cashReceived === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <BalanceBadge balance={totals.balance} format={formatCurrency} />
              )}
            </div>

            <Button
              onClick={handleSaveInvoice}
              size="lg"
              className="!mt-5 w-full"
              disabled={createInvoice.isPending}
              data-testid="button-save-invoice"
            >
              <Save className="mr-2 h-4 w-4" />
              {createInvoice.isPending ? "Saving…" : "Save invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add new customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">
                Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="new-name"
                value={newCustomerForm.name}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">
                Phone <span className="text-primary">*</span>
              </Label>
              <Input
                id="new-phone"
                type="tel"
                inputMode="tel"
                value={newCustomerForm.phone}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newCustomerForm.address}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-gst">GST number</Label>
              <Input
                id="new-gst"
                value={newCustomerForm.gstNumber}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, gstNumber: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddCustomer}
              disabled={createCustomer.isPending}
            >
              {createCustomer.isPending ? "Adding…" : "Add customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

type AffixInputProps = React.ComponentProps<typeof Input> & {
  prefix?: string;
  suffix?: string;
  wrapperClassName?: string;
};

function AffixInput({ prefix, suffix, wrapperClassName, className, ...props }: AffixInputProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      {prefix && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {prefix}
        </span>
      )}
      <Input
        className={cn(className, prefix && "pl-6", suffix && "pr-7")}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function ItemTypeSelect({
  value,
  types,
  onChange,
  ariaLabel,
  testId,
}: {
  value: string;
  types: any[];
  onChange: (value: string) => void;
  ariaLabel: string;
  testId: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(cellClass, "px-2 focus:ring-1 focus:ring-primary/30 focus:ring-offset-0")}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {types.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Add product types in Settings first.
          </div>
        ) : (
          types.map((type: any) => (
            <SelectItem key={type.name} value={type.name}>
              {type.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function RowNumberButton({
  index,
  canRemove,
  onRemove,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const badge =
    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold";

  if (!canRemove) {
    return (
      <span className={cn(badge, "bg-muted text-muted-foreground group-focus-within:bg-primary group-focus-within:text-primary-foreground")}>
        {index + 1}
      </span>
    );
  }

  // Shows the row number; turns into a remove button on hover or keyboard focus
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        badge,
        "group/num bg-muted text-muted-foreground transition-colors group-focus-within:bg-primary group-focus-within:text-primary-foreground hover:!bg-destructive hover:!text-destructive-foreground focus-visible:!bg-destructive focus-visible:!text-destructive-foreground focus-visible:outline-none"
      )}
      aria-label={`Remove item ${index + 1}`}
      title="Remove item"
      data-testid={`button-remove-item-${index}`}
    >
      <span className="group-hover/num:hidden group-focus-visible/num:hidden">{index + 1}</span>
      <Trash2 className="hidden h-3.5 w-3.5 group-hover/num:block group-focus-visible/num:block" />
    </button>
  );
}

function NetWeight({ value, testId }: { value: number; testId: string }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value < 0 ? "text-destructive" : value === 0 && "text-muted-foreground"
      )}
      title={value < 0 ? "Less weight is more than gross weight" : undefined}
      data-testid={testId}
    >
      {value.toFixed(3)}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function BalanceBadge({
  balance,
  format,
}: {
  balance: number;
  format: (n: number) => string;
}) {
  if (balance > 0) {
    return (
      <span className="flex items-center gap-1.5 font-bold text-destructive">
        <AlertCircle className="h-4 w-4" />
        {format(balance)} due
      </span>
    );
  }
  if (balance < 0) {
    return (
      <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-4 w-4" />
        {format(Math.abs(balance))} to return
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 font-bold text-green-600 dark:text-green-500">
      <CheckCircle2 className="h-4 w-4" />
      Fully paid
    </span>
  );
}
