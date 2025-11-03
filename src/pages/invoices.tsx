import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useInvoices,
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useSettings,
} from "@/lib/hooks";

export default function Invoices() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    search: searchQuery,
  });
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();

  const invoices = invoicesData?.invoices || [];
  const selectedInvoice = selectedInvoiceId
    ? invoices.find((inv: any) => inv._id === selectedInvoiceId)
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoiceId(invoice._id);
    setShowDialog(true);
  };

  const handlePrintInvoice = (invoice: any) => {
    if (!settings) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            gap: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header img {
            width: 80px;
            height: 80px;
            object-fit: contain;
          }
          .header-info h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
          }
          .details h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
          }
          .details p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            text-align: left;
            padding: 10px;
            border-bottom: 2px solid #000;
            font-size: 14px;
          }
          th.right, td.right {
            text-align: right;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
          }
          .totals {
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .totals-row.total {
            border-top: 2px solid #000;
            font-weight: bold;
            font-size: 18px;
            padding-top: 12px;
            margin-top: 8px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${
            settings.logo
              ? `<img src="${settings.logo}" alt="${settings.shopName}" />`
              : ""
          }
          <div class="header-info">
            <h1>${settings.shopName}</h1>
            <p>${settings.address}</p>
            <p>Phone: ${settings.phone}</p>
            <p>Email: ${settings.email}</p>
            ${settings.gstNumber ? `<p>GST: ${settings.gstNumber}</p>` : ""}
          </div>
        </div>

        <div class="details">
          <div>
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(
              invoice.invoiceDate
            ).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </div>
          <div>
            <h3>Customer Details</h3>
            <p><strong>${invoice.customerIdId?.name || "N/A"}</strong></p>
            ${
              invoice.customerIdId?.phone
                ? `<p>Phone: ${invoice.customerIdId.phone}</p>`
                : ""
            }
            ${
              invoice.customerIdId?.email
                ? `<p>Email: ${invoice.customerIdId.email}</p>`
                : ""
            }
            ${
              invoice.customerIdId?.address?.street
                ? `<p>Address: ${invoice.customerIdId.address.street}</p>`
                : ""
            }
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="right">Quantity</th>
              <th class="right">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item: any) => `
              <tr>
                <td>${item.description}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${formatCurrency(item.rate)}</td>
                <td class="right">${formatCurrency(item.amount)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>Tax (${invoice.taxRate}%):</span>
            <span>${formatCurrency(invoice.taxAmount)}</span>
          </div>
          ${
            invoice.discount > 0
              ? `
            <div class="totals-row">
              <span>Discount:</span>
              <span>-${formatCurrency(invoice.discount)}</span>
            </div>
          `
              : ""
          }
          <div class="totals-row total">
            <span>Total:</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      await deleteInvoice.mutateAsync(id);
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (invoice: any) => {
    try {
      await updateStatus.mutateAsync({
        id: invoice._id,
        status: invoice.status === "paid" ? "unpaid" : "paid",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          View and manage all your invoices
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-invoices"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase">
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase">
                      Items
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: any) => (
                    <tr
                      key={invoice._id}
                      className="border-b border-border hover-elevate"
                      data-testid={`invoice-row-${invoice._id}`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {invoice.customerId?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {invoice.items.length}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            invoice.status === "paid" ? "default" : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleStatus(invoice)}
                          data-testid={`badge-status-${invoice._id}`}
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice)}
                            data-testid={`button-view-${invoice._id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintInvoice(invoice)}
                            data-testid={`button-print-${invoice._id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice._id)}
                            data-testid={`button-delete-${invoice._id}`}
                            disabled={deleteInvoice.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && !settingsLoading && settings && (
            <div className="space-y-6 print:p-8">
              <div className="border-b border-border pb-4 print:border-black">
                <div className="flex items-start gap-4">
                  {settings.logo && (
                    <img
                      src={settings.logo}
                      alt={settings.shopName}
                      className="h-20 w-20 object-contain print:h-16 print:w-16"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="font-serif text-2xl font-bold print:text-3xl">
                      {settings.shopName}
                    </h2>
                    <p className="text-sm text-muted-foreground print:text-black">
                      {settings.address}
                    </p>
                    <p className="text-sm text-muted-foreground print:text-black">
                      Phone: {settings.phone}
                    </p>
                    <p className="text-sm text-muted-foreground print:text-black">
                      Email: {settings.email}
                    </p>
                    {settings.gstNumber && (
                      <p className="text-sm text-muted-foreground print:text-black">
                        GST: {settings.gstNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Invoice Details
                  </h3>
                  <p className="text-sm">
                    <strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Date:</strong>{" "}
                    {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong> {selectedInvoice.status}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Customer Details
                  </h3>
                  <p className="text-sm font-medium">
                    {selectedInvoice.customerId?.name || "N/A"}
                  </p>
                  {selectedInvoice.customerId?.phone && (
                    <p className="text-sm">
                      Phone: {selectedInvoice.customerId.phone}
                    </p>
                  )}
                  {selectedInvoice.customerId?.email && (
                    <p className="text-sm">
                      Email: {selectedInvoice.customerId.email}
                    </p>
                  )}
                  {selectedInvoice.customerId?.address?.street && (
                    <p className="text-sm">
                      Address: {selectedInvoice.customerId.address.street}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Items</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="text-right py-2">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax ({selectedInvoice.taxRate}%):</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {selectedInvoice && settingsLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Loading invoice details...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
