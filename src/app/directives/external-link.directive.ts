import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { ExternalLinkService } from '../services/external-link.service';

@Directive({
  selector: 'a[href]'
})
export class ExternalLinkDirective {
  @Input() href: string = '';
  @Input() target: string = '';

  constructor(
    private el: ElementRef,
    private externalLinkService: ExternalLinkService
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    // Skip processing if:
    // - No href
    // - Not targeting _blank
    // - Not a normal left-click
    // - Ctrl/Alt/Shift/Meta pressed (browser handles these cases)
    if (
      !this.href || 
      this.target !== '_blank' || 
      event.button !== 0 || 
      event.ctrlKey || 
      event.altKey || 
      event.shiftKey || 
      event.metaKey
    ) {
      return;
    }

    // Prevent default browser navigation
    event.preventDefault();
    
    // Use our service to open the link
    this.externalLinkService.openExternalLink(this.href);
  }
} 