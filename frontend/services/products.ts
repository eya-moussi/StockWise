import api from "@/lib/api";

export interface Product {
  id: number;
  reference: string;
  name: string;
  minStock: number;
  categoryId: number;
}

export interface CreateProductDto {
  reference: string;
  name: string;
  minStock: number;
  categoryId: number;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productsService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ProductsResponse> => {
    const response = await api.get<ProductsResponse>("/products", {
      params,
    });

    return response.data;
  },

  getOne: async (id: number) => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto) => {
    const response = await api.post<Product>("/products", data);

    return response.data;
  },

  update: async (
    id: number,
    data: Partial<CreateProductDto>
  ) => {
    const response = await api.patch<Product>(
      `/products/${id}`,
      data
    );

    return response.data;
  },

  remove: async (id: number) => {
    await api.delete(`/products/${id}`);
  },
};