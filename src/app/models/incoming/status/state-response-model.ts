import { PicklistLabelModel } from "../picklist/picklist-label-model";

export interface StateResponseModel {
    Options: StateOption[];
}

export interface StateOption {
    Value: number;
    Label: PicklistLabelModel;
}

export interface StateModel {
    value: number;
    label: string;
}
