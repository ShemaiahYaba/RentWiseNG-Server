export type UserRole = 'tenant' | 'agent' | 'landlord' | 'admin';

export type ApiStatus = 'success' | 'error';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
