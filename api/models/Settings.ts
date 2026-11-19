import mongoose, { Schema, Document } from "mongoose";

export interface IProductType {
  name: string;
  ratePerTenGram: number;
  hsnCode?: string;
}

export interface ISettings extends Document {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  logo?: string; // Base64 encoded image or URL
  cgstRate: number;
  sgstRate: number;
  productTypes: IProductType[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductTypeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ratePerTenGram: {
    type: Number,
    required: true,
    min: 0,
  },
  hsnCode: {
    type: String,
    trim: true,
    default: "",
  },
});

// Rates per 10g live on each product type; these are used when the shop
// has not configured its own types yet (and by "reset to defaults")
export const DEFAULT_PRODUCT_TYPES: IProductType[] = [
  { name: "Gold 24K", ratePerTenGram: 65000, hsnCode: "7113" },
  { name: "Gold 22K", ratePerTenGram: 59500, hsnCode: "7113" },
  { name: "Gold 18K", ratePerTenGram: 48750, hsnCode: "7113" },
  { name: "Silver", ratePerTenGram: 75000, hsnCode: "7113" },
];

const SettingsSchema: Schema = new Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
      default: "M J Jewellers",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    cgstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 1.5,
    },
    sgstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 1.5,
    },
    productTypes: {
      type: [ProductTypeSchema],
      default: () => DEFAULT_PRODUCT_TYPES.map((t) => ({ ...t })),
    },
  },
  {
    timestamps: true,
  }
);

// The old standalone gold/silver rates were never used in billing (rates come
// from product types), so strip them from stored settings once per process.
let legacyRatesRemoved = false;

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function () {
  if (!legacyRatesRemoved) {
    await this.collection.updateMany(
      { $or: [{ goldRate: { $exists: true } }, { silverRate: { $exists: true } }] },
      { $unset: { goldRate: "", silverRate: "" } }
    );
    legacyRatesRemoved = true;
  }

  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<ISettings>("Settings", SettingsSchema);
