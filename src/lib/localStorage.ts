export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  type: string;
  weight: number;
  ratePerTenGram: number;
  makingCharge: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  status: "paid" | "unpaid";
}

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  cgstRate: number;
  sgstRate: number;
  goldRate: number;
  silverRate: number;
  productTypes: Array<{ name: string; ratePerTenGram: number }>;
}

const STORAGE_KEYS = {
  CUSTOMERS: "mj_Jewellers_customers",
  INVOICES: "mj_Jewellers_invoices",
  SETTINGS: "mj_Jewellers_settings",
  INVOICE_COUNTER: "mj_Jewellers_invoice_counter",
};

const DEFAULT_SETTINGS: Settings = {
  shopName: "M J Jewellers",
  address: "",
  phone: "",
  email: "",
  gstNumber: "",
  cgstRate: 1.5,
  sgstRate: 1.5,
  goldRate: 65000,
  silverRate: 75000,
  productTypes: [
    { name: "Gold 24K", ratePerTenGram: 65000 },
    { name: "Gold 22K", ratePerTenGram: 59500 },
    { name: "Gold 18K", ratePerTenGram: 48750 },
    { name: "Silver", ratePerTenGram: 75000 },
  ],
};

export const storage = {
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  },

  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  addCustomer: (customer: Omit<Customer, "id" | "createdAt">): Customer => {
    const customers = storage.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    storage.saveCustomers(customers);
    return newCustomer;
  },

  updateCustomer: (id: string, updates: Partial<Customer>) => {
    const customers = storage.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      storage.saveCustomers(customers);
    }
  },

  deleteCustomer: (id: string) => {
    const customers = storage.getCustomers().filter((c) => c.id !== id);
    storage.saveCustomers(customers);
  },

  getInvoices: (): Invoice[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  },

  saveInvoices: (invoices: Invoice[]) => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber">): Invoice => {
    const invoices = storage.getInvoices();
    const counter = storage.getInvoiceCounter();
    const newInvoice: Invoice = {
      ...invoice,
      id: Date.now().toString(),
      invoiceNumber: `INV-${counter.toString().padStart(5, "0")}`,
    };
    invoices.push(newInvoice);
    storage.saveInvoices(invoices);
    storage.incrementInvoiceCounter();
    return newInvoice;
  },

  updateInvoice: (id: string, updates: Partial<Invoice>) => {
    const invoices = storage.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...updates };
      storage.saveInvoices(invoices);
    }
  },

  deleteInvoice: (id: string) => {
    const invoices = storage.getInvoices().filter((i) => i.id !== id);
    storage.saveInvoices(invoices);
  },

  getSettings: (): Settings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: Settings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getInvoiceCounter: (): number => {
    const counter = localStorage.getItem(STORAGE_KEYS.INVOICE_COUNTER);
    return counter ? parseInt(counter, 10) : 1;
  },

  incrementInvoiceCounter: () => {
    const counter = storage.getInvoiceCounter();
    localStorage.setItem(
      STORAGE_KEYS.INVOICE_COUNTER,
      (counter + 1).toString()
    );
  },
};
