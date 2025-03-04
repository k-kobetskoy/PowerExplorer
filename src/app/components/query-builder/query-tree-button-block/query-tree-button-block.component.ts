import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';

@Component({
  selector: 'app-query-tree-button-block',
  templateUrl: './query-tree-button-block.component.html',
  styleUrls: ['./query-tree-button-block.component.css']
})
export class QueryTreeButtonBlockComponent implements OnInit {

  @Output() executeXmlRequest = new EventEmitter<void>()

  buttonDisabled$: Observable<boolean>;

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() {
    this.setToggleButtonState();
  }

  execute() {
    this.executeXmlRequest.emit();
  }

  private getEntityNodeSetName(): BehaviorSubject<string> {
    return this.nodeTreeProcessor.getNodeTree().value.root.next.entitySetName$;
  }

  setToggleButtonState(): void {
    this.buttonDisabled$ = this.getEntityNodeSetName().pipe(
      map(entitySetName => { return !entitySetName }))
  }
}
