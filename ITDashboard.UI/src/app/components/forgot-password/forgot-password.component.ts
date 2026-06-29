// components/forgot-password/forgot-password.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
    // Forgot Password
    email: string = '';
    isForgotPassword: boolean = true;

    // Reset Password
    token: string = '';
    newPassword: string = '';
    confirmPassword: string = '';

    // Common
    loading: boolean = false;
    message: string = '';
    error: string = '';
    isSuccess: boolean = false;
    currentYear: number = new Date().getFullYear();

    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        // ✅ Check for token in URL
        this.route.queryParams.subscribe((params: any) => {
            const token = params['token'];
            console.log('🔑 Token from URL:', token);

            if (token) {
                this.token = token;
                this.isForgotPassword = false;  // Switch to reset password view
                console.log('✅ Switching to reset password view');
            } else {
                this.isForgotPassword = true;   // Show forgot password form
                console.log('📧 No token found, showing forgot password form');
            }
        });
    }

    // Forgot Password - Step 1
    onForgotPassword(): void {
        if (!this.email) {
            this.error = 'Please enter your email address';
            return;
        }

        this.loading = true;
        this.error = '';
        this.message = '';

        this.authService.forgotPassword(this.email).subscribe({
            next: (response: any) => {
                this.loading = false;
                this.isSuccess = true;
                this.message = response.message || 'Password reset link sent to your email.';
                console.log('✅ Reset link sent successfully');
            },
            error: (err: any) => {
                this.loading = false;
                this.isSuccess = false;
                this.error = err.error?.error || 'Something went wrong. Please try again.';
                console.error('❌ Forgot password error:', err);
            }
        });
    }

    // Reset Password - Step 2
    onResetPassword(): void {
        if (!this.token) {
            this.error = 'Invalid reset token';
            return;
        }

        if (!this.newPassword || !this.confirmPassword) {
            this.error = 'Please enter and confirm your new password';
            return;
        }

        if (this.newPassword.length < 6) {
            this.error = 'Password must be at least 6 characters';
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.error = 'Passwords do not match';
            return;
        }

        this.loading = true;
        this.error = '';
        this.message = '';

        this.authService.resetPassword(this.token, this.newPassword).subscribe({
            next: (response: any) => {
                this.loading = false;
                this.isSuccess = true;
                this.message = response.message || 'Password reset successfully!';
                console.log('✅ Password reset successful');
                setTimeout(() => {
                    this.router.navigate(['/login']);
                }, 3000);
            },
            error: (err: any) => {
                this.loading = false;
                this.isSuccess = false;
                this.error = err.error?.error || 'Failed to reset password. Please try again.';
                console.error('❌ Reset password error:', err);
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}