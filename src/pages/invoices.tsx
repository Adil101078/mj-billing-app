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
import {
  Search,
  Eye,
  Printer,
  Trash2,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useInvoices,
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useUpdateCashReceived,
  useSettings,
} from "@/lib/hooks";

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

export default function Invoices() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [editingCashReceived, setEditingCashReceived] = useState(false);
  const [cashReceivedInput, setCashReceivedInput] = useState("");

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    search: searchQuery,
  });
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const updateCashReceived = useUpdateCashReceived();

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

  const handleEditCashReceived = () => {
    if (selectedInvoice) {
      setCashReceivedInput(""); // Start with empty to add new amount
      setEditingCashReceived(true);
    }
  };

  const handleSaveCashReceived = async () => {
    if (!selectedInvoiceId) return;

    const amount = parseFloat(cashReceivedInput);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCashReceived.mutateAsync({
        id: selectedInvoiceId,
        cashReceived: amount,
      });
      toast({
        title: "Success",
        description: "Cash received updated successfully",
      });
      setEditingCashReceived(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update cash received",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCashReceived(false);
    setCashReceivedInput("");
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

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) handleCancelEdit();
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          {selectedInvoice ? (
            <InvoiceDetails
              invoice={selectedInvoice}
              settings={settings}
              settingsLoading={settingsLoading}
              formatCurrency={formatCurrency}
              onPrint={() => handlePrintInvoice(selectedInvoice)}
              payment={{
                editing: editingCashReceived,
                value: cashReceivedInput,
                setValue: setCashReceivedInput,
                start: handleEditCashReceived,
                save: handleSaveCashReceived,
                cancel: handleCancelEdit,
                saving: updateCashReceived.isPending,
              }}
            />
          ) : (
            <DialogHeader className="p-6">
              <DialogTitle>Invoice</DialogTitle>
              <DialogDescription>This invoice is no longer in the list.</DialogDescription>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Invoice details dialog body ---------- */

const formatLongDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const weight = (n?: number) => (n ? n.toFixed(3) : "—");

type PaymentControls = {
  editing: boolean;
  value: string;
  setValue: (v: string) => void;
  start: () => void;
  save: () => void;
  cancel: () => void;
  saving: boolean;
};

function InvoiceStatusPill({ invoice, formatCurrency }: { invoice: any; formatCurrency: (n: number) => string }) {
  const balance = invoice.balanceAmount || 0;
  if (invoice.status === "cancelled") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Cancelled
      </span>
    );
  }
  if (invoice.status === "paid" || balance <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      <AlertCircle className="h-3.5 w-3.5" />
      {formatCurrency(balance)} due
    </span>
  );
}

function SummaryLine({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function InvoiceDetails({
  invoice,
  settings,
  settingsLoading,
  formatCurrency,
  onPrint,
  payment,
}: {
  invoice: any;
  settings: any;
  settingsLoading: boolean;
  formatCurrency: (n: number) => string;
  onPrint: () => void;
  payment: PaymentControls;
}) {
  const customer = invoice.customerId || {};
  const customerName = customer.name || invoice.customerName || "Walk-in customer";
  const customerAddress = [customer.address?.street, customer.address?.city, customer.address?.state]
    .filter(Boolean)
    .join(", ");

  const items: any[] = invoice.items || [];
  const totals = items.reduce(
    (acc, item) => ({
      pcs: acc.pcs + (item.pcs || 1),
      gross: acc.gross + (item.grossWeight || 0),
      net: acc.net + (item.netWeight || 0),
    }),
    { pcs: 0, gross: 0, net: 0 }
  );

  const total = invoice.total || 0;
  const received = invoice.cashReceived || 0;
  const balance = invoice.balanceAmount || 0;
  const paidShare = total > 0 ? Math.min(100, Math.max(0, Math.round((received / total) * 100))) : 0;
  const isCancelled = invoice.status === "cancelled";
  const roundOff = invoice.roundOff || 0;

  const shopContact = settings
    ? [settings.phone && `Phone ${settings.phone}`, settings.email].filter(Boolean)
    : [];

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-4 pr-12 sm:px-6 sm:pr-14">
        <DialogHeader className="min-w-0 flex-1 space-y-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="truncate text-lg sm:text-xl">
              {invoice.invoiceNumber}
            </DialogTitle>
            <InvoiceStatusPill invoice={invoice} formatCurrency={formatCurrency} />
          </div>
          <DialogDescription>
            {customerName}, {formatLongDate(invoice.invoiceDate)}
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" size="sm" onClick={onPrint} disabled={!settings}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-muted/30 p-3 sm:p-6">
        {settingsLoading || !settings ? (
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <article className="overflow-hidden rounded-xl border border-t-4 border-t-primary bg-card shadow-sm">
            {/* Shop and invoice meta */}
            <header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-start gap-3">
                {settings.logo && (
                  <img
                    src={settings.logo}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md border object-contain"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="font-serif text-xl font-bold sm:text-2xl">{settings.shopName}</h2>
                  {settings.address && (
                    <p className="text-sm text-muted-foreground">{settings.address}</p>
                  )}
                  {shopContact.length > 0 && (
                    <p className="text-sm text-muted-foreground">{shopContact.join("  |  ")}</p>
                  )}
                  {settings.gstNumber && (
                    <p className="text-sm text-muted-foreground">
                      GSTIN <span className="font-medium text-foreground">{settings.gstNumber}</span>
                    </p>
                  )}
                </div>
              </div>
              <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
                <dt className="text-muted-foreground sm:col-span-2">Tax invoice</dt>
                <dd className="font-semibold tabular-nums sm:col-span-2">{invoice.invoiceNumber}</dd>
                <dt className="mt-2 text-muted-foreground sm:col-span-2">Date</dt>
                <dd className="mt-2 font-medium sm:col-span-2 sm:mt-0">{formatLongDate(invoice.invoiceDate)}</dd>
              </dl>
            </header>

            {/* Customer and payment */}
            <section className="grid gap-px border-y bg-border sm:grid-cols-2">
              <div className="bg-card p-4 sm:p-6">
                <h3 className="text-sm text-muted-foreground">Billed to</h3>
                <p className="mt-1 font-semibold">{customerName}</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {customer.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {customer.phone}
                    </p>
                  )}
                  {customer.email && (
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </p>
                  )}
                  {customerAddress && (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {customerAddress}
                    </p>
                  )}
                  {customer.gstNumber && <p>GSTIN {customer.gstNumber}</p>}
                </div>
              </div>

              <div className="bg-card p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm text-muted-foreground">Payment</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">{paidShare}% paid</span>
                </div>
                <p className="mt-1 text-sm">
                  <span className="font-semibold tabular-nums">{formatCurrency(received)}</span>
                  <span className="text-muted-foreground"> received of {formatCurrency(total)}</span>
                </p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Share of invoice paid"
                  aria-valuenow={paidShare}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      balance > 0 ? "bg-primary" : "bg-green-600"
                    )}
                    style={{ width: `${paidShare}%` }}
                  />
                </div>

                {payment.editing ? (
                  <form
                    className="mt-4 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      payment.save();
                    }}
                  >
                    <label htmlFor="payment-amount" className="text-sm font-medium">
                      Amount received now
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative min-w-[140px] flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="payment-amount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={payment.value}
                          onChange={(e) => payment.setValue(e.target.value)}
                          placeholder="0"
                          className="no-spinner pl-7 text-right tabular-nums"
                          autoFocus
                        />
                      </div>
                      {balance > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => payment.setValue(String(balance))}
                        >
                          Full balance
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is added to the {formatCurrency(received)} already received.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm" disabled={payment.saving || !payment.value}>
                        {payment.saving ? "Saving…" : "Record payment"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={payment.cancel}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Balance </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          balance > 0 ? "text-destructive" : "text-green-700 dark:text-green-400"
                        )}
                      >
                        {balance > 0 ? formatCurrency(balance) : "Nil"}
                      </span>
                    </div>
                    {!isCancelled && balance > 0 && (
                      <Button size="sm" variant="outline" onClick={payment.start}>
                        <Plus className="mr-1 h-4 w-4" />
                        Record payment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Items */}
            <section>
              <h3 className="px-4 pb-2 pt-5 text-sm font-semibold sm:px-6">
                Items <span className="font-normal text-muted-foreground">({items.length})</span>
              </h3>

              {/* Phone: one card per item */}
              <ul className="divide-y border-y sm:hidden">
                {items.map((item, index) => (
                  <li key={index} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.description || `Item ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.itemType, item.hsnCode && `HSN ${item.hsnCode}`, `${item.pcs || 1} pc`]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(item.amount || 0)}
                      </span>
                    </div>
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs tabular-nums">
                      <div>
                        <dt className="text-muted-foreground">Gross</dt>
                        <dd>{weight(item.grossWeight)} g</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Less</dt>
                        <dd>{weight(item.lessWeight)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Net</dt>
                        <dd className="font-medium">{weight(item.netWeight)} g</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Rate / 10g</dt>
                        <dd>{formatCurrency(item.ratePerTenGram || 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Metal</dt>
                        <dd>{formatCurrency(item.metalAmount || 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Labour</dt>
                        <dd>{item.labourChargeAmount > 0 ? formatCurrency(item.labourChargeAmount) : "—"}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              {/* Tablet and up: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[720px] border-collapse text-sm tabular-nums">
                  <thead>
                    <tr className="border-y bg-muted/50 text-xs text-muted-foreground">
                      <th className="py-2.5 pl-6 pr-2 text-left font-medium">Item</th>
                      <th className="px-2 py-2.5 text-left font-medium">HSN</th>
                      <th className="px-2 py-2.5 text-right font-medium">Pcs</th>
                      <th className="px-2 py-2.5 text-right font-medium">Gross (g)</th>
                      <th className="px-2 py-2.5 text-right font-medium">Less (g)</th>
                      <th className="px-2 py-2.5 text-right font-medium">Net (g)</th>
                      <th className="px-2 py-2.5 text-right font-medium">Rate / 10g</th>
                      <th className="px-2 py-2.5 text-right font-medium">Metal</th>
                      <th className="px-2 py-2.5 text-right font-medium">Labour</th>
                      <th className="py-2.5 pl-2 pr-6 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 pl-6 pr-2">
                          <p className="font-medium">{item.description || `Item ${index + 1}`}</p>
                          {item.itemType && (
                            <p className="text-xs text-muted-foreground">{item.itemType}</p>
                          )}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">{item.hsnCode || "—"}</td>
                        <td className="px-2 py-3 text-right">{item.pcs || 1}</td>
                        <td className="px-2 py-3 text-right">{weight(item.grossWeight)}</td>
                        <td className="px-2 py-3 text-right text-muted-foreground">{weight(item.lessWeight)}</td>
                        <td className="px-2 py-3 text-right font-medium">{weight(item.netWeight)}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(item.ratePerTenGram || 0)}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(item.metalAmount || 0)}</td>
                        <td className="px-2 py-3 text-right text-muted-foreground">
                          {item.labourChargeAmount > 0 ? formatCurrency(item.labourChargeAmount) : "—"}
                        </td>
                        <td className="py-3 pl-2 pr-6 text-right font-semibold">
                          {formatCurrency(item.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {items.length > 1 && (
                    <tfoot>
                      <tr className="bg-muted/40 font-semibold">
                        <td colSpan={2} className="py-2.5 pl-6 pr-2 text-muted-foreground">Total</td>
                        <td className="px-2 py-2.5 text-right">{totals.pcs}</td>
                        <td className="px-2 py-2.5 text-right">{totals.gross.toFixed(3)}</td>
                        <td />
                        <td className="px-2 py-2.5 text-right">{totals.net.toFixed(3)}</td>
                        <td colSpan={3} />
                        <td className="py-2.5 pl-2 pr-6 text-right">{formatCurrency(invoice.subtotal || 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Totals */}
            <section className="grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
              <div className="order-2 space-y-4 text-sm md:order-1">
                <div>
                  <h3 className="text-muted-foreground">Amount in words</h3>
                  <p className="mt-1 font-medium">Rupees {numberToWords(Math.round(total))}</p>
                </div>
                {(invoice.oldGoldWeight > 0 || invoice.oldGoldAmount > 0) && (
                  <div>
                    <h3 className="text-muted-foreground">Old gold exchange</h3>
                    <p className="mt-1">
                      {invoice.oldGoldWeight > 0 && (
                        <span className="tabular-nums">{invoice.oldGoldWeight.toFixed(3)} g, </span>
                      )}
                      valued at{" "}
                      <span className="font-medium tabular-nums">
                        {formatCurrency(invoice.oldGoldAmount || 0)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="order-1 space-y-2 text-sm md:order-2">
                <SummaryLine label="Subtotal" value={formatCurrency(invoice.subtotal || 0)} />
                <SummaryLine
                  label={`CGST (${invoice.cgstRate || 0}%)`}
                  value={formatCurrency(invoice.cgstAmount || 0)}
                />
                <SummaryLine
                  label={`SGST (${invoice.sgstRate || 0}%)`}
                  value={formatCurrency(invoice.sgstAmount || 0)}
                />
                {invoice.discount > 0 && (
                  <SummaryLine label="Discount" value={`− ${formatCurrency(invoice.discount)}`} />
                )}
                {invoice.oldGoldAmount > 0 && (
                  <SummaryLine label="Old gold" value={`− ${formatCurrency(invoice.oldGoldAmount)}`} />
                )}
                {Math.abs(roundOff) >= 0.01 && (
                  <SummaryLine
                    label="Round off"
                    value={`${roundOff > 0 ? "+" : "−"} ${Math.abs(roundOff).toFixed(2)}`}
                  />
                )}
                <div className="!mt-3 flex items-baseline justify-between gap-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                  <span className="font-medium">Net amount</span>
                  <span className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</span>
                </div>
                <SummaryLine label="Received" value={formatCurrency(received)} className="!mt-3" />
                <div className="flex items-center justify-between gap-4 border-t pt-2">
                  <span className="font-medium">Balance</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      balance > 0 ? "text-destructive" : "text-green-700 dark:text-green-400"
                    )}
                  >
                    {balance > 0 ? formatCurrency(balance) : "Nil"}
                  </span>
                </div>
              </div>
            </section>
          </article>
        )}
      </div>
    </>
  );
}
