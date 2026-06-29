// models/auth.models.ts
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: UserDto;
}

export interface UserDto {
    id: number;
    name: string;
    email: string;
    realname?: string;
    roles: RoleDto[];
    permissions: UserPermissions;
}

export interface RoleDto {
    id: number;
    name: string;
}

export interface UserPermissions {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAssignResource: boolean;
    canCreate: boolean;
    canManageUsers: boolean;
}