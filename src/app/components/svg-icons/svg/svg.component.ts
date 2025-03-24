import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-svg',
  templateUrl: './svg.component.html'
})
export class SvgComponent implements OnInit {

  constructor() { }
  @Input() class: string = ''
  @Input() fillColor: string = 'none';
  @Input() strokeColor: string = 'currentColor';
  @Input() strokeWidth: string = '1.5';
  @Input() icon: string = '';
  @Input() size: string = '24'
  @Input() useStroke: boolean = false;

  ngOnInit() {
  }

}
