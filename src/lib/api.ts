// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Helper function for API calls with auth
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = localStorage.getItem("accessToken");

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && accessToken && !endpoint.includes('/auth/')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
          return Promise.reject(new Error("No refresh token"));
        }

        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) throw new Error("Token refresh failed");

          const data = await refreshResponse.json();
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);

          processQueue(null, data.accessToken);
          isRefreshing = false;

          // Retry original request
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${data.accessToken}`,
          };
          return apiCall<T>(endpoint, options);
        } catch (error) {
          processQueue(error, null);
          isRefreshing = false;
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      // Queue failed requests while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(apiCall<T>(endpoint, options)),
          reject: (err: any) => reject(err),
        });
      });
    }

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
