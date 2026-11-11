
import api from "@/lib/api";

export interface Location {
  id: number;
  code: string;
  name: string;
  description: string | null;
  warehouseId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationDto {
  code: string;
  name: string;
  description?: string;
}

export type UpdateLocationDto = Partial<CreateLocationDto>;

export const locationsService = {
  getAll: async (warehouseId: number): Promise<Location[]> => {
    const response = await api.get<Location[]>(
      `/warehouses/${warehouseId}/locations`
    );
    return response.data;
  },

  getOne: async (
    warehouseId: number,
    locationId: number
  ): Promise<Location> => {
    const response = await api.get<Location>(
      `/warehouses/${warehouseId}/locations/${locationId}`
    );
    return response.data;
  },

  create: async (
    warehouseId: number,
    data: CreateLocationDto
  ): Promise<Location> => {
    const response = await api.post<Location>(
      `/warehouses/${warehouseId}/locations`,
      data
    );
    return response.data;
  },

  update: async (
    warehouseId: number,
    locationId: number,
    data: UpdateLocationDto
  ): Promise<Location> => {
    const response = await api.patch<Location>(
      `/warehouses/${warehouseId}/locations/${locationId}`,
      data
    );
    return response.data;
  },

  remove: async (
    warehouseId: number,
    locationId: number
  ): Promise<void> => {
    await api.delete(
      `/warehouses/${warehouseId}/locations/${locationId}`
    );
  },
};
