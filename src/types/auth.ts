export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  LEADER = 'LEADER',
  EDITOR = 'EDITOR',
  CONTENT = 'CONTENT',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  manager_id?: string;
  is_active: boolean;
  last_login_at?: string;
  last_activity_at?: string;
  total_login_count: number;
  total_action_count: number;
  team?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
