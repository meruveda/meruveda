import { apiClient } from '../api/apiClient';
import { Order, PaginationParams } from '../types';

// Map raw snake_case API response to camelCase Order interface
const mapOrder = (o: any): Order => ({
  id: o.id,
  orderNumber: o.order_number,
  customerId: o.user_id || 'guest',
  customerName: o.shipping_address?.fullName || o.billing_address?.fullName || o.users?.email?.split('@')[0] || o.user_email?.split('@')[0] || 'Unknown Customer',
  customerEmail: o.users?.email || o.user_email || 'No Email Provided',
  customerPhone: o.shipping_address?.phone || o.billing_address?.phone || 'No Phone',
  items: Array.isArray(o.order_items) 
    ? o.order_items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || item.products?.name || 'Unknown Product',
        thumbnail: item.products?.images?.[0]?.url || item.products?.thumbnail || '',
        sku: (item.sku && !/^\d+$/.test(item.sku)) 
          ? item.sku 
          : (item.products?.sku && !/^\d+$/.test(item.products.sku))
            ? item.products.sku
            : (item.product_id ? `SKU-${item.product_id.substring(0, 8).toUpperCase()}` : ''),
        quantity: item.quantity || 1,
        mrp: item.products?.mrp || item.price,
        price: item.price,
        discount: item.products?.discount || 0
      }))
    : [],
  shippingAddress: {
    fullName: o.shipping_address?.fullName || o.users?.email?.split('@')[0] || o.user_email?.split('@')[0] || 'Unknown Customer',
    phone: o.shipping_address?.phone || '',
    addressLine1: o.shipping_address?.addressLine1 || o.shipping_address?.addressLine || '',
    addressLine2: o.shipping_address?.addressLine2 || '',
    city: o.shipping_address?.city || '',
    state: o.shipping_address?.state || '',
    pincode: o.shipping_address?.pincode || o.shipping_address?.zipCode || '',
    country: o.shipping_address?.country || 'India'
  },
  subtotal: o.subtotal || 0,
  shippingCharge: o.shipping_fee !== undefined ? Number(o.shipping_fee) : (o.shipping_cost !== undefined ? Number(o.shipping_cost) : ((o.subtotal || 0) >= 1000 ? 0 : 50)),
  discount: o.discount || 0,
  tax: o.tax || 0,
  total: o.total !== undefined ? Number(o.total) : ((o.subtotal || 0) - (o.discount || 0) + (o.tax || 0) + ((o.subtotal || 0) >= 1000 ? 0 : 50)),
  paymentMethod: o.payment_method || 'Unknown',
  paymentStatus: o.payment_status || (o.status === 'pending' ? 'pending' : 'paid'),
  paymentGatewayRef: o.payment_gateway_ref,
  status: o.status,
  trackingNumber: o.tracking_number,
  shiprocketOrderId: o.shiprocket_order_id,
  shipmentId: o.shipment_id,
  awbCode: o.awb_code,
  courierName: o.courier_name,
  trackingUrl: o.tracking_url,
  trackingStatus: o.tracking_status,
  pickupLocation: o.pickup_location,
  shippingCost: o.shipping_cost,
  manifestUrl: o.manifest_url,
  labelUrl: o.label_url,
  invoiceUrl: o.invoice_url,
  lastTrackingSync: o.last_tracking_sync,
  notes: o.notes,
  createdAt: o.created_at || new Date().toISOString(),
  updatedAt: o.updated_at || new Date().toISOString()
});

class OrderService {
  async getOrders(params?: PaginationParams & { status?: string, search?: string, paymentMethod?: string }): Promise<Order[]> {
    const data = await apiClient.get<any[]>('/orders', { params });
    return Array.isArray(data) ? data.map(mapOrder) : [];
  }

  async getOrderById(id: string): Promise<Order> {
    const data = await apiClient.get<any>(`/orders/${id}`);
    return mapOrder(data);
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const data = await apiClient.patch<any>(`/orders/${id}/status`, { status });
    return mapOrder(data);
  }

  async updateTrackingNumber(id: string, trackingNumber: string): Promise<Order> {
    const data = await apiClient.patch<any>(`/orders/${id}/status`, { tracking_number: trackingNumber });
    return mapOrder(data);
  }

  async deleteOrder(id: string): Promise<void> {
    await apiClient.delete<any>(`/orders/${id}`);
  }
}

export const orderService = new OrderService();
export default orderService;
