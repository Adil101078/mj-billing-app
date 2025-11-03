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
import { Plus, Trash2, Save, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useCustomers, useCreateCustomer, useCreateInvoice, useSettings } from "@/lib/hooks";

interface InvoiceItem {
  id: string;
  name: string;
  type: string;
  weight: number;
  ratePerTenGram: number;
  makingCharge: number;
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
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      name: '',
      type: '',
      weight: 0,
      ratePerTenGram: 0,
      makingCharge: 0,
      amount: 0,
    }
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
    setItems([...items, {
      id: Date.now().toString(),
      name: '',
      type: '',
      weight: 0,
      ratePerTenGram: 0,
      makingCharge: 0,
      amount: 0,
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        if (field === 'type') {
          const productType = productTypes.find((pt: any) => pt.name === value);
          if (productType) {
            updated.ratePerTenGram = productType.ratePerTenGram;
          }
        }

        const weightInTenGrams = updated.weight / 10;
        const metalCost = weightInTenGrams * updated.ratePerTenGram;
        updated.amount = metalCost + updated.makingCharge;

        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const cgstRate = settings?.cgstRate || 0;
    const sgstRate = settings?.sgstRate || 0;
    const cgst = (subtotal * cgstRate) / 100;
    const sgst = (subtotal * sgstRate) / 100;
    const total = subtotal + cgst + sgst;
    return { subtotal, cgst, sgst, total, cgstRate, sgstRate };
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
      setNewCustomerForm({ name: "", phone: "", email: "", address: "", gstNumber: "" });

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

    const hasEmptyItems = items.some(item => !item.name || !item.type || item.weight <= 0);
    if (hasEmptyItems) {
      toast({
        title: "Error",
        description: "Please fill in all item details",
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
        items: items.map(item => ({
          description: item.name,
          quantity: item.weight,
          rate: item.ratePerTenGram,
          amount: item.amount,
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.cgst + totals.sgst,
        taxRate: totals.cgstRate + totals.sgstRate,
        discount: 0,
        total: totals.total,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
      });

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      setLocation('/invoices');
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
        <p className="text-muted-foreground">Generate a new invoice for your customer</p>
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
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger id="customer" data-testid="select-customer">
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
                  <Input
                    id="date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    data-testid="input-invoice-date"
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Item Name *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="e.g., Gold Ring, Silver Necklace"
                        data-testid={`input-item-name-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value) => updateItem(item.id, 'type', value)}
                      >
                        <SelectTrigger data-testid={`select-item-type-${index}`}>
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
                      <Label>Weight (grams) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.weight || ''}
                        onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                        data-testid={`input-item-weight-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rate per 10gm</Label>
                      <Input
                        type="number"
                        value={item.ratePerTenGram || ''}
                        onChange={(e) => updateItem(item.id, 'ratePerTenGram', parseFloat(e.target.value) || 0)}
                        data-testid={`input-item-rate-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Making Charge (₹)</Label>
                      <Input
                        type="number"
                        value={item.makingCharge || ''}
                        onChange={(e) => updateItem(item.id, 'makingCharge', parseFloat(e.target.value) || 0)}
                        data-testid={`input-item-making-charge-${index}`}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Item Total:</span>
                      <span className="text-lg font-bold" data-testid={`text-item-amount-${index}`}>
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST ({totals.cgstRate}%)</span>
                  <span data-testid="text-cgst">{formatCurrency(totals.cgst)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST ({totals.sgstRate}%)</span>
                  <span data-testid="text-sgst">{formatCurrency(totals.sgst)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-bold text-primary" data-testid="text-total">
                    {formatCurrency(totals.total)}
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
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone *</Label>
              <Input
                id="new-phone"
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newCustomerForm.address}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-gst">GST Number</Label>
              <Input
                id="new-gst"
                value={newCustomerForm.gstNumber}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddCustomer} disabled={createCustomer.isPending}>
              {createCustomer.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
