import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hsnCode?: string;
  taxRate?: number;
}

export interface IInvoice extends Document {
  invoiceNumber?: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discount: number;
  total: number;
  status: "draft" | "sent" | "paid" | "cancelled" | "overdue";
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  terms?: string;
  paymentMethod?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  hsnCode: {
    type: String,
    trim: true,
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
  },
});

const InvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
      required: false,
      default: undefined,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    items: [InvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["unpaid", "sent", "paid", "cancelled", "overdue"],
      default: "unpaid",
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for faster queries
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ invoiceDate: -1 });

// Auto-generate professional invoice number if not provided
InvoiceSchema.pre("save", async function (next) {
  if (this.invoiceNumber) return next(); // Skip if already set

  const currentYear = new Date().getFullYear().toString().slice(-2); // '25' for 2025
  const prefix = "INV-MJ";

  // Find last invoice for the current year
  const lastInvoice: any = await mongoose.models.Invoice.findOne({
    invoiceNumber: new RegExp(`^${prefix}${currentYear}`),
  })
    .sort({ createdAt: -1 })
    .select("invoiceNumber")
    .lean();

  let nextSeq = 1;

  if (lastInvoice?.invoiceNumber) {
    // Extract numeric part (e.g., from INV-MJ250011 -> 11)
    const match = lastInvoice.invoiceNumber.match(/^INV-MJ\d{2}(\d{4})$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  const invoiceNumber = `${prefix}${currentYear}${String(nextSeq).padStart(
    4,
    "0"
  )}`;
  this.invoiceNumber = invoiceNumber;

  next();
});

export default mongoose.model<IInvoice>("Invoice", InvoiceSchema);
