import { apiClient } from '../api/apiClient';
import { Transaction, PaginationParams, PaginatedResponse } from '../types';

class TransactionService {
  async getTransactions(params?: PaginationParams & { status?: string, type?: string } | any): Promise<Transaction[]> {
    const response = await apiClient.get('/transactions', { params });
    const rawTxns = Array.isArray(response) ? response : (response?.data || []);
    
    return rawTxns.map((t: any) => {
      let method: any = 'unknown';
      const isCOD = t.payment_method === 'Cash On Delivery' || String(t.payment_method).toUpperCase() === 'COD';
      if (isCOD) {
        method = 'cod';
      } else if (t.metadata?.gateway_mode === 'UPI') {
        method = 'upi';
      } else if (t.metadata?.gateway_mode === 'NB') {
        method = 'netbanking';
      } else if (t.metadata?.gateway_mode === 'WL') {
        method = 'wallet';
      } else if (t.metadata?.gateway_mode === 'CC' || t.metadata?.gateway_mode === 'DC') {
        method = 'card';
      }

      return {
        id: t.id,
        orderId: t.order_id,
        orderNumber: t.orders?.order_number || 'N/A',
        customerId: t.user_id || 'guest',
        customerName: t.users ? `${t.users.first_name || ''} ${t.users.last_name || ''}`.trim() : 'Guest',
        type: t.type || 'payment',
        method,
        amount: Number(t.amount || 0),
        status: t.status,
        gatewayRef: t.gateway_transaction_id,
        createdAt: t.created_at
      };
    });
  }

  async updateTransactionStatus(id: string, status: string, gateway_transaction_id?: string): Promise<Transaction> {
    return apiClient.patch(`/transactions/${id}/status`, { status, gateway_transaction_id });
  }
}

export const transactionService = new TransactionService();
export default transactionService;
