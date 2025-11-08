import { Request, Response } from "express";
import Invoice from "../models/Invoice";
import Customer from "../models/Customer";

// Get all invoices
export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj: any = { [sortBy as string]: sortOrder };

    const invoices = await Invoice.find(query)
      .sort(sortObj)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate("customerId", "name email phone");

    const total = await Invoice.countDocuments(query);

    // Get statistics
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    res.json({
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      stats,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices", error });
  }
};

// Get invoice by ID
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      "customerId"
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoice", error });
  }
};

// Get invoice by invoice number
export const getInvoiceByNumber = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findOne({
      invoiceNumber: req.params.invoiceNumber,
    }).populate("customerId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoice", error });
  }
};

// Create new invoice
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      items,
      cgstRate = 0,
      sgstRate = 0,
      discount = 0,
      oldGoldWeight = 0,
      oldGoldAmount = 0,
      cashReceived = 0,
      ...rest
    } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Calculate amounts for each item
    const processedItems = items.map((item: any) => {
      const netWeight = item.grossWeight - (item.lessWeight || 0);
      const metalAmount = (netWeight / 10) * item.ratePerTenGram;
      const labourChargeAmount = (item.labourChargeRate || 0) * netWeight;
      const amount = metalAmount + labourChargeAmount;

      return {
        ...item,
        netWeight,
        metalAmount,
        labourChargeAmount,
        amount,
      };
    });

    // Calculate subtotal (gross amount)
    const subtotal = processedItems.reduce((sum: number, item: any) => {
      return sum + item.amount;
    }, 0);

    // Calculate taxes
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const taxAmount = cgstAmount + sgstAmount;
    const taxRate = cgstRate + sgstRate;

    // Calculate total before old gold
    const totalBeforeOldGold = subtotal + taxAmount - discount;

    // Calculate final amounts
    const totalAfterOldGold = totalBeforeOldGold - oldGoldAmount;
    const roundOff = Math.round(totalAfterOldGold) - totalAfterOldGold;
    const total = Math.round(totalAfterOldGold);
    const balanceAmount = total - cashReceived;

    // Determine status based on balance
    const status = balanceAmount <= 0 ? "paid" : "unpaid";
    const paidAt = status === "paid" ? new Date() : undefined;

    // Create invoice
    const invoice = new Invoice({
      ...rest,
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      items: processedItems,
      subtotal,
      taxAmount,
      taxRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      discount,
      roundOff,
      oldGoldWeight,
      oldGoldAmount,
      cashReceived,
      balanceAmount,
      total,
      status,
      paidAt,
    });

    await invoice.save();

    res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ message: "Error creating invoice", error: error.message });
  }
};

// Update invoice
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const {
      items,
      cgstRate,
      sgstRate,
      discount,
      oldGoldWeight,
      oldGoldAmount,
      cashReceived,
      ...rest
    } = req.body;

    let updateData: any = { ...rest };

    // Recalculate if items are updated
    if (items) {
      // Get current invoice for default values
      const currentInvoice = await Invoice.findById(req.params.id);
      if (!currentInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Process items
      const processedItems = items.map((item: any) => {
        const netWeight = item.grossWeight - (item.lessWeight || 0);
        const metalAmount = (netWeight / 10) * item.ratePerTenGram;
        const labourChargeAmount = (item.labourChargeRate || 0) * netWeight;
        const amount = metalAmount + labourChargeAmount;

        return {
          ...item,
          netWeight,
          metalAmount,
          labourChargeAmount,
          amount,
        };
      });

      // Calculate subtotal
      const subtotal = processedItems.reduce((sum: number, item: any) => {
        return sum + item.amount;
      }, 0);

      // Use provided values or current values
      const cGstRate = cgstRate !== undefined ? cgstRate : currentInvoice.cgstRate;
      const sGstRate = sgstRate !== undefined ? sgstRate : currentInvoice.sgstRate;
      const disc = discount !== undefined ? discount : currentInvoice.discount;
      const oldGoldWt = oldGoldWeight !== undefined ? oldGoldWeight : currentInvoice.oldGoldWeight;
      const oldGoldAmt = oldGoldAmount !== undefined ? oldGoldAmount : currentInvoice.oldGoldAmount;
      const cashRcvd = cashReceived !== undefined ? cashReceived : currentInvoice.cashReceived;

      // Calculate taxes
      const cgstAmt = (subtotal * cGstRate) / 100;
      const sgstAmt = (subtotal * sGstRate) / 100;
      const taxAmt = cgstAmt + sgstAmt;
      const taxRt = cGstRate + sGstRate;

      // Calculate totals
      const totalBeforeOldGold = subtotal + taxAmt - disc;
      const totalAfterOldGold = totalBeforeOldGold - oldGoldAmt;
      const rndOff = Math.round(totalAfterOldGold) - totalAfterOldGold;
      const total = Math.round(totalAfterOldGold);
      const balanceAmt = total - cashRcvd;

      // Determine if status should be updated based on balance
      const status = balanceAmt <= 0 ? "paid" : "unpaid";
      const paidAt = status === "paid" && !currentInvoice.paidAt ? new Date() : currentInvoice.paidAt;

      updateData = {
        ...updateData,
        items: processedItems,
        subtotal,
        taxAmount: taxAmt,
        taxRate: taxRt,
        cgstRate: cGstRate,
        cgstAmount: cgstAmt,
        sgstRate: sGstRate,
        sgstAmount: sgstAmt,
        discount: disc,
        roundOff: rndOff,
        oldGoldWeight: oldGoldWt,
        oldGoldAmount: oldGoldAmt,
        cashReceived: cashRcvd,
        balanceAmount: balanceAmt,
        total,
        status,
        paidAt,
      };
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ message: "Error updating invoice", error: error.message });
  }
};

