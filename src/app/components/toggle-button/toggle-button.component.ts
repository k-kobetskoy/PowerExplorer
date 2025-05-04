import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.css'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleButtonComponent {
  @Input() leftOptionLabel: string = '';
  @Input() rightOptionLabel: string = '';
  @Input() selectedIndex: number = 0;
  @Output() selectionChange = new EventEmitter<number>();

  switchOption(index: number): void {
    if (this.selectedIndex === index) return;
    this.selectedIndex = index;
    this.selectionChange.emit(index);
  }
} 