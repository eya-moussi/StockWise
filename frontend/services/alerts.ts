import api from "@/lib/api";

export type AlertStatus = "TO_VERIFY" | "CONFIRMED" | "NORMAL";

export type ReviewStatus = Extract<AlertStatus, "CONFIRMED" | "NORMAL">;

export interface AlertUser {
  id: number;
  fullName: string;
  email: string;
}

export interface AlertHistoryMovement {
  id: number;
  type: string;
  quantity: number;
  createdAt: string;
  warehouse: { name: string };
}

export interface AlertMovement {
  id: number;
  type: string;
  quantity: number;
  reference: string | null;
  reason: string | null;
  createdAt: string;
  product: {
    id: number;
    name: string;
    reference: string;
    stockMovements: AlertHistoryMovement[];
  };
  warehouse: { id: number; name: string };
  location: { id: number; code: string; name: string } | null;
  createdBy: AlertUser | null;
}

export interface Alert {
  id: number;
  movementId: number;
  score: number;
  threshold: number;
  modelVersion: string;
  isAnomaly: boolean;
  status: AlertStatus;
  comment: string | null;
  processedById: number | null;
  processedBy: AlertUser | null;
  processedAt: string | null;
  createdAt: string;
  movement: AlertMovement;
}

export interface AlertFilters {
  status?: AlertStatus;
  productId?: number;
  from?: string;
  to?: string;
}

export interface ReviewAlertInput {
  status: ReviewStatus;
  comment: string;
}

export const alertsService = {
  getAll: async (filters?: AlertFilters): Promise<Alert[]> => {
    const response = await api.get<Alert[]>("/alerts", { params: filters });
    return response.data;
  },

  review: async (id: number, data: ReviewAlertInput): Promise<Alert> => {
    const response = await api.patch<Alert>(`/alerts/${id}/review`, data);
    return response.data;
  },
};