// Update invoice status
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!["draft", "unpaid", "paid", "cancelled", "overdue"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData: any = { status };

    // If marking as paid, set paidAt timestamp
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating invoice status", error });
  }
};

// Update cash received amount
export const updateCashReceived = async (req: Request, res: Response) => {
  try {
    const { cashReceived } = req.body;

    if (cashReceived === undefined || cashReceived === null) {
      return res.status(400).json({ message: "Cash received amount is required" });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Add to existing cash received (incremental)
    const currentCashReceived = invoice.cashReceived || 0;
    const additionalAmount = Number(cashReceived);
    invoice.cashReceived = currentCashReceived + additionalAmount;

    // Recalculate balance
    invoice.balanceAmount = invoice.total - invoice.cashReceived;

    // Auto-update status based on balance
    if (invoice.balanceAmount <= 0) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
    } else if (invoice.balanceAmount > 0 && invoice.status === "paid") {
      invoice.status = "unpaid";
    }

    await invoice.save();

    res.json({
      message: "Cash received updated successfully",
      invoice,
      additionalAmount,
      totalCashReceived: invoice.cashReceived,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating cash received", error });
  }
};

// Delete invoice
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting invoice", error });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: "paid" });
    const pendingInvoices = await Invoice.countDocuments({
      status: { $in: ["unpaid", "sent"] },
    });
    const overdueInvoices = await Invoice.countDocuments({ status: "overdue" });

    const revenueData = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue =
      revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    const pendingAmount = await Invoice.aggregate([
      { $match: { status: { $in: ["unpaid", "overdue"] } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    const totalPending = pendingAmount.length > 0 ? pendingAmount[0].total : 0;

    // Total cash received across all invoices
    const cashReceivedData = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalCashReceived: { $sum: "$cashReceived" },
        },
      },
    ]);

    const totalCashReceived =
      cashReceivedData.length > 0 ? cashReceivedData[0].totalCashReceived : 0;

    // Total balance amount (outstanding)
    const balanceData = await Invoice.aggregate([
      { $match: { status: { $in: ["unpaid", "overdue"] } } },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balanceAmount" },
        },
      },
    ]);

    const totalBalance = balanceData.length > 0 ? balanceData[0].totalBalance : 0;

    // Recent invoices
    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customerId", "name email");

    // Monthly revenue (last 6 months) - based on invoice date
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: sixMonthsAgo },
          status: { $ne: "cancelled" }, // Exclude cancelled invoices
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    console.log("Monthly revenue data:", monthlyRevenue.length, "months");

    res.json({
      overview: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue,
        totalPending,
        totalCashReceived,
        totalBalance,
      },
      recentInvoices,
      monthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard stats", error });
  }
};
