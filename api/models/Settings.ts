import mongoose, { Schema, Document } from "mongoose";

export interface IProductType {
  name: string;
  ratePerTenGram: number;
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
  goldRate: number;
  silverRate: number;
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
});

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
    goldRate: {
      type: Number,
      required: true,
      min: 0,
      default: 65000,
    },
    silverRate: {
      type: Number,
      required: true,
      min: 0,
      default: 75000,
    },
    productTypes: {
      type: [ProductTypeSchema],
      default: [
        { name: "Gold 24K", ratePerTenGram: 65000 },
        { name: "Gold 22K", ratePerTenGram: 59500 },
        { name: "Gold 18K", ratePerTenGram: 48750 },
        { name: "Silver", ratePerTenGram: 75000 },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<ISettings>("Settings", SettingsSchema);
