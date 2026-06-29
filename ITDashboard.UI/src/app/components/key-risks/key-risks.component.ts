import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericRisksComponent } from '../generic-risks/generic-risks.component';

@Component({
    selector: 'app-key-risks',
    standalone: true,
    imports: [CommonModule, GenericRisksComponent],
    template: `
        <app-generic-risks 
            pageTitle="Key Risks Dashboard" 
            addButtonText="Add Risk"
            category="key_risks"
            [entityId]="1">
        </app-generic-risks>
    `
})
export class KeyRisksComponent { }