// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Customer API
export const customerAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiCall<any>(`/customers${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => {
    return apiCall<any>(`/customers/${id}`);
  },

  create: (customer: any) => {
    return apiCall<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  update: (id: string, customer: any) => {
    return apiCall<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  },

  delete: (id: string) => {
    return apiCall<any>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Invoice API
export const invoiceAPI = {
  getAll: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);

    const query = queryParams.toString();
    return apiCall<any>(`/invoices${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => {
    return apiCall<any>(`/invoices/${id}`);
  },

  getByNumber: (invoiceNumber: string) => {
    return apiCall<any>(`/invoices/number/${invoiceNumber}`);
  },

  getDashboardStats: () => {
    return apiCall<any>('/invoices/stats/dashboard');
  },

  create: (invoice: any) => {
    return apiCall<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  },

  update: (id: string, invoice: any) => {
    return apiCall<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  },

  updateStatus: (id: string, status: string) => {
    return apiCall<any>(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: (id: string) => {
    return apiCall<any>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsAPI = {
  get: () => {
    return apiCall<any>('/settings');
  },

  update: (settings: any) => {
    return apiCall<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  updateShopInfo: (shopInfo: any) => {
    return apiCall<any>('/settings/shop-info', {
      method: 'PUT',
      body: JSON.stringify(shopInfo),
    });
  },

  updateTaxConfig: (taxConfig: any) => {
    return apiCall<any>('/settings/tax-config', {
      method: 'PUT',
      body: JSON.stringify(taxConfig),
    });
  },

  updateMetalRates: (metalRates: any) => {
    return apiCall<any>('/settings/metal-rates', {
      method: 'PUT',
      body: JSON.stringify(metalRates),
    });
  },

  updateProductTypes: (productTypes: any[]) => {
    return apiCall<any>('/settings/product-types', {
      method: 'PUT',
      body: JSON.stringify({ productTypes }),
    });
  },

  reset: () => {
    return apiCall<any>('/settings/reset', {
      method: 'POST',
    });
  },
};
