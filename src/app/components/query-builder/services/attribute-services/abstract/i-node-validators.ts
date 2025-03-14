import { INodeOneTimeValidator } from "./i-node-one-time-validator";
import { INodeValidator } from "./i-node-validator";

export interface INodeValidators {
    validators: INodeValidator[];
    oneTimeValidators: INodeOneTimeValidator[];
}
