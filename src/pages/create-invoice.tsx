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
import { Plus, Trash2, Save, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (customersLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Create Invoice</h1>
        <p className="text-muted-foreground">
          Generate a new invoice for your customer
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                    >
                      <SelectTrigger
                        id="customer"
                        data-testid="select-customer"
                      >
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: any) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddCustomer(true)}
                      title="Add new customer"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date</Label>
                  <DatePicker
                    date={invoiceDate}
                    onDateChange={(date) => setInvoiceDate(date || new Date())}
                    placeholder="Select invoice date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>Items</CardTitle>
              <Button onClick={addItem} size="sm" data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-border rounded-md p-4 space-y-4"
                  data-testid={`item-row-${index}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-3">
                      <Label>Item Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="e.g., KHILI FANCY HM 18K, Gold Ring"
                        data-testid={`input-item-description-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Item Type *</Label>
                      <Select
                        value={item.itemType}
                        onValueChange={(value) =>
                          updateItem(item.id, "itemType", value)
                        }
                      >
                        <SelectTrigger
                          data-testid={`select-item-type-${index}`}
                        >
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((type: any) => (
                            <SelectItem key={type.name} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>HSN Code</Label>
                      <Input
                        value={item.hsnCode}
                        onChange={(e) =>
                          updateItem(item.id, "hsnCode", e.target.value)
                        }
                        placeholder="711311"
                        data-testid={`input-item-hsn-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Pieces</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.pcs || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "pcs",
                            parseInt(e.target.value) || 1
                          )
                        }
                        data-testid={`input-item-pcs-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Gross Weight (g) *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.grossWeight || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "grossWeight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        data-testid={`input-item-gross-weight-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Less Weight (g)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.lessWeight || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "lessWeight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Stone, etc."
                        data-testid={`input-item-less-weight-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Net Weight (g)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.netWeight.toFixed(3)}
                        readOnly
                        className="bg-muted"
                        data-testid={`input-item-net-weight-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rate per 10gm (₹)</Label>
                      <Input
                        type="number"
                        value={item.ratePerTenGram || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "ratePerTenGram",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        data-testid={`input-item-rate-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Metal Amount (₹)</Label>
                      <Input
                        type="number"
                        value={item.metalAmount.toFixed(2)}
                        readOnly
                        className="bg-muted"
                        data-testid={`input-item-metal-amount-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Labour/gm (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.labourChargeRate || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "labourChargeRate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        data-testid={`input-item-labour-rate-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Labour Amount (₹)</Label>
                      <Input
                        type="number"
                        value={item.labourChargeAmount.toFixed(2)}
                        readOnly
                        className="bg-muted"
                        data-testid={`input-item-labour-amount-${index}`}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Item Total:</span>
                      <span
                        className="text-lg font-bold"
                        data-testid={`text-item-amount-${index}`}
                      >
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal (Gross)
                  </span>
                  <span data-testid="text-subtotal">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    CGST ({totals.cgstRate}%)
                  </span>
                  <span data-testid="text-cgst">
                    {formatCurrency(totals.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    SGST ({totals.sgstRate}%)
                  </span>
                  <span data-testid="text-sgst">
                    {formatCurrency(totals.sgst)}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="discount" className="text-xs">
                    Discount (₹)
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={discount || ""}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="old-gold-weight" className="text-xs">
                    Old Gold Weight (g)
                  </Label>
                  <Input
                    id="old-gold-weight"
                    type="number"
                    step="0.001"
                    value={oldGoldWeight || ""}
                    onChange={(e) =>
                      setOldGoldWeight(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="old-gold-amount" className="text-xs">
                    Old Gold Amount (₹)
                  </Label>
                  <Input
                    id="old-gold-amount"
                    type="number"
                    step="0.01"
                    value={oldGoldAmount || ""}
                    onChange={(e) =>
                      setOldGoldAmount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Round Off</span>
                    <span>{formatCurrency(totals.roundOff)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Net Amount</span>
                  <span
                    className="text-xl text-primary"
                    data-testid="text-total"
                  >
                    {formatCurrency(totals.total)}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="cash-received" className="text-xs">
                    Cash Received (₹)
                  </Label>
                  <Input
                    id="cash-received"
                    type="number"
                    step="0.01"
                    value={cashReceived || ""}
                    onChange={(e) =>
                      setCashReceived(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span
                    className={
                      totals.balance > 0
                        ? "text-destructive font-bold"
                        : "text-green-600 font-bold"
                    }
                  >
                    {formatCurrency(totals.balance)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSaveInvoice}
                className="w-full"
                disabled={createInvoice.isPending}
                data-testid="button-save-invoice"
              >
                <Save className="mr-2 h-4 w-4" />
                {createInvoice.isPending ? "Saving..." : "Save Invoice"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                value={newCustomerForm.name}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone *</Label>
              <Input
                id="new-phone"
                value={newCustomerForm.phone}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newCustomerForm.address}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    address: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-gst">GST Number</Label>
              <Input
                id="new-gst"
                value={newCustomerForm.gstNumber}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    gstNumber: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddCustomer}
              disabled={createCustomer.isPending}
            >
              {createCustomer.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
