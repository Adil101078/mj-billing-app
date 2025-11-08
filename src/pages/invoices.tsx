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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

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

    // Use actual CGST and SGST values from invoice
    const cgstAmount = invoice.cgstAmount || 0;
    const sgstAmount = invoice.sgstAmount || 0;
    const cgstRate = invoice.cgstRate || 0;
    const sgstRate = invoice.sgstRate || 0;

    // Format date as DD/MM/YYYY
    const formatDate = (date: Date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format currency helper
    const formatCurrency = (amount: number) => {
      return amount.toFixed(2);
    };

    // Convert number to words (Indian format)
    const numberToWords = (num: number): string => {
      if (num === 0) return "Zero";

      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];

      const convertHundreds = (n: number): string => {
        if (n === 0) return "";
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100)
          return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        return (
          ones[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 ? " " + convertHundreds(n % 100) : "")
        );
      };

      const crore = Math.floor(num / 10000000);
      const lakh = Math.floor((num % 10000000) / 100000);
      const thousand = Math.floor((num % 100000) / 1000);
      const remainder = Math.floor(num % 1000);

      let words = "";
      if (crore > 0) words += convertHundreds(crore) + " Crore ";
      if (lakh > 0) words += convertHundreds(lakh) + " Lakh ";
      if (thousand > 0) words += convertHundreds(thousand) + " Thousand ";
      if (remainder > 0) words += convertHundreds(remainder);

      return words.trim() + " ONLY";
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        /* Define the Gold Color for Branding */
        :root {
          --brand-gold: #B8860B;
          --brand-dark: #000;
        }

        @page {
          size: A5 portrait;
          margin: 0.5cm;
        }

        body {
          font-family: 'Arial', sans-serif;
          font-size: 10px;
          margin: 0 auto;
          max-width: 550px;
          padding: 15px;
          box-sizing: border-box;
          line-height: 1.3;
          color: var(--brand-dark);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .container {
          width: 100%;
          border: 1px solid var(--brand-dark);
          padding: 10px;
          box-sizing: border-box;
          position: relative;
        }

        .paid-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-25deg);
          font-size: 80px;
          font-weight: bold;
          color: rgba(0, 200, 0, 0.1);
          letter-spacing: 10px;
          pointer-events: none;
          z-index: 0;
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
        }

        /* Header Section Styling */
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 2px solid var(--brand-dark);
          padding-bottom: 5px;
          margin-bottom: 5px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 5px;
        }

        .header-top .left, .header-top .right {
          font-size: 11px;
          font-weight: bold;
        }

        .header-middle {
          display: flex;
          align-items: center;
          width: 100%;
          justify-content: center;
          margin-bottom: 5px;
        }

        .header-logo {
          width: 80px;
          height: 80px;
          margin-right: 15px;
        }

        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 5px;
        }

        .header-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          line-height: 1;
          color: var(--brand-gold);
        }

        .header-address {
          font-size: 12px;
          margin: 0;
          font-weight: bold;
          border-bottom: 1px solid var(--brand-dark);
          padding-bottom: 2px;
          width: 100%;
          text-align: center;
          color: var(--brand-dark);
        }

        .header-slogan {
          font-size: 10px;
          margin: 2px 0 0 0;
          font-style: italic;
          text-align: center;
        }

        /* Details Section Styling */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .details-row {
          display: flex;
          margin-bottom: 2px;
          padding-bottom: 2px;
          border-bottom: 1px dashed #ccc;
          gap: 5px;
        }

        .details-row span:first-child {
          min-width: 100px;
          flex-shrink: 0;
        }

        .details-row span:last-child {
          flex: 1;
          text-align: left;
        }

        /* Item Table Styling */
        .item-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
          table-layout: fixed;
        }

        .item-table th, .item-table td {
          border: 1px solid var(--brand-dark);
          padding: 3px;
          text-align: center;
          font-size: 9px;
          vertical-align: top;
          word-wrap: break-word;
        }

        .item-table th {
          font-weight: bold;
          background-color: var(--brand-gold);
          color: white;
        }

        .item-table td.description {
          text-align: left;
          padding-left: 5px;
        }

        .item-table .lab-charge-row td {
          border: 1px solid var(--brand-dark);
          border-top: none;
          text-align: left;
          padding-left: 10px;
        }

        .item-table .lab-charge-row td:last-child {
          text-align: right;
          padding-right: 5px;
        }

        .item-table colgroup col:nth-child(1) { width: 28%; }
        .item-table colgroup col:nth-child(2) { width: 8%; }
        .item-table colgroup col:nth-child(3) { width: 5%; }
        .item-table colgroup col:nth-child(4) { width: 12%; }
        .item-table colgroup col:nth-child(5) { width: 10%; }
        .item-table colgroup col:nth-child(6) { width: 17%; }
        .item-table colgroup col:nth-child(7) { width: 20%; }

        /* Summary Section Styling */
        .summary-section {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          font-size: 10px;
          width: 100%;
        }

        .summary-left, .summary-right {
          width: 49%;
        }

        .summary-left table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
        }

        .summary-left table td {
          border: none;
          padding: 1px 0;
          font-size: 10px;
        }

        .summary-right .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 10px;
        }

        .summary-right .total-line.grand-total {
          font-weight: bold;
          font-size: 12px;
          border-top: 1px solid var(--brand-gold);
          padding-top: 3px;
          margin-top: 5px;
          color: var(--brand-dark);
        }

        /* Tax Breakdown Styling */
        .tax-breakdown-table {
          width: 55%;
          margin-top: 10px;
          margin-bottom: 10px;
        }

        .tax-breakdown-table th, .tax-breakdown-table td {
          border: 1px solid var(--brand-dark);
          padding: 3px;
          text-align: center;
          font-size: 9px;
        }

        .tax-breakdown-table th {
          background-color: var(--brand-gold);
          color: white;
        }

        /* Footer Styling */
        .footer-note {
          text-align: center;
          font-size: 10px;
          border-top: 1px solid var(--brand-dark);
          padding-top: 5px;
          margin-top: 10px;
        }

        .item-table .empty-row td {
          height: 25px;
          border: 1px solid var(--brand-dark);
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${
          invoice.status === "paid"
            ? '<div class="paid-watermark">MJ</div>'
            : ""
        }
        <div class="content-wrapper">
        <div class="header">
          <div class="header-top">
            <span class="left">Pro. ${settings.shopName} </span>
            <span class="right">Phone: ${settings.phone}</span>
          </div>
          <div class="header-middle">
            ${
              settings.logo
                ? `<div class="header-logo"><img src="${settings.logo}" alt="Shop Logo"></div>`
                : ""
            }
            <h1 class="header-title">${settings.shopName}</h1>
          </div>
          <p class="header-address">${settings.address}</p>
          <p class="header-slogan">सोने-चांदी के फैंसी हॉलमार्क आभूषणों के विक्रेता</p>
          <p class="header-slogan">हमारे यहाँ बंधक का काम नहीं होता है।</p>
        </div>

        <div class="details-grid">
          <div>
            <div class="details-row">
              <span>Customer Name</span>
              <span>: ${invoice.customerName || "N/A"}</span>
            </div>
            <div class="details-row">
              <span>Phone No</span>
              <span>: ${invoice.customerPhone || ""}</span>
            </div>
          </div>
          <div>
            <div class="details-row">
              <span>Date</span>
              <span>: ${formatDate(invoice.invoiceDate)}</span>
            </div>
            <div class="details-row">
              <span>Bill No</span>
              <span>: ${invoice.invoiceNumber}</span>
            </div>
          </div>
        </div>

        <table class="item-table">
          <colgroup>
            <col><col><col><col><col><col><col>
          </colgroup>
          <thead>
            <tr>
              <th>Sno Item Description</th>
              <th>HSN</th>
              <th>Pcs</th>
              <th>G.Wt.</th>
              <th>Less</th>
              <th>NetWt. Rate/10gm</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item: any, index: number) => `
            <tr class="item-row">
              <td class="description">${index + 1}. ${item.description}</td>
              <td>${item.hsnCode || ""}</td>
              <td>${item.pcs || 1}</td>
              <td>${item.grossWeight ? item.grossWeight.toFixed(3) : ""}</td>
              <td>${item.lessWeight ? item.lessWeight.toFixed(3) : ""}</td>
              <td>${item.netWeight ? item.netWeight.toFixed(3) : ""} ${
                  item.ratePerTenGram ? formatCurrency(item.ratePerTenGram) : ""
                }</td>
              <td>${formatCurrency(item.amount)}</td>
            </tr>
            ${
              item.labourChargeAmount > 0
                ? `
            <tr class="lab-charge-row">
              <td colspan="6">Lab.Ch. ${item.labourChargeRate.toFixed(
                2
              )}/gm</td>
              <td style="text-align: right;">${formatCurrency(
                item.labourChargeAmount
              )}</td>
            </tr>
            `
                : ""
            }
            `
              )
              .join("")}
            ${
              invoice.items.length < 3
                ? Array.from(
                    { length: 3 - invoice.items.length },
                    () => `
            <tr class="empty-row">
              <td colspan="7">&nbsp;</td>
            </tr>
            `
                  ).join("")
                : ""
            }
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-left">
            <p>Rs. ${numberToWords(invoice.total)}</p>
            <table>
              <tr>
                <td>GST @ ${formatCurrency(invoice.taxRate)}%</td>
                <td>${formatCurrency(invoice.taxAmount)}</td>
              </tr>
              <tr>
                <td>Less old gold(${
                  invoice.oldGoldWeight
                    ? invoice.oldGoldWeight.toFixed(3)
                    : "0.000"
                })</td>
                <td>${formatCurrency(invoice.oldGoldAmount || 0)}</td>
              </tr>
              ${
                invoice.roundOff
                  ? `
              <tr>
                <td>Rnd.</td>
                <td>${formatCurrency(invoice.roundOff)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          <div class="summary-right">
            <div class="total-line">
              <span>Gross</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${
              invoice.discount > 0
                ? `
            <div class="total-line">
              <span>Discount</span>
              <span>-${formatCurrency(invoice.discount)}</span>
            </div>
            `
                : ""
            }
            <div class="total-line">
              <span>Net Amt</span>
              <span>${formatCurrency(invoice.total)}</span>
            </div>
            <div class="total-line">
              <span>Received</span>
              <span>${formatCurrency(invoice.cashReceived || 0)}</span>
            </div>
            <div class="total-line grand-total">
              <span>Balance</span>
              <span>${formatCurrency(invoice.balanceAmount || 0)}</span>
            </div>
          </div>
        </div>

        <table class="tax-breakdown-table">
          <thead>
            <tr>
              <th>Taxable(Rs)</th>
              <th>CGST(${formatCurrency(cgstRate)}%)</th>
              <th>SGST(${formatCurrency(sgstRate)}%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatCurrency(invoice.subtotal)}</td>
              <td>${formatCurrency(cgstAmount)}</td>
              <td>${formatCurrency(sgstAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-note">
          <p>${invoice.notes || "नोट - टूटने-फूटने की कोई गारंटी नहीं है।"}</p>
        </div>
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

  const handleDeleteClick = (id: string) => {
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice.mutateAsync(invoiceToDelete);
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
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
                            onClick={() => handleDeleteClick(invoice._id)}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left py-2 px-2">Description</th>
                        <th className="text-center py-2 px-2">HSN</th>
                        <th className="text-center py-2 px-2">Pcs</th>
                        <th className="text-right py-2 px-2">G.Wt.</th>
                        <th className="text-right py-2 px-2">Less</th>
                        <th className="text-right py-2 px-2">Net Wt.</th>
                        <th className="text-right py-2 px-2">Rate/10gm</th>
                        <th className="text-right py-2 px-2">Metal Amt</th>
                        <th className="text-right py-2 px-2">Labour</th>
                        <th className="text-right py-2 px-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-border">
                          <td className="py-2 px-2">
                            {item.description}
                            {item.itemType && (
                              <span className="text-muted-foreground ml-1">
                                ({item.itemType})
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 px-2 text-muted-foreground">
                            {item.hsnCode || "-"}
                          </td>
                          <td className="text-center py-2 px-2">
                            {item.pcs || 1}
                          </td>
                          <td className="text-right py-2 px-2">
                            {item.grossWeight
                              ? item.grossWeight.toFixed(3)
                              : "-"}
                          </td>
                          <td className="text-right py-2 px-2 text-muted-foreground">
                            {item.lessWeight ? item.lessWeight.toFixed(3) : "-"}
                          </td>
                          <td className="text-right py-2 px-2 font-medium">
                            {item.netWeight ? item.netWeight.toFixed(3) : "-"}
                          </td>
                          <td className="text-right py-2 px-2">
                            {formatCurrency(item.ratePerTenGram || 0)}
                          </td>
                          <td className="text-right py-2 px-2">
                            {formatCurrency(item.metalAmount || 0)}
                          </td>
                          <td className="text-right py-2 px-2 text-muted-foreground">
                            {item.labourChargeAmount > 0
                              ? formatCurrency(item.labourChargeAmount)
                              : "-"}
                          </td>
                          <td className="text-right py-2 px-2 font-bold">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold mb-2">
                      Tax Breakdown
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span>CGST ({selectedInvoice.cgstRate || 0}%):</span>
                      <span>
                        {formatCurrency(selectedInvoice.cgstAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST ({selectedInvoice.sgstRate || 0}%):</span>
                      <span>
                        {formatCurrency(selectedInvoice.sgstAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t pt-2">
                      <span>Total Tax:</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>

                    {(selectedInvoice.oldGoldWeight > 0 ||
                      selectedInvoice.oldGoldAmount > 0) && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Old Gold Exchange
                        </h4>
                        <div className="flex justify-between text-sm">
                          <span>Weight:</span>
                          <span>
                            {selectedInvoice.oldGoldWeight?.toFixed(3) || 0} g
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Amount:</span>
                          <span>
                            -
                            {formatCurrency(selectedInvoice.oldGoldAmount || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold mb-2">Summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal (Gross):</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax ({selectedInvoice.taxRate}%):</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedInvoice.discount)}</span>
                      </div>
                    )}
                    {selectedInvoice.oldGoldAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Less Old Gold:</span>
                        <span>
                          -{formatCurrency(selectedInvoice.oldGoldAmount)}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.roundOff && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Round Off:</span>
                        <span>{formatCurrency(selectedInvoice.roundOff)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                      <span>Net Amount:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span>Cash Received:</span>
                      <span className="text-green-600">
                        {formatCurrency(selectedInvoice.cashReceived || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Balance:</span>
                      <span
                        className={
                          selectedInvoice.balanceAmount > 0
                            ? "text-destructive"
                            : "text-green-600"
                        }
                      >
                        {formatCurrency(selectedInvoice.balanceAmount || 0)}
                      </span>
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
