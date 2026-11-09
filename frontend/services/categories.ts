import api from "@/lib/api";

// Structure d'une catégorie
export interface Category {
  id: number;
  name: string;
}

// Données nécessaires pour créer une catégorie
export interface CreateCategoryDto {
  name: string;
}

// Pour modifier une catégorie
export type UpdateCategoryDto = Partial<CreateCategoryDto>;

// Service des catégories
export const categoriesService = {
  // Récupérer toutes les catégories
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>("/product-categories");
    return response.data;
  },

  // Récupérer une catégorie par son ID
  getOne: async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/product-categories/${id}`);
    return response.data;
  },

  // Créer une catégorie
  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await api.post<Category>("/product-categories", data);
    return response.data;
  },

  // Modifier une catégorie
  update: async (
    id: number,
    data: UpdateCategoryDto
  ): Promise<Category> => {
    const response = await api.patch<Category>(
      `/product-categories/${id}`,
      data
    );
    return response.data;
  },

  // Supprimer une catégorie
  remove: async (id: number): Promise<void> => {
    await api.delete(`/product-categories/${id}`);
  },
};