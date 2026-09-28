import { apiClient } from '../api/apiClient';
import { Product, ProductFilters, PaginationParams } from '../types';

class ProductService {
  async getProducts(params?: ProductFilters & PaginationParams): Promise<Product[]> {
    return apiClient.get('/products', { params });
  }

  async getProductById(id: string): Promise<Product> {
    return apiClient.get(`/products/${id}`);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return apiClient.post('/products', data);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.patch(`/products/${id}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return apiClient.delete(`/products/${id}`);
  }

  async bulkDeleteProducts(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.deleteProduct(id)));
  }

  async duplicateProduct(id: string): Promise<Product> {
    const prod = await this.getProductById(id);
    // Strip unique/auto-generated fields to avoid DB conflicts
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = prod as any;
    const newSku = prod.sku ? `${prod.sku}-COPY` : `COPY-${Date.now()}`;
    return await this.createProduct({ ...rest, name: prod.name + ' (Copy)', sku: newSku, status: 'inactive' });
  }
}

export const productService = new ProductService();
export default productService;
