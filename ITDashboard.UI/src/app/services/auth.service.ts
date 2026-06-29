// services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, UserDto, UserPermissions, RoleDto } from '../models/auth.models';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // Standardize URL assembly exactly like dashboard.service.ts
    private base = environment.apiUrl + '/api/auth';
    private currentUserSubject = new BehaviorSubject<UserDto | null>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    private cachedUserRoles: string[] = [];
    private cachedPermissions: UserPermissions | null = null;

    constructor(private http: HttpClient) {
        this.loadUserFromStorage();
    }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        // Enforce strong parameter binding to prevent mapping errors
        const payload: LoginRequest = {
            username: credentials.username.trim(),
            password: credentials.password
        };

        return this.http.post<LoginResponse>(`${this.base}/login`, payload).pipe(
            tap((response) => {
                if (response && response.token) {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    this.currentUserSubject.next(response.user);
                    this.updateCache(response.user);
                }
            })
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.cachedUserRoles = [];
        this.cachedPermissions = null;
    }

    private loadUserFromStorage(): void {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                this.currentUserSubject.next(user);
                this.updateCache(user);
            } catch {
                this.logout();
            }
        }
    }

    private updateCache(user: UserDto | null): void {
        if (!user) {
            this.cachedUserRoles = [];
            this.cachedPermissions = null;
            return;
        }

        // ✅ Safely extract roles from RoleDto[]
        if (user.roles && Array.isArray(user.roles)) {
            this.cachedUserRoles = user.roles.map((r: RoleDto) => r.name);
        } else {
            this.cachedUserRoles = [];
        }

        // ✅ Safely extract permissions
        this.cachedPermissions = user.permissions || null;
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    getCurrentUser(): UserDto | null {
        return this.currentUserSubject.value;
    }

    getPermissions(): UserPermissions | null {
        return this.cachedPermissions;
    }

    hasPermission(permission: keyof UserPermissions): boolean {
        const perms = this.getPermissions();
        return perms ? perms[permission] === true : false;
    }

    getUserPermissionsDebug(): void {
        const user = this.getCurrentUser();
        if (user) {
            console.log('👤 User:', user.email);
            console.log('📋 Roles:', this.cachedUserRoles);
            console.log('🔑 Permissions:', this.cachedPermissions);
            console.log('canEdit:', this.canEdit);
            console.log('canDelete:', this.canDelete);
            console.log('canCreate:', this.canCreate);
            console.log('canManageUsers:', this.canManageUsers);
        }
    }

    // ============================================
    // ROLE CHECKS - ✅ Use cached values
    // ============================================

    get isCEO(): boolean {
        return this.cachedUserRoles.includes('CEO');
    }

    get isSupervisor(): boolean {
        return this.cachedUserRoles.includes('Supervisor');
    }

    get isAdmin(): boolean {
        return this.cachedUserRoles.includes('Admin') ||
            this.cachedUserRoles.includes('SuperAdmin');
    }

    // ============================================
    // PERMISSION GETTERS (with CEO override)
    // ============================================

    get canView(): boolean {
        return this.hasPermission('canView');
    }

    get canEdit(): boolean {
        // CEO always has edit permission
        if (this.isCEO) return true;
        return this.hasPermission('canEdit');
    }

    get canDelete(): boolean {
        // CEO always has delete permission
        if (this.isCEO) return true;
        return this.hasPermission('canDelete');
    }

    get canAssignResource(): boolean {
        // CEO always has assign resource permission
        if (this.isCEO) return true;
        return this.hasPermission('canAssignResource');
    }

    get canCreate(): boolean {
        // CEO always has create permission
        if (this.isCEO) return true;
        return this.hasPermission('canCreate');
    }

    get canManageUsers(): boolean {
        // CEO always has manage users permission
        if (this.isCEO) return true;
        return this.hasPermission('canManageUsers');
    }

    get isViewer(): boolean {
        // CEO is never a viewer
        if (this.isCEO || this.isAdmin || this.isSupervisor) return false;
        return !this.canEdit && !this.canDelete;
    }

    // ✅ FIXED: Returns cached roles
    getUserRoles(): string[] {
        return this.cachedUserRoles;
    }

    // ✅ FIXED: Uses cached roles
    hasRole(roleName: string): boolean {
        return this.cachedUserRoles.includes(roleName);
    }

    forgotPassword(email: string): Observable<any> {
        return this.http.post(`${this.base}/forgot-password`, { email });
    }

    resetPassword(token: string, newPassword: string): Observable<any> {
        return this.http.post(`${this.base}/reset-password`, { token, newPassword });
    }
}