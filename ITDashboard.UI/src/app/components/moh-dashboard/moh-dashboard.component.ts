import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment'; // ✅ adjust path to match your project

@Component({
    selector: 'app-moh-dashboard',
    standalone: true,
    template: `<iframe [src]="proxyUrl" style="width:100%; height:100vh; border:0;"></iframe>`
})
export class MohDashboardComponent {
    proxyUrl: SafeResourceUrl;

    constructor(sanitizer: DomSanitizer) {
        //const url = `${environment.apiUrl}/MOH/proxy?path=/approvalDashboard`;
        const url = `${environment.apiUrl}/api/MOH/proxy?path=/approvalDashboard`;
        this.proxyUrl = sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}