// src/app/components/alerts/alerts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AlertModel } from '../../models/dashboard.models';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="section-label">Alerts & Flags</div>

<div *ngIf="!loading">
  <div class="alert-group" *ngIf="danger.length">
    <div class="group-label danger-label">🔴 Overdue ({{danger.length}})</div>
    <div class="alert-card danger" *ngFor="let a of danger">
      <div class="alert-head">
        <span class="ticket-ref">#{{a.ticketNo}}</span>
        <span class="badge b-red">{{a.priority}}</span>
        <span class="badge b-gray">{{a.entityName}}</span>
        <span class="days-badge danger">{{a.daysOverdue}}d overdue</span>
      </div>
      <div class="alert-title">{{a.title}}</div>
      <div class="alert-meta">Assignee: {{a.assignee || 'Unassigned'}} · Status: {{a.statusName}}</div>
    </div>
  </div>

  <div class="alert-group" *ngIf="warning.length">
    <div class="group-label warn-label">🟡 Due Soon ({{warning.length}})</div>
    <div class="alert-card warn" *ngFor="let a of warning">
      <div class="alert-head">
        <span class="ticket-ref">#{{a.ticketNo}}</span>
        <span class="badge b-amber">{{a.priority}}</span>
        <span class="badge b-gray">{{a.entityName}}</span>
        <span class="days-badge warn">{{a.daysOverdue}}d left</span>
      </div>
      <div class="alert-title">{{a.title}}</div>
      <div class="alert-meta">Assignee: {{a.assignee || 'Unassigned'}} · Status: {{a.statusName}}</div>
    </div>
  </div>

  <div class="empty" *ngIf="danger.length === 0 && warning.length === 0">
    ✅ No alerts — all tickets are on track.
  </div>
</div>

<div class="loading" *ngIf="loading">Loading alerts...</div>
  `,
  styles: [`
    .section-label { font-size:11px; font-weight:700; color:#9c7850; text-transform:uppercase;
                     letter-spacing:.1em; margin-bottom:16px; padding-bottom:8px;
                     border-bottom:1.5px solid #e8dfc8; }
    .alert-group { margin-bottom:24px; }
    .group-label { font-size:12px; font-weight:700; margin-bottom:10px; }
    .danger-label { color:#b81c30; }
    .warn-label { color:#9a5500; }
    .alert-card { background:#fffdf7; border:1.5px solid; border-radius:12px;
                  padding:14px 16px; margin-bottom:10px; }
    .alert-card.danger { border-color:#f5b8c0; background:#fff8f8; }
    .alert-card.warn   { border-color:#f5dfa0; background:#fffdf0; }
    .alert-head { display:flex; gap:6px; align-items:center; margin-bottom:6px; flex-wrap:wrap; }
    .ticket-ref { font-family:'Fira Code',monospace; font-size:11px; color:#9c7850; font-weight:600; }
    .alert-title { font-size:13px; font-weight:600; color:#2a1a0a; margin-bottom:4px; }
    .alert-meta { font-size:11px; color:#9c7850; }
    .days-badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; margin-left:auto; }
    .days-badge.danger { background:#fde0e4; color:#b81c30; }
    .days-badge.warn   { background:#fdf0d0; color:#9a5500; }
    .badge { display:inline-flex; font-size:10px; padding:2px 8px; border-radius:20px; font-weight:700; }
    .b-red   { background:#fde0e4; color:#b81c30; }
    .b-amber { background:#fdf0d0; color:#9a5500; }
    .b-gray  { background:#f9f4e8; color:#5c3d1e; border:1px solid #e8dfc8; }
    .empty { background:#e4f2df; color:#2d6a1f; border-radius:12px; padding:24px;
             text-align:center; font-weight:600; font-size:14px; }
    .loading { color:#9c7850; text-align:center; padding:40px; }
  `]
})
export class AlertsComponent implements OnInit {
  danger: AlertModel[] = [];
  warning: AlertModel[] = [];
  loading = true;

  constructor(private svc: DashboardService) {}

  ngOnInit() {
    this.svc.getAlerts().subscribe(data => {
      this.danger  = data.filter(a => a.alertType === 'danger');
      this.warning = data.filter(a => a.alertType === 'warning');
      this.loading = false;
    });
  }
}
