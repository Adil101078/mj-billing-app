import mongoose from "mongoose";
import Admin from "../models/Admin";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mj-invoice";
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      console.log("Admin already exists. Skipping seeding.");
      console.log(`Existing admin: ${existingAdmin.email}`);
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log("\n=== Create Admin Account ===\n");

    // Get admin details from user
    const name = await question("Enter admin name: ");
    const email = await question("Enter admin email: ");
    const password = await question("Enter admin password (min 6 characters): ");

    if (!name || !email || !password) {
      console.error("All fields are required!");
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("Password must be at least 6 characters long!");
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }

    // Create admin
    const admin = new Admin({
      name,
      email,
      password,
    });

    await admin.save();
    console.log("\n✓ Admin created successfully!");
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.name}`);

    await mongoose.disconnect();
    rl.close();
  } catch (error) {
    console.error("Error seeding admin:", error);
    await mongoose.disconnect();
    rl.close();
    process.exit(1);
  }
};

seedAdmin();
