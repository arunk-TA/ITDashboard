// components/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    currentYear = new Date().getFullYear();
    username: string = '';
    password: string = '';
    loading: boolean = false;
    error: string = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    onSubmit(): void {
        if (!this.username || !this.password) {
            this.error = 'Please enter username and password';
            return;
        }

        this.loading = true;
        this.error = '';

        this.authService.login({
            username: this.username,
            password: this.password
        }).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Login failed. Please try again.';
                console.error('Login error:', err);
            }
        });
    }
  
}
 