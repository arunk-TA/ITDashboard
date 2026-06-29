// src/app/components/cr-pipeline/cr-pipeline.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { CrPipelineModel } from '../../models/dashboard.models';

const STAGE_ORDER = [
  'Requirement Analysis',
  'FD Inprogress', 'FD Completed',
  'TD Inprogress',
  'DEV Inprogress', 'DEV Completed',
  'Testing Inprogress', 'Testing Completed',
  'Demo Completed', 'Ready To Deploy',
  'In Production'
];

// Simplified to 4 visible pipeline columns
const PIPELINE_STAGES: { label: string; statuses: string[]; color: string }[] = [
  { label: 'Analysis / FD',    statuses: ['Requirement Analysis','FD Inprogress','FD Completed','TD Inprogress'], color: '#9a5500' },
  { label: 'Development',      statuses: ['DEV Inprogress','DEV Completed'],                                       color: '#5e3a9a' },
  { label: 'Testing',          statuses: ['Testing Inprogress','Testing Completed','Demo Completed'],               color: '#1a6e63' },
  { label: 'Deployment / Prod',statuses: ['Ready To Deploy','Awaiting Feedback','In Production'],                  color: '#2d6a1f' },
];

@Component({
  selector: 'app-cr-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="section-label">CR Pipeline
  <span class="count-badge">{{allTickets.length}} CRs</span>
</div>

<div class="toolbar">
  <select class="ctrl-select" [(ngModel)]="filterPriority" (change)="applyFilter()">
    <option value="">All Priorities</option>
    <option>P1</option><option>P2</option><option>P3</option><option>P4</option><option>P5</option>
  </select>
  <input class="search-box" type="text" placeholder="Search title / assignee…"
         [(ngModel)]="searchTerm" (input)="applyFilter()"/>
</div>

<div class="pipe-wrap" *ngIf="!loading">
  <div class="pipe-col" *ngFor="let stage of pipelineStages">
    <div class="pipe-header" [style.border-top]="'3px solid ' + stage.color">
      <span>{{stage.label}}</span>
      <span class="pipe-count" [style.background]="stage.color + '20'"
                               [style.color]="stage.color">
        {{getCards(stage.statuses).length}}
      </span>
    </div>
    <div class="pipe-body">
      <div class="pipe-card" *ngFor="let t of getCards(stage.statuses)">
        <div class="pipe-card-id">#{{t.ticketNo}} · {{t.scheduleBuildNo}}</div>
        <div class="pipe-card-title">{{t.title}}</div>
        <div class="pipe-card-proj">{{t.entityName}} — {{t.categoryName}}</div>
        <div class="pipe-card-footer">
          <span class="badge" [ngClass]="priorityClass(t.priorityName)">{{t.priorityName || '—'}}</span>
          <span class="badge b-gray" *ngIf="t.assignee">{{t.assignee}}</span>
        </div>
        <div class="overdue-flag" *ngIf="isOverdue(t.plannedDate)">
          ⚠ Overdue {{daysDiff(t.plannedDate)}}d
        </div>
      </div>
      <div class="empty-lane" *ngIf="getCards(stage.statuses).length === 0">No items</div>
    </div>
  </div>
</div>

<div class="loading" *ngIf="loading">Loading pipeline...</div>
  `,
  styles: [`
    .section-label { font-size:11px; font-weight:700; color:#9c7850; text-transform:uppercase;
                     letter-spacing:.1em; margin-bottom:14px; padding-bottom:8px;
                     border-bottom:1.5px solid #e8dfc8; display:flex; align-items:center; gap:10px; }
    .count-badge { font-size:11px; font-weight:700; background:#fde8e8; color:#8b2020;
                   padding:2px 9px; border-radius:20px; text-transform:none; }
    .toolbar { display:flex; gap:10px; margin-bottom:16px; }
    .ctrl-select { padding:7px 11px; border:1.5px solid #e8dfc8; border-radius:8px;
                   background:#fffdf7; font-size:12px; color:#5c3d1e; outline:none; }
    .search-box { flex:1; max-width:280px; padding:8px 12px; border:1.5px solid #e8dfc8;
                  border-radius:8px; background:#fffdf7; font-size:13px; outline:none;
                  font-family:'Outfit',sans-serif; }

    /* Pipeline */
    .pipe-wrap { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .pipe-col { background:#f9f4e8; border:1.5px solid #e8dfc8; border-radius:14px;
                overflow:hidden; min-width:0; }
    .pipe-header { padding:11px 14px; font-size:11.5px; font-weight:700;
                   border-bottom:1.5px solid #e8dfc8; display:flex; align-items:center;
                   justify-content:space-between; background:#fffdf7; }
    .pipe-count { font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700; }
    .pipe-body { padding:10px; min-height:120px; }
    .pipe-card { background:#fffdf7; border:1.5px solid #e8dfc8; border-radius:10px;
                 padding:11px 13px; margin-bottom:8px; box-shadow:0 1px 4px rgba(42,26,10,.06); }
    .pipe-card-id { font-size:10px; color:#9c7850; font-family:'Fira Code',monospace;
                    margin-bottom:3px; font-weight:500; }
    .pipe-card-title { font-size:12.5px; font-weight:600; margin-bottom:4px;
                       line-height:1.35; color:#2a1a0a; }
    .pipe-card-proj { font-size:11px; color:#9c7850; margin-bottom:7px; }
    .pipe-card-footer { display:flex; gap:4px; flex-wrap:wrap; }
    .overdue-flag { margin-top:6px; font-size:10px; font-weight:700; color:#b81c30; }
    .empty-lane { text-align:center; padding:24px 0; font-size:11.5px; color:#9c7850; }
    .badge { display:inline-flex; font-size:10px; padding:2px 8px; border-radius:20px; font-weight:700; }
    .b-red    { background:#fde0e4; color:#b81c30; }
    .b-amber  { background:#fdf0d0; color:#9a5500; }
    .b-gray   { background:#f9f4e8; color:#5c3d1e; border:1px solid #e8dfc8; }
    .b-green  { background:#e4f2df; color:#2d6a1f; }
    .loading { color:#9c7850; text-align:center; padding:40px; }
  `]
})
export class CrPipelineComponent implements OnInit {
  allTickets: CrPipelineModel[] = [];
  filtered: CrPipelineModel[] = [];
  pipelineStages = PIPELINE_STAGES;
  filterPriority = '';
  searchTerm = '';
  loading = true;

  constructor(private svc: DashboardService) {}

  ngOnInit() {
    this.svc.getCrPipeline().subscribe(data => {
      this.allTickets = data;
      this.filtered = [...data];
      this.loading = false;
    });
  }

  applyFilter() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.allTickets.filter(t =>
      (!this.filterPriority || t.priorityName === this.filterPriority) &&
      (!q || t.title.toLowerCase().includes(q) || (t.assignee ?? '').toLowerCase().includes(q))
    );
  }

  getCards(statuses: string[]): CrPipelineModel[] {
    return this.filtered.filter(t => statuses.includes(t.statusName ?? ''));
  }

  isOverdue(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  daysDiff(date?: string): number {
    if (!date) return 0;
    return Math.ceil((new Date().getTime() - new Date(date).getTime()) / 86400000);
  }

  priorityClass(p?: string): string {
    if (p === 'P1' || p === 'P2') return 'b-red';
    if (p === 'P3') return 'b-amber';
    return 'b-gray';
  }
}
