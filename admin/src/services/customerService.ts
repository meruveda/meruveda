import { apiClient } from '../api/apiClient';
import { Customer, PaginationParams, PaginatedResponse } from '../types';

class CustomerService {
  async getCustomers(params?: PaginationParams & { search?: string }): Promise<Customer[]> {
    const response = await apiClient.get('/customers', { params });
    const rawData = Array.isArray(response) ? response : (response?.data || []);
    return rawData.map((c: any) => ({
      ...c,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown',
      totalOrders: c.totalOrders || 0,
      lifetimeSpend: c.lifetimeSpend || 0,
      isActive: c.active !== false,
      isBlocked: c.active === false,
      createdAt: c.createdAt || c.created_at
    }));
  }

  async getCustomerById(id: string): Promise<Customer> {
    const c = await apiClient.get(`/customers/${id}`);
    // apiClient already unwraps response.data, so 'c' is the data object directly
    const customer = c?.data || c;
    return {
      ...customer,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown',
      totalOrders: customer.totalOrders || 0,
      lifetimeSpend: customer.lifetimeSpend || 0,
      isActive: customer.active !== false,
      isBlocked: customer.active === false,
      createdAt: customer.createdAt || customer.created_at
    };
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return apiClient.patch(`/customers/${id}`, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  }

  async toggleBlockCustomer(id: string): Promise<Customer> {
    const cust = await this.getCustomerById(id);
    const response = await this.updateCustomerStatus(id, cust.isBlocked);
    const data = (response as any).data?.data || (response as any).data || response;
    return {
      ...data,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || 'Unknown',
      totalOrders: data.totalOrders || 0,
      lifetimeSpend: data.lifetimeSpend || 0,
      isBlocked: data.active === false
    };
  }

  async getCustomerAddresses(id: string): Promise<any[]> {
    const response = await apiClient.get(`/customers/${id}/addresses`);
    // apiClient unwraps response.data; the addresses may be nested further
    return Array.isArray(response) ? response : (response?.data || []);
  }

  async getCustomerPreferences(id: string): Promise<any> {
    const res = await apiClient.get(`/auth/preferences/${id}`);
    return res?.data || res;
  }

  async getCustomerCart(id: string): Promise<any[]> {
    const response = await apiClient.get(`/customers/${id}/cart`);
    return Array.isArray(response) ? response : (response?.data || []);
  }

  async updateCustomerStatus(id: string, active: boolean): Promise<Customer> {
    return apiClient.patch(`/customers/${id}/status`, { active });
  }
}

export const customerService = new CustomerService();
export default customerService;
