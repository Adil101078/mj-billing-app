import { Request, Response } from "express";
import Settings, { DEFAULT_PRODUCT_TYPES } from "../models/Settings";

// Get settings (singleton)
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings", error });
  }
};

// Update settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();

    Object.assign(settings, req.body);
    await settings.save();

    res.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ message: "Error updating settings", error: error.message });
  }
};

// Update shop information only
export const updateShopInfo = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { shopName, address, phone, email, gstNumber } = req.body;

    if (shopName) settings.shopName = shopName;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (gstNumber !== undefined) settings.gstNumber = gstNumber;

    await settings.save();

    res.json({
      message: "Shop information updated successfully",
      settings,
    });
  } catch (error: any) {
    res.status(400).json({
      message: "Error updating shop information",
      error: error.message,
    });
  }
};

// Update tax configuration only
export const updateTaxConfig = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { cgstRate, sgstRate } = req.body;

    if (cgstRate !== undefined) settings.cgstRate = cgstRate;
    if (sgstRate !== undefined) settings.sgstRate = sgstRate;

    await settings.save();

    res.json({
      message: "Tax configuration updated successfully",
      settings,
    });
  } catch (error: any) {
    res.status(400).json({
      message: "Error updating tax configuration",
      error: error.message,
    });
  }
};

// Update product types only
export const updateProductTypes = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { productTypes } = req.body;

    if (productTypes && Array.isArray(productTypes)) {
      settings.productTypes = productTypes;
    }

    await settings.save();

    res.json({
      message: "Product types updated successfully",
      settings,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ message: "Error updating product types", error: error.message });
  }
};

// Reset settings to defaults
export const resetSettings = async (req: Request, res: Response) => {
  try {
    const settings = await (Settings as any).getSettings();

    settings.shopName = "M J Jewellers";
    settings.address = "";
    settings.phone = "";
    settings.email = "";
    settings.gstNumber = "";
    settings.cgstRate = 1.5;
    settings.sgstRate = 1.5;
    settings.productTypes = DEFAULT_PRODUCT_TYPES.map((t) => ({ ...t }));

    await settings.save();

    res.json({
      message: "Settings reset to defaults successfully",
      settings,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error resetting settings", error: error.message });
  }
};
