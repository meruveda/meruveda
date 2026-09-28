import { apiClient } from '../api/apiClient';

class ShiprocketService {
  async generateAwb(shipmentId: string | number) {
    return apiClient.post('/shiprocket/generate-awb', { shipmentId });
  }

  async schedulePickup(shipmentId: string | number) {
    return apiClient.post('/shiprocket/schedule-pickup', { shipmentId });
  }

  async trackShipment(awb: string) {
    return apiClient.get(`/shiprocket/tracking/${awb}`);
  }

  async getLabel(shipmentId: string | number) {
    return apiClient.get(`/shiprocket/label/${shipmentId}`);
  }

  async getInvoice(shipmentId: string | number) {
    return apiClient.get(`/shiprocket/invoice/${shipmentId}`);
  }

  async cancelOrder(orderId: string) {
    return apiClient.post('/shiprocket/cancel-order', { orderId });
  }
}

export const shiprocketService = new ShiprocketService();
export default shiprocketService;
