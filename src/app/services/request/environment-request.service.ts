import { Injectable } from '@angular/core';
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { EntityDefinitionsResponseModel } from 'src/app/models/incoming/environment/entity-definitions-response-model';

let parameters = ['LogicalName', 'DisplayName']

@Injectable({
    providedIn: 'root'
})

export class EnvironmentRequestService {
    constructor(private http: HttpClient) { }

    getEntityDefinitions = (apiUrl: string): Observable<EntityDefinitionsResponseModel>=> {
        return this.http.get<EntityDefinitionsResponseModel>(`https://${apiUrl}/api/data/v9.2/EntityDefinitions?$select=${parameters.join(',')}`)
    }
}