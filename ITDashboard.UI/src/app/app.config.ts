import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // 👈 Swapped withInterceptorsFromDi for withInterceptors
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; // 👈 Note the lowercase 'a'

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([authInterceptor]) // 👈 This is how functional interceptors are registered
        )
    ]
};
  