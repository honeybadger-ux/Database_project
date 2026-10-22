import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token (supports both staff and seller tokens)
api.interceptors.request.use(
  (config) => {
    const isSellerReq = config.url && config.url.includes('/api/sellers');
    const isSuperAdminReq = config.url && config.url.includes('/api/super-admin');
    const isStaffReq = config.url && (
      config.url.includes('/api/parcels') ||
      config.url.includes('/api/shipments') ||
      config.url.includes('/api/delivery-attempts') ||
      config.url.includes('/api/admin') ||
      config.url.includes('/api/auth')
    );

    const sellerToken = localStorage.getItem('seller_token');
    const staffToken = localStorage.getItem('token');

    let token = null;
    if (isSellerReq) {
      token = sellerToken || staffToken;
    } else if (isSuperAdminReq || isStaffReq) {
      token = staffToken;
    } else {
      token = staffToken || (window.location.port === '5175' ? sellerToken : null);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isSellerReq = error.config && error.config.url && error.config.url.includes('/api/sellers');
      if (isSellerReq) {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_user');
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  getMe: () => api.get('/api/auth/me'),
};

// Public tracking & disputes
export const trackingService = {
  trackParcel: (trackingNumber) => api.get(`/api/track/${encodeURIComponent(trackingNumber)}`),
  raiseDispute: (trackingNumber, data) =>
    api.post(`/api/track/${encodeURIComponent(trackingNumber)}/dispute`, data),
};

// Rates comparison & recommendation engine
export const rateService = {
  compareRates: (data) => api.post('/api/rates/compare', data),
};

// Sellers & Merchants Aggregator endpoints
export const sellerService = {
  login: (credentials) => api.post('/api/sellers/login', credentials),
  getDirectory: () => api.get('/api/sellers/directory'),
  getMe: () => api.get('/api/sellers/me'),
  getMyOrders: (params = {}) => api.get('/api/sellers/orders', { params }),
  getMyStats: () => api.get('/api/sellers/stats'),
  bookOrder: (data) => api.post('/api/sellers/orders', data),
  getSellers: (params = {}) => api.get('/api/sellers', { params }),
  getSeller: (id) => api.get(`/api/sellers/${id}`),
  getSellerOrders: (id, params = {}) => api.get(`/api/sellers/${id}/orders`, { params }),
  getSellerStats: (id) => api.get(`/api/sellers/${id}/stats`),
};

// Super Root Admin Console endpoints
export const superAdminService = {
  getOverview: () => api.get('/api/super-admin/overview'),
  getCouriers: () => api.get('/api/super-admin/couriers'),
  onboardCourier: (data) => api.post('/api/super-admin/couriers', data),
  updateCourier: (id, data) => api.put(`/api/super-admin/couriers/${id}`, data),
  getSellers: () => api.get('/api/super-admin/sellers'),
  onboardSeller: (data) => api.post('/api/super-admin/sellers', data),
  updateSeller: (id, data) => api.put(`/api/super-admin/sellers/${id}`, data),
  getDisputes: (params = {}) => api.get('/api/super-admin/disputes', { params }),
  resolveDispute: (id, data) => api.put(`/api/super-admin/disputes/${id}/resolve`, data),
};

// Parcels endpoints
export const parcelService = {
  getParcels: (params = {}) => api.get('/api/parcels', { params }),
  getParcel: (id) => api.get(`/api/parcels/${id}`),
  createParcel: (data) => api.post('/api/parcels', data),
  updateParcelStatus: (id, { status, hub_id, remarks }) =>
    api.post(`/api/parcels/${id}/status`, { status, hub_id, remarks }),
};

// Shipments endpoints
export const shipmentService = {
  getShipments: (params = {}) => api.get('/api/shipments', { params }),
  getShipment: (id) => api.get(`/api/shipments/${id}`),
  createShipment: (data) => api.post('/api/shipments', data),
  receiveShipment: (id) => api.put(`/api/shipments/${id}/receive`),
};

// Delivery endpoints
export const deliveryService = {
  recordAttempt: (data) => api.post('/api/delivery-attempts', data),
};

// Admin endpoints
export const adminService = {
  getHubs: (params = {}) => api.get('/api/admin/hubs', { params }),
  createHub: (data) => api.post('/api/admin/hubs', data),
  updateHub: (id, data) => api.put(`/api/admin/hubs/${id}`, data),

  getEmployees: (params = {}) => api.get('/api/admin/employees', { params }),
  createEmployee: (data) => api.post('/api/admin/employees', data),
  updateEmployee: (id, data) => api.put(`/api/admin/employees/${id}`, data),

  getAnalyticsOverview: (params = {}) => api.get('/api/admin/analytics/overview', { params }),
  getStatusDistribution: (params = {}) => api.get('/api/admin/analytics/status-distribution', { params }),
  getHubThroughput: (params = {}) => api.get('/api/admin/analytics/hub-throughput', { params }),
  getTransitTimes: (params = {}) => api.get('/api/admin/analytics/transit-times', { params }),
  getDeliveryRates: (params = {}) => api.get('/api/admin/analytics/delivery-rates', { params }),
};

export default api;
