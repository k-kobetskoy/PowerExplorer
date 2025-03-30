import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeActionsComponent } from './node-actions.component';

describe('NodeActionsComponent', () => {
  let component: NodeActionsComponent;
  let fixture: ComponentFixture<NodeActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
