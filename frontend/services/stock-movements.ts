
import api from "@/lib/api";

export type StockMovementType =
  | "IN"
  | "OUT"
  | "TRANSFER"
  | "RETURN_CLIENT"
  | "RETURN_SUPPLIER"
  | "CORRECTION";

export type ReturnType = "RETURN_CLIENT" | "RETURN_SUPPLIER";


export interface StockMovementBase {
  id: number;
  type: StockMovementType;
  quantity: number;
  reference: string | null;
  productId: number;
  warehouseId: number;
  locationId: number | null;
  createdAt: string;
  reason: string | null;
  relatedMovementId: number | null;
}

export interface StockMovement extends StockMovementBase {
  product: {
    id: number;
    name: string;
    reference: string;
  };

  warehouse: {
    id: number;
    name: string;
  };

  location: {
    id: number;
    code: string;
    name: string;
  } | null;
}


export interface CreateStockMovementDto {
  quantity: number;
  productId: number;
  warehouseId: number;
  locationId?: number;
  reference?: string;
}

export interface CreateReturnDto {
  type: ReturnType;
  quantity: number;
  productId: number;
  warehouseId: number;
  reference?: string;
}

export interface CreateTransferDto {
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  quantity: number;
  reference?: string;
}

export interface StockMovementFilters {
  productId?: number;
  warehouseId?: number;
  locationId?: number;
}

export interface TransferResponse {
  outMovement: StockMovementBase;
  inMovement: StockMovementBase;
}

export const stockMovementsService = {
  getAll: async (
    filters?: StockMovementFilters
  ): Promise<StockMovement[]> => {
    const response = await api.get<StockMovement[]>(
      "/stock-movements",
      { params: filters }
    );
    return response.data;
  },

  createIn: async (
    data: CreateStockMovementDto
  ): Promise<StockMovementBase> => {
    const response = await api.post<StockMovementBase>(
      "/stock-movements/in",
      data
    );
    return response.data;
  },

  createOut: async (
    data: CreateStockMovementDto
  ): Promise<StockMovementBase> => {
    const response = await api.post<StockMovementBase>(
      "/stock-movements/out",
      data
    );
    return response.data;
  },

  createReturn: async (
    data: CreateReturnDto
  ): Promise<StockMovementBase> => {
    const response = await api.post<StockMovementBase>(
      "/stock-movements/return",
      data
    );
    return response.data;
  },


  transfer: async (
    data: CreateTransferDto
  ): Promise<TransferResponse> => {
    const response = await api.post<TransferResponse>(
      "/stock-movements/transfer",
      data
    );
    return response.data;
  },
};
