import mongoose from "mongoose";
import Invoice from "../models/Invoice";
import dotenv from "dotenv";

dotenv.config();

const checkInvoices = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mj-invoice";
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all invoices
    const allInvoices = await Invoice.find().select("invoiceNumber status paidAt invoiceDate total").lean();
    console.log("\n=== All Invoices ===");
    console.log("Total invoices:", allInvoices.length);

    if (allInvoices.length > 0) {
      console.log("\nInvoice details:");
      allInvoices.forEach((inv: any) => {
        console.log({
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          total: inv.total,
          invoiceDate: inv.invoiceDate,
          paidAt: inv.paidAt || "NOT SET",
        });
      });

      // Check paid invoices
      const paidInvoices = allInvoices.filter((inv: any) => inv.status === "paid");
      console.log("\n=== Paid Invoices ===");
      console.log("Total paid invoices:", paidInvoices.length);

      const paidWithPaidAt = paidInvoices.filter((inv: any) => inv.paidAt);
      console.log("Paid invoices WITH paidAt field:", paidWithPaidAt.length);
      console.log("Paid invoices WITHOUT paidAt field:", paidInvoices.length - paidWithPaidAt.length);

      // Test the monthly revenue aggregation
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      console.log("\n=== Testing Monthly Revenue Aggregation ===");
      console.log("Six months ago date:", sixMonthsAgo);

      const monthlyRevenue = await Invoice.aggregate([
        {
          $match: {
            status: "paid",
            paidAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$paidAt" },
              month: { $month: "$paidAt" },
            },
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      console.log("Monthly revenue result:", JSON.stringify(monthlyRevenue, null, 2));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

checkInvoices();
