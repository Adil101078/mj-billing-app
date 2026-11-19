import mongoose from "mongoose";
import readline from "readline";
import dotenv from "dotenv";
import Admin from "../models/Admin";

dotenv.config();

interface AdminInput {
  name?: string;
  email?: string;
  password?: string;
}

const validate = ({ name, email, password }: AdminInput): string | null => {
  if (!name || !email || !password) return "Admin name, email and password are all required.";
  if (password.length < 6) return "Admin password must be at least 6 characters long.";
  return null;
};

/**
 * Ensures an admin account exists. Safe to call on every server boot:
 * does nothing if an admin is already present. Expects an open mongoose connection.
 * Credentials come from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD unless passed in.
 */
export const seedAdmin = async (input?: AdminInput): Promise<void> => {
  const existingAdmin = await Admin.findOne();
  if (existingAdmin) {
    console.log(`👤 Admin already exists (${existingAdmin.email}). Skipping seeding.`);
    return;
  }

  const details: AdminInput = input ?? {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };

  const error = validate(details);
  if (error) {
    console.warn(
      `⚠️  No admin account exists and it could not be seeded: ${error} ` +
        "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run `npm run seed:admin`."
    );
    return;
  }

  const admin = await new Admin(details).save();
  console.log(`✓ Admin created successfully: ${admin.name} <${admin.email}>`);
};

// CLI usage: `npm run seed:admin`. Uses env vars, falls back to prompting in a terminal.
const runCli = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mj_invoice_db";
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    let input: AdminInput | undefined;
    const envMissing = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_NAME;
    if (envMissing && process.stdin.isTTY && !(await Admin.exists({}))) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
      console.log("\n=== Create Admin Account ===\n");
      input = {
        name: await ask("Enter admin name: "),
        email: await ask("Enter admin email: "),
        password: await ask("Enter admin password (min 6 characters): "),
      };
      rl.close();
    }

    await seedAdmin(input);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  runCli();
}

export default seedAdmin;
