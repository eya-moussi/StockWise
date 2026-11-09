
import api from "@/lib/api";

// Catégorie associée au produit
export interface ProductCategory {
  id: number;
  name: string;
}

// Structure d'un produit retourné par l'API
export interface Product {
  id: number;
  reference: string;
  name: string;
  minStock: number;
  categoryId: number;
  category: ProductCategory;
}

// Données nécessaires pour créer un produit
export interface CreateProductDto {
  reference: string;
  name: string;
  minStock: number;
  categoryId: number;
}

// Pour modifier un produit, les champs sont facultatifs
export type UpdateProductDto = Partial<CreateProductDto>;

// Structure de la réponse de la liste des produits
export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Service des produits
export const productsService = {
  // Récupérer les produits avec pagination et recherche
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: "id" | "name" | "reference";
    sortOrder?: "asc" | "desc";
  }): Promise<ProductsResponse> => {
    const response = await api.get<ProductsResponse>("/products", {
      params,
    });

    return response.data;
  },

  // Récupérer un produit par son identifiant
  getOne: async (id: number): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);

    return response.data;
  },

  // Créer un produit
  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<Product>("/products", data);

    return response.data;
  },

  // Modifier un produit
  update: async (
    id: number,
    data: UpdateProductDto
  ): Promise<Product> => {
    const response = await api.patch<Product>(
      `/products/${id}`,
      data
    );

    return response.data;
  },

  // Supprimer un produit
  remove: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
