import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface PPTFile {
    fileName: string;
    displayName: string;
    sizeKb: number;
    modifiedDate: string;
}

@Component({
    selector: 'app-presentations',
    templateUrl: './presentations.component.html',
    styleUrls: ['./presentations.component.css'],
    standalone: true,
    imports: [CommonModule, FormsModule]
})
export class PresentationsComponent implements OnInit {
    presentations: PPTFile[] = [];
    filteredPresentations: PPTFile[] = [];
    loading = false;
    searchTerm = '';
    selectedPresentation: PPTFile | null = null;
    pptUrl: SafeResourceUrl | null = null;
    showViewer = false;
    errorMessage = '';
    successMessage = '';
    viewerType: 'google' | 'microsoft' | 'direct' = 'google';
    isDownloading = false;
    isUploading = false;
    previewError = false;
    totalFiles = 0;

    private apiBase = '/api/presentations';

    constructor(private sanitizer: DomSanitizer, private http: HttpClient) { }

    ngOnInit(): void {
        this.loadPresentations();
    }

    loadPresentations(): void {
        this.loading = true;
        this.errorMessage = '';

        this.http.get<PPTFile[]>(this.apiBase).subscribe({
            next: (files) => {
                this.presentations = files;
                this.filteredPresentations = files;
                this.totalFiles = files.length;
                this.loading = false;
                if (files.length === 0) {
                    this.errorMessage = 'No presentations uploaded yet.';
                }
            },
            error: () => {
                this.errorMessage = 'Failed to load presentations list.';
                this.loading = false;
            }
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (!file.name.toLowerCase().endsWith('.pptx')) {
            this.errorMessage = 'Only .pptx files are allowed.';
            input.value = '';
            return;
        }

        this.uploadFile(file);
        input.value = ''; // reset so same file can be re-selected later
    }

    uploadFile(file: File): void {
        this.isUploading = true;
        this.errorMessage = '';
        this.successMessage = '';

        const formData = new FormData();
        formData.append('file', file);

        this.http.post(`${this.apiBase}/upload`, formData).subscribe({
            next: () => {
                this.isUploading = false;
                this.successMessage = `${file.name} uploaded successfully.`;
                this.loadPresentations();
            },
            error: (err) => {
                this.isUploading = false;
                this.errorMessage = err?.error?.title || err?.error || 'Upload failed.';
            }
        });
    }

    deletePresentation(ppt: PPTFile, event: Event): void {
        event.stopPropagation();
        if (!confirm(`Delete "${ppt.displayName}"? This cannot be undone.`)) return;

        this.http.delete(`${this.apiBase}/${encodeURIComponent(ppt.fileName)}`).subscribe({
            next: () => {
                this.successMessage = 'Deleted successfully.';
                if (this.selectedPresentation === ppt) this.closeViewer();
                this.loadPresentations();
            },
            error: () => {
                this.errorMessage = 'Failed to delete file.';
            }
        });
    }

    searchPresentations(): void {
        const search = this.searchTerm.toLowerCase().trim();
        this.filteredPresentations = !search
            ? this.presentations
            : this.presentations.filter(p =>
                p.fileName.toLowerCase().includes(search) ||
                p.displayName.toLowerCase().includes(search));
    }

    viewPresentation(ppt: PPTFile): void {
        this.selectedPresentation = ppt;
        this.showViewer = true;
        this.previewError = false;
        this.errorMessage = '';
        this.loadPPTPreview(ppt);
    }

    loadPPTPreview(ppt: PPTFile): void {
        const fileUrl = `${window.location.origin}${this.apiBase}/download/${encodeURIComponent(ppt.fileName)}`;
        const encodedUrl = encodeURIComponent(fileUrl);

        if (this.viewerType === 'google') {
            this.pptUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
                `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`);
        } else if (this.viewerType === 'microsoft') {
            this.pptUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
                `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`);
        } else {
            this.downloadPresentation(ppt);
        }
    }

    switchViewer(type: 'google' | 'microsoft' | 'direct'): void {
        this.viewerType = type;
        this.previewError = false;
        if (this.selectedPresentation) this.loadPPTPreview(this.selectedPresentation);
    }

    downloadPresentation(ppt: PPTFile): void {
        this.isDownloading = true;
        window.open(`${window.location.origin}${this.apiBase}/download/${encodeURIComponent(ppt.fileName)}`, '_blank');
        setTimeout(() => this.isDownloading = false, 2000);
    }

    handleIframeError(): void {
        this.previewError = true;
    }

    closeViewer(): void {
        this.showViewer = false;
        this.selectedPresentation = null;
        this.pptUrl = null;
        this.previewError = false;
    }

    toggleViewer(): void {
        this.showViewer = !this.showViewer;
        if (!this.showViewer) { this.pptUrl = null; this.previewError = false; }
    }

    getFileIcon(): string { return '📊'; }

    refreshList(): void { this.loadPresentations(); }
}