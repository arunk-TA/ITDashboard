import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PresentationFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  lastModified: Date;
  pageCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private assetsUrl = '/assets';
  private presentationsUrl = '/api/presentations'; // Optional: API endpoint for PPT management

  constructor(private http: HttpClient) {}

  /**
   * Get all PowerPoint files from the assets folder
   * This uses a dynamic approach - either via API or by scanning assets
   */
  getPresentations(): Observable<PresentationFile[]> {
    // Option 1: If you have an API endpoint that returns the list
    return this.http.get<PresentationFile[]>(this.presentationsUrl);

    // Option 2: If you want to fetch from assets directory using a manifest file
    // return this.http.get<string[]>('/assets/presentation-manifest.json')
    //   .pipe(
    //     map(files => files.map(file => ({
    //       fileName: file,
    //       filePath: `${this.assetsUrl}/${file}`,
    //       fileSize: 0,
    //       lastModified: new Date()
    //     })))
    //   );
  }

  /**
   * Get a specific presentation file
   */
  getPresentation(fileName: string): Observable<Blob> {
    return this.http.get(`${this.assetsUrl}/${fileName}`, { responseType: 'blob' });
  }

  /**
   * Get the total number of pages in a PPT file
   * This would typically require a backend API call
   */
  getPresentationPageCount(fileName: string): Observable<number> {
    return this.http.get<number>(`${this.presentationsUrl}/pages/${fileName}`);
  }

  /**
   * Upload a new presentation
   */
  uploadPresentation(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.presentationsUrl}/upload`, formData);
  }

  /**
   * Delete a presentation
   */
  deletePresentation(fileName: string): Observable<any> {
    return this.http.delete(`${this.presentationsUrl}/${fileName}`);
  }
}