import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentModel } from 'src/app/models/environment-model';
import { EventData } from 'src/app/services/event-bus/event-data';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { EnvironmentEntityService } from 'src/app/components/query-builder/services/entity-services/environment-entity.service';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@tinkoff/ng-polymorpheus';

@Component({
  selector: 'app-connections-dialog',
  templateUrl: './connections-dialog.component.html',
  styleUrls: ['./connections-dialog.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ConnectionsDialogComponent implements OnInit {

  environmentsList$: Observable<EnvironmentModel[]>
  selectedEnvironment: EnvironmentModel | null = null;

  constructor(
    @Inject(POLYMORPHEUS_CONTEXT)
    private readonly context: TuiDialogContext<void>,
    private navigationService: NavigationService,
    private _environmentEntityService: EnvironmentEntityService,
    private eventBus: EventBusService) { }

  ngOnInit() {
    this.environmentsList$ = this._environmentEntityService.getEnvironments()
  }

  selectEnvironment(environment: EnvironmentModel): void {
    this.selectedEnvironment = environment;
  }

  connectToEnvironment(selectedEnv: EnvironmentModel) {

    let currentEnvironmentUrl = this.navigationService.getCurrentEnvironmentUrl()

    if (currentEnvironmentUrl != selectedEnv.url) {
      this.navigationService.navigateToEnv(selectedEnv)
      this.eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null))
      console.warn('env changed')
    }
    this.closeDialog()
  }

  closeDialog(): void {
    this.context.completeWith();
  }
}
