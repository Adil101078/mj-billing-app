import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-secret-key-change-in-production";
const JWT_EXPIRES_IN = "15m"; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = "7d"; // Refresh token expires in 7 days

// Generate access token
const generateAccessToken = (adminId: string) => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Generate refresh token
const generateRefreshToken = (adminId: string) => {
  return jwt.sign({ adminId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, passwordLength: password?.length });

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find admin by email
    const admin: any = await Admin.findOne({ email });
    console.log("Admin found:", admin ? "Yes" : "No");
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate tokens
    const accessToken = generateAccessToken(admin._id.toString());
    const refreshToken = generateRefreshToken(admin._id.toString());

    res.json({
      accessToken,
      refreshToken,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error during login", error });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      adminId: string;
    };

    // Check if admin still exists
    const admin: any = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(admin._id.toString());
    const newRefreshToken = generateRefreshToken(admin._id.toString());

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// Verify token (for checking if user is authenticated)
export const verifyToken = async (req: Request, res: Response) => {
  try {
    // If we reach here, the middleware has already verified the token
    const admin = await Admin.findById((req as any).adminId).select(
      "-password"
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying token", error });
  }
};

// Logout (optional - mainly for clearing client-side tokens)
export const logout = async (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by removing tokens
  // You could implement token blacklisting here if needed
  res.json({ message: "Logged out successfully" });
};
