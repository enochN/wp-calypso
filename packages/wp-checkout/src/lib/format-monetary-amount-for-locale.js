/* @format */

/**
 * External dependencies
 */
import { isString } from 'lodash';

/**
 * Format a monetary amount according to the custom of a given locale.
 *
 * Displaying monetary amounts depends on
 *   (1) the currency being displayed; this determines whether or not we need to
 *       handle a fractional part (e.g. yen) and what symbols to display (e.g. $ and JPY)
 *   (2) the user's locale; this determines how decimal numbers are formatted and
 *       how digit groups are displayed for large numbers, as well as the placement of symbols
 *
 * Getting this right is an important part of localization.
 *
 * The rules for this are not standardized and each region/currency has idiosyncrasies.
 * This function tries very hard to do the right thing but should default to something sensible.
 * It is essentially a big switch statement on locale and currency.
 *
 * Surprisingly there are no standard documents on country-level currency formatting,
 * but the following resources are helpful:
 *     https://www.thefinancials.com/Default.aspx?SubSectionID=curformat
 *     https://publications.europa.eu/code/en/en-370303.htm
 *     https://en.wikipedia.org/wiki/ISO_4217
 *     https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
 *     https://en.wikipedia.org/wiki/Currency_symbol
 *     https://en.wikipedia.org/wiki/Decimal_separator
 *
 * @param {string} localeCode ISO 3166-1 alpha-2 region code
 * @param {string} currencyCode ISO 4217 currency code
 * @param {number} amount In minor currency units
 * @returns {string} Formatted monetary amount
 */
export default function formatMonetaryAmountForLocale( localeCode, currencyCode, amount ) {
	// Validate input
	if ( ! isString( localeCode ) ) {
		throw 'locale parameter must be a string.';
	}
	if ( ! isString( currencyCode ) ) {
		throw 'currency parameter must be a string.';
	}
	if ( ! ( typeof amount === 'number' || amount instanceof Number ) ) {
		throw 'amount parameter must be a number.';
	}
	if ( ! Number.isInteger( amount ) ) {
		throw 'amount parameter must be an integer.';
	}

	const absoluteAmount = Math.abs( amount );
	const amountSign = Math.sign( amount );
	const normalizedLocaleCode = localeCode.toLowerCase();
	const normalizedCurrencyCode = currencyCode.toUpperCase();

	switch ( normalizedLocaleCode ) {
		case 'us':
			switch ( normalizedCurrencyCode ) {
				case 'USD':
				case 'JPY':
				case 'GBP':
                case 'EUR':
                    return formatSymbolAmount(
                        amountSign,
                        absoluteAmount,
                        normalizedLocaleCode,
                        normalizedCurrencyCode
                    );
				default:
					return formatSymbolAmountCode(
						amountSign,
						absoluteAmount,
						normalizedLocaleCode,
						normalizedCurrencyCode
					);
			}

		default:
			throw 'Unhandled locale';
	}
}

/**
 * Symbol and amount, e.g. $100.
 *
 * @param amountSign
 * @param absoluteAmount
 * @param localeCode
 * @param currencyCode
 * @returns {string}
 */
function formatSymbolAmount( amountSign, absoluteAmount, localeCode, currencyCode ) {
	const symbol = symbolForCurrency( currencyCode );
	const sign = amountSign >= 0 ? '' : '-';

	if ( 0 === amountSign ) {
		return symbol.concat( '0' );
	}

	return sign.concat(
		symbol.concat(
			renderAmountWithSeparatorsForCurrencyAndLocale( absoluteAmount, localeCode, currencyCode )
		)
	);
}

/**
 * Symbol, amount, and currency code, e.g. $100 NZD.
 * @param amountSign
 * @param absoluteAmount
 * @param localeCode
 * @param currencyCode
 */
function formatSymbolAmountCode( amountSign, absoluteAmount, localeCode, currencyCode ) {
	return formatSymbolAmount( amountSign, absoluteAmount, localeCode, currencyCode ).concat(
		' '.concat( currencyCode )
	);
}

function renderAmountWithSeparatorsForCurrencyAndLocale(
	absoluteAmount,
	localeCode,
	currencyCode
) {
	const { integerPart, fractionalPart } = digitGroupsOfAmountForCurrency(
		currencyCode,
		absoluteAmount
	);
	const { decimalSeparator, groupSeparator } = separatorsForLocale( localeCode );

	const base = minorUnitsPerMajorUnitForCurrency( currencyCode );

	if ( 1 === base ) {
		return integerPart.join( groupSeparator );
	}

	return integerPart
		.join( groupSeparator )
		.concat( decimalSeparator )
		.concat( fractionalPart );
}

