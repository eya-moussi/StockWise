
import { jwtDecode } from "jwt-decode";

export type UserRole = "ADMIN" | "STOCK_MANAGER" | "VIEWER";

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: UserRole;
  exp?: number;
}

// Récupérer et décoder le token
function getTokenPayload(): JwtPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);

    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// Vérifier si l'utilisateur possède un token valide
export function isAuthenticated(): boolean {
  return getTokenPayload() !== null;
}

// Récupérer le rôle de l'utilisateur connecté
export function getUserRole(): UserRole | null {
  const payload = getTokenPayload();

  if (
    payload?.role === "ADMIN" ||
    payload?.role === "STOCK_MANAGER" ||
    payload?.role === "VIEWER"
  ) {
    return payload.role;
  }

  return null;
}

// S'abonner aux changements d'authentification
export function subscribeToAuthChanges(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener("auth-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("auth-change", callback);
  };
}

// Lecture du rôle côté navigateur
export function getUserRoleSnapshot(): UserRole | null {
  return getUserRole();
}

// Valeur initiale côté serveur
export function getServerUserRoleSnapshot(): UserRole | null {
  return null;
}

// Déconnexion
export function logout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/login";
}
