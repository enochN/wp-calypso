/**
 * Internal dependencies
 */
import dns from './dns/reducer';
import management from './management/reducer';
import suggestions from './suggestions/reducer';
import transfer from './transfer/reducer';
import { combineReducers } from 'state/utils';

export default combineReducers( {
	dns,
	management,
	suggestions,
	transfer,
} );
