import mongoose from "mongoose";
import Invoice from "../models/Invoice";
import dotenv from "dotenv";

dotenv.config();

const testMonthlyRevenue = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mj-invoice";
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Monthly revenue (last 6 months) - based on invoice date
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    console.log("\n=== Testing NEW Monthly Revenue Aggregation ===");
    console.log("Six months ago:", sixMonthsAgo);

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

    console.log("\nMonthly Revenue Result:");
    console.log(JSON.stringify(monthlyRevenue, null, 2));

    if (monthlyRevenue.length > 0) {
      console.log("\n✓ Success! Monthly revenue data is now showing.");
      monthlyRevenue.forEach((item: any) => {
        console.log(
          `  ${item._id.month}/${item._id.year}: ₹${item.revenue.toLocaleString("en-IN")} (${item.count} invoices)`
        );
      });
    } else {
      console.log("\n⚠️  Still no data. Check if invoices exist and are within the last 6 months.");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

testMonthlyRevenue();
