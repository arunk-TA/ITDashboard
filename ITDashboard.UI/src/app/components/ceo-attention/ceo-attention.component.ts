import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericRisksComponent } from '../generic-risks/generic-risks.component';

@Component({
    selector: 'app-ceo-attention',
    standalone: true,
    imports: [CommonModule, GenericRisksComponent],
    template: `
        <app-generic-risks 
            pageTitle="CEO Attention Dashboard" 
            addButtonText="Add Item"
            category="ceo_attention"
            [entityId]="1">
        </app-generic-risks>
    `
})
export class CeoAttentionComponent { }