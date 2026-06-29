// src/app/components/releases/releases.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { ReleaseHistoryModel } from '../../models/dashboard.models';

@Component({
  selector: 'app-releases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="section-label">Release History</div>

<div class="toolbar">
  <input class="search-box" type="text" placeholder="Search build / title…"
         [(ngModel)]="searchTerm" (input)="applyFilter()"/>
</div>

<div class="card" *ngIf="!loading">
  <table class="tbl">
    <thead>
      <tr>
        <th>Build No</th>
        <th>Release Date</th>
        <th>Title</th>
        <th>Entity</th>
        <th>Category</th>
        <th>Platform</th>
        <th>Assignee</th>
        <th>Status</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let r of filtered">
        <td class="mono">{{r.scheduleBuildNo || '—'}}</td>
        <td>{{r.scheduleBuildDate ? (r.scheduleBuildDate | date:'dd MMM yyyy') : '—'}}</td>
        <td>{{r.title}}</td>
        <td><span class="badge b-teal">{{r.entityName || '—'}}</span></td>
        <td>{{r.categoryName || '—'}}</td>
        <td>{{r.platformName || '—'}}</td>
        <td>{{r.assignee || '—'}}</td>
        <td><span class="badge" [ngClass]="statusClass(r.statusName)">{{r.statusName || '—'}}</span></td>
        <td class="remarks">{{r.remarks || '—'}}</td>
      </tr>
    </tbody>
  </table>
  <div class="empty" *ngIf="filtered.length === 0">No releases found.</div>
</div>
<div class="loading" *ngIf="loading">Loading releases…</div>
  `,
  styles: [`
    .section-label { font-size:11px; font-weight:700; color:#9c7850; text-transform:uppercase;
                     letter-spacing:.1em; margin-bottom:14px; padding-bottom:8px;
                     border-bottom:1.5px solid #e8dfc8; }
    .toolbar { margin-bottom:14px; }
    .search-box { padding:8px 12px; border:1.5px solid #e8dfc8; border-radius:8px;
                  background:#fffdf7; font-size:13px; width:280px; outline:none;
                  font-family:'Outfit',sans-serif; }
    .card { background:#fffdf7; border:1.5px solid #e8dfc8; border-radius:14px;
            padding:0; box-shadow:0 1px 4px rgba(42,26,10,.08); overflow:auto; }
    .tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
    .tbl th { text-align:left; padding:10px 13px; font-size:10px; font-weight:700;
              color:#9c7850; background:#f9f4e8; border-bottom:1.5px solid #e8dfc8;
              white-space:nowrap; text-transform:uppercase; letter-spacing:.06em; }
    .tbl td { padding:10px 13px; border-bottom:1px solid #e8dfc8; vertical-align:middle; }
    .tbl tr:last-child td { border-bottom:none; }
    .tbl tr:hover td { background:#fdf8f0; }
    .mono { font-family:'Fira Code',monospace; font-size:11.5px; }
    .remarks { font-size:11px; color:#9c7850; max-width:220px; white-space:normal; }
    .badge { display:inline-flex; font-size:10px; padding:2px 8px; border-radius:20px; font-weight:700; }
    .b-teal   { background:#d8f0ed; color:#1a6e63; }
    .b-green  { background:#e4f2df; color:#2d6a1f; }
    .b-amber  { background:#fdf0d0; color:#9a5500; }
    .b-gray   { background:#f9f4e8; color:#5c3d1e; border:1px solid #e8dfc8; }
    .empty { text-align:center; padding:32px; color:#9c7850; }
    .loading { color:#9c7850; text-align:center; padding:40px; }
  `]
})
export class ReleasesComponent implements OnInit {
  all: ReleaseHistoryModel[] = [];
  filtered: ReleaseHistoryModel[] = [];
  searchTerm = '';
  loading = true;

  constructor(private svc: DashboardService) {}

  ngOnInit() {
    this.svc.getReleases().subscribe(data => {
      this.all = data;
      this.filtered = [...data];
      this.loading = false;
    });
  }

  applyFilter() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.all.filter(r =>
      !q ||
      (r.title ?? '').toLowerCase().includes(q) ||
      (r.scheduleBuildNo ?? '').toLowerCase().includes(q) ||
      (r.entityName ?? '').toLowerCase().includes(q)
    );
  }

  statusClass(s?: string): string {
    if (!s) return 'b-gray';
    if (s.includes('Production')) return 'b-green';
    if (s.includes('Hold') || s.includes('Dependency')) return 'b-amber';
    return 'b-gray';
  }
}
