import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment'; // ✅ Add this import

@Component({
    selector: 'app-moh-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div style="height: calc(100vh - 60px); padding: 0; position: relative;">
      <div *ngIf="loading" style="display:flex; justify-content:center; 
                                  align-items:center; height:100%;">
        <div>Loading MOH Dashboard...</div>
      </div>
      <iframe
        *ngIf="!loading"
        [src]="iframeUrl"
        style="width:100%; height:100%; border:none;"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="MOH Dashboard">
      </iframe>
    </div>
  `
})
export class MohDashboardComponent implements OnInit {
    private sanitizer = inject(DomSanitizer);
    iframeUrl!: SafeResourceUrl;
    loading = true;

    ngOnInit() {
        // Point directly to .NET backend port, bypassing Angular router
        const origin = window.location.origin;
        const proxyUrl = `${origin}/api/moh/proxy?path=/approvalDashboard`;
        this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(proxyUrl);
        this.loading = false;
    }
}