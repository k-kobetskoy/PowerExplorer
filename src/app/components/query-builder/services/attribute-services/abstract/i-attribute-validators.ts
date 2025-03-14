import { IAttributeOneTimeValidator } from './i-attribute-one-time-validator';
import { IAttributeValidator } from './i-attribute-validator';


export interface IAttributeValidators {
    validators: IAttributeValidator[];
    oneTimeValidators: IAttributeOneTimeValidator[];
}
