import api from "@/lib/api";

export type WarehouseType =
  | "PRINCIPAL"
  | "PRODUCTION"
  | "DISTRIBUTION"
  | "RETOUR"
  | "REBUT";

export interface Warehouse {
  id: number;
  name: string;
  type: WarehouseType;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseDto {
  name: string;
  type: WarehouseType;
  description?: string;
}

export type UpdateWarehouseDto = Partial<CreateWarehouseDto>;

export const warehousesService = {
  getAll: async (): Promise<Warehouse[]> => {
    const response = await api.get<Warehouse[]>("/warehouses");
    return response.data;
  },

  getOne: async (id: number): Promise<Warehouse> => {
    const response = await api.get<Warehouse>(`/warehouses/${id}`);
    return response.data;
  },

  create: async (data: CreateWarehouseDto): Promise<Warehouse> => {
    const response = await api.post<Warehouse>("/warehouses", data);
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateWarehouseDto
  ): Promise<Warehouse> => {
    const response = await api.patch<Warehouse>(
      `/warehouses/${id}`,
      data
    );
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/warehouses/${id}`);
  },
};