/**
 * Separate an amount into its fractional part and grouped digits of the integer part.
 *
 * @param {string} currencyCode ISO 4217 currency code
 * @param {number} absoluteAmount Amount in minimal currency units
 * @returns {object}
 */
function digitGroupsOfAmountForCurrency( currencyCode, absoluteAmount ) {
	if ( ! ( Number.isInteger( absoluteAmount ) && absoluteAmount >= 0 ) ) {
		throw 'absoluteAmount parameter must be a nonnegative integer.';
	}

	// Zero money is a special case.
	if ( 0 === absoluteAmount ) {
		const fractionalPart = minorUnitsAsDecimalForCurrency( currencyCode, 0 );
		return { integerPart: [ '0' ], fractionalPart: fractionalPart };
	}

	const base = minorUnitsPerMajorUnitForCurrency( currencyCode );

	// Currencies with no minor unit are a special case.
	if ( 1 === base ) {
		return { integerPart: groupDigits( absoluteAmount ) };
	}

	const fractionalPart = minorUnitsAsDecimalForCurrency( currencyCode, absoluteAmount % base );
	const majorUnitAmount = Math.floor( absoluteAmount / base );

	return { integerPart: groupDigits( majorUnitAmount ), fractionalPart: fractionalPart };
}

/**
 * Computes the base 1000 digits of an integer as an array of strings from most to least significant.
 *
 * @param {number} amount Number to decompose
 * @returns {array} Base 1000 digits as strings, from most to least significant
 */
function groupDigits( amount ) {
	function groupDigitsAccum( localAmount, localDigits ) {
		if ( localAmount < 1000 ) {
			return [ localAmount.toString() ].concat( localDigits );
		}

		const nextGroup = localAmount % 1000;
		const remainder = Math.floor( localAmount / 1000 );

		return groupDigitsAccum( remainder, [ nextGroup.toString().padStart( 3, '0' ) ].concat( localDigits ) );
	}

	return groupDigitsAccum( amount, [] );
}

/**
 * Number of minor units per major unit. When expressed as a power of 10 this is called the exponent.
 * Some currencies have non-integer exponents (e.g. Madagascar) so we return the raw number instead.
 *
 * @param {string} currencyCode ISO 4217 currency code
 * @returns {number} Number of minor currency units per major unit
 */
function minorUnitsPerMajorUnitForCurrency( currencyCode ) {
	const normalizedCurrencyCode = currencyCode.toUpperCase();
	switch ( normalizedCurrencyCode ) {
		case 'JPY':
			return 1;

		case 'BRL':
		case 'CAD':
		case 'EUR':
		case 'GBP':
		case 'NZD':
		case 'USD':
			return 100;

		default:
			throw 'Unknown currency exponent';
	}
}

/**
 * Formats fractional currency units; different currencies have different customs
 *
 * @param {string} currencyCode ISO 4217 currency code
 * @param {number} absoluteAmount Number of minimal currency units
 * @returns {string}
 */
function minorUnitsAsDecimalForCurrency( currencyCode, absoluteAmount ) {
	const normalizedCurrencyCode = currencyCode.toUpperCase();
	switch ( normalizedCurrencyCode ) {
		case 'EUR':
		case 'GBP':
		case 'NZD':
		case 'USD':
			return absoluteAmount.toString().padStart( 2, '0' );

		case 'JPY':
			throw 'Currency does not have a minimal unit.';

		default:
			throw 'Unknown minor unit format';
	}
}

/**
 * Graphical currency symbol
 *
 * @param {string} currencyCode ISO 4217 currency code
 * @returns {string} Currency symbol
 */
function symbolForCurrency( currencyCode ) {
	const normalizedCurrencyCode = currencyCode.toUpperCase();
	switch ( normalizedCurrencyCode ) {
		case 'AUD':
		case 'CAD':
		case 'NZD':
		case 'USD':
			return '$';

        case 'GBP':
            return '£';

        case 'EUR':
            return '€';

        case 'JPY':
            return '¥';

		default:
			throw 'Unknown currency symbol';
	}
}

/**
 * Customary decimal and group separators in a given locale.
 *
 * @param {string} localeCode ISO 3166-1 alpha-2 region code
 * @returns {{decimalSeparator:string, groupSeparator:string}} Decimal and group separators
 */
function separatorsForLocale( localeCode ) {
	const normalizedLocaleCode = localeCode.toLowerCase();
	switch ( normalizedLocaleCode ) {
		case 'gb': // United Kingdom
		case 'jp': // Japan
		case 'nz': // New Zealand
		case 'us': // United States
			return { decimalSeparator: '.', groupSeparator: ',' };

		case 'au': // Australia
			return { decimalSeparator: '.', groupSeparator: ' ' };

		case 'br': // Brazil
			return { decimalSeparator: ',', groupSeparator: '.' };
	}
}
