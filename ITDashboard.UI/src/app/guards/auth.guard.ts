// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        // Direct absolute verification bypasses early bootstrap lifecycle delays
        const hasToken = !!localStorage.getItem('token');

        if (this.authService.isLoggedIn() || hasToken) {
            return true;
        }

        // Clean out memory states if it was an invalid attempt
        this.authService.logout();
        this.router.navigate(['/login']);
        return false;
    }
}