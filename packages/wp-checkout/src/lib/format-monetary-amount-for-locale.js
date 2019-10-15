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
 * All currencies have a *major unit*: for USD it's the dollar, for EUR it's the euro,
 * for JPY it's the yen. Some currencies also have a *minor unit*. The major unit is
 * divided into some number of minor units (e.g. in USD, 1 dollar == 100 cents), and
 * the minor unit is formatted as a decimal part. Most of the time the number of minor
 * units per major unit is a power of ten, either 100 = 10^2 or 1000 = 10^3, and in this
 * case the power (2 or 3) is called the *exponent* of the currency. However there are
 * currencies where the exponent is not an integer because the number of minor units per
 * major unit is not a power of 10.
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

		return groupDigitsAccum(
			remainder,
			[ nextGroup.toString().padStart( 3, '0' ) ].concat( localDigits )
		);
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
 * @param {number} absoluteAmount Number of minor currency units
 * @returns {string}
 */
function minorUnitsAsDecimalForCurrency( currencyCode, absoluteAmount ) {
	const normalizedCurrencyCode = currencyCode.toUpperCase();
	switch ( normalizedCurrencyCode ) {
		case 'AUD':
		case 'CAD':
		case 'EUR':
		case 'GBP':
		case 'NZD':
		case 'USD':
			if ( absoluteAmount < 0 || 100 <= absoluteAmount ) {
				throw '';
			}
			return absoluteAmount.toString().padStart( 2, '0' );

		case 'JPY':
			throw 'Currency does not have a minimal unit: '.concat( normalizedCurrencyCode );

		default:
			throw 'Minor unit format for currency code not defined: '.concat( normalizedCurrencyCode );
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

		case 'BRL':
			return 'R$';

		default:
			throw 'Symbol for currency code not defined: '.concat( normalizedCurrencyCode );
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

/**
 * Returns a human readable name for a given currency code. Throws an error
 * on currencies not supported by the billing backend.
 *
 * @param {string} currencyCode ISO 4217 currency code
 * @returns {string} Human readable currency name
 */
function supportedCurrencyName( currencyCode ) {
	const normalizedCurrencyCode = currencyCode.toUpperCase();
	switch ( normalizedCurrencyCode ) {
		case 'AED':
			return 'United Arab Emirates Dirham';
		case 'AFN':
			return 'Afghan Afghani';
		case 'ALL':
			return 'Albanian Lek';
		case 'AMD':
			return 'Armenian Dram';
		case 'ANG':
			return 'Netherlands Antillean Guilder';
		case 'AOA':
			return 'Angolan Kwanza';
		case 'ARS':
			return 'Argentine Peso';
		case 'AUD':
			return 'Australian Dollar';
		case 'AWG':
			return 'Aruban Florin';
		case 'AZN':
			return 'Azerbaijani Manat';
		case 'BAM':
			return 'Bosnia-Herzegovina Convertible Mark';
		case 'BBD':
			return 'Barbadian Dollar';
		case 'BDT':
			return 'Bangladeshi Taka';
		case 'BGN':
			return 'Bulgarian Lev';
		case 'BHD':
			return 'Bahraini Dinar';
		case 'BIF':
			return 'Burundian Franc';
		case 'BMD':
			return 'Bermudan Dollar';
		case 'BND':
			return 'Brunei Dollar';
		case 'BOB':
			return 'Bolivian Boliviano';
		case 'BRL':
			return 'Brazilian Real';
		case 'BSD':
			return 'Bahamian Dollar';
		case 'BTC':
			return 'Bitcoin';
		case 'BTN':
			return 'Bhutanese Ngultrum';
		case 'BWP':
			return 'Botswanan Pula';
		case 'BYN':
			return 'Belarusian Ruble';
		case 'BZD':
			return 'Belize Dollar';
		case 'CAD':
			return 'Canadian Dollar';
		case 'CDF':
			return 'Congolese Franc';
		case 'CHF':
			return 'Swiss Franc';
		case 'CLF':
			return 'Chilean Unit of Account (UF)';
		case 'CLP':
			return 'Chilean Peso';
		case 'CNH':
			return 'Chinese Yuan (Offshore)';
		case 'CNY':
			return 'Chinese Yuan';
		case 'COP':
			return 'Colombian Peso';
		case 'CRC':
			return 'Costa Rican Colón';
		case 'CUC':
			return 'Cuban Convertible Peso';
		case 'CUP':
			return 'Cuban Peso';
		case 'CVE':
			return 'Cape Verdean Escudo';
		case 'CZK':
			return 'Czech Republic Koruna';
		case 'DJF':
			return 'Djiboutian Franc';
		case 'DKK':
			return 'Danish Krone';
		case 'DOP':
			return 'Dominican Peso';
		case 'DZD':
			return 'Algerian Dinar';
		case 'EGP':
			return 'Egyptian Pound';
		case 'ERN':
			return 'Eritrean Nakfa';
		case 'ETB':
			return 'Ethiopian Birr';
		case 'EUR':
			return 'Euro';
		case 'FJD':
			return 'Fijian Dollar';
		case 'FKP':
			return 'Falkland Islands Pound';
		case 'GBP':
			return 'British Pound Sterling';
		case 'GEL':
			return 'Georgian Lari';
		case 'GGP':
			return 'Guernsey Pound';
		case 'GHS':
			return 'Ghanaian Cedi';
		case 'GIP':
			return 'Gibraltar Pound';
		case 'GMD':
			return 'Gambian Dalasi';
		case 'GNF':
			return 'Guinean Franc';
		case 'GTQ':
			return 'Guatemalan Quetzal';
		case 'GYD':
			return 'Guyanaese Dollar';
		case 'HKD':
			return 'Hong Kong Dollar';
		case 'HNL':
			return 'Honduran Lempira';
		case 'HRK':
			return 'Croatian Kuna';
		case 'HTG':
			return 'Haitian Gourde';
		case 'HUF':
			return 'Hungarian Forint';
		case 'IDR':
			return 'Indonesian Rupiah';
		case 'ILS':
			return 'Israeli New Sheqel';
		case 'IMP':
			return 'Manx pound';
		case 'INR':
			return 'Indian Rupee';
		case 'IQD':
			return 'Iraqi Dinar';
		case 'IRR':
			return 'Iranian Rial';
		case 'ISK':
			return 'Icelandic Króna';
		case 'JEP':
			return 'Jersey Pound';
		case 'JMD':
			return 'Jamaican Dollar';
		case 'JOD':
			return 'Jordanian Dinar';
		case 'JPY':
			return 'Japanese Yen';
		case 'KES':
			return 'Kenyan Shilling';
		case 'KGS':
			return 'Kyrgystani Som';
		case 'KHR':
			return 'Cambodian Riel';
		case 'KMF':
			return 'Comorian Franc';
		case 'KPW':
			return 'North Korean Won';
		case 'KRW':
			return 'South Korean Won';
		case 'KWD':
			return 'Kuwaiti Dinar';
		case 'KYD':
			return 'Cayman Islands Dollar';
		case 'KZT':
			return 'Kazakhstani Tenge';
		case 'LAK':
			return 'Laotian Kip';
		case 'LBP':
			return 'Lebanese Pound';
		case 'LKR':
			return 'Sri Lankan Rupee';
		case 'LRD':
			return 'Liberian Dollar';
		case 'LSL':
			return 'Lesotho Loti';
		case 'LYD':
			return 'Libyan Dinar';
		case 'MAD':
			return 'Moroccan Dirham';
		case 'MDL':
			return 'Moldovan Leu';
		case 'MGA':
			return 'Malagasy Ariary';
		case 'MKD':
			return 'Macedonian Denar';
		case 'MMK':
			return 'Myanma Kyat';
		case 'MNT':
			return 'Mongolian Tugrik';
		case 'MOP':
			return 'Macanese Pataca';
		case 'MRO':
			return 'Mauritanian Ouguiya';
		case 'MUR':
			return 'Mauritian Rupee';
		case 'MVR':
			return 'Maldivian Rufiyaa';
		case 'MWK':
			return 'Malawian Kwacha';
		case 'MXN':
			return 'Mexican Peso';
		case 'MYR':
			return 'Malaysian Ringgit';
		case 'MZN':
			return 'Mozambican Metical';
		case 'NAD':
			return 'Namibian Dollar';
		case 'NGN':
			return 'Nigerian Naira';
		case 'NIO':
			return 'Nicaraguan Córdoba';
		case 'NOK':
			return 'Norwegian Krone';
		case 'NPR':
			return 'Nepalese Rupee';
		case 'NZD':
			return 'New Zealand Dollar';
		case 'OMR':
			return 'Omani Rial';
		case 'PAB':
			return 'Panamanian Balboa';
		case 'PEN':
			return 'Peruvian Nuevo Sol';
		case 'PGK':
			return 'Papua New Guinean Kina';
		case 'PHP':
			return 'Philippine Peso';
		case 'PKR':
			return 'Pakistani Rupee';
		case 'PLN':
			return 'Polish Zloty';
		case 'PYG':
			return 'Paraguayan Guarani';
		case 'QAR':
			return 'Qatari Rial';
		case 'RON':
			return 'Romanian Leu';
		case 'RSD':
			return 'Serbian Dinar';
		case 'RUB':
			return 'Russian Ruble';
		case 'RWF':
			return 'Rwandan Franc';
		case 'SAR':
			return 'Saudi Riyal';
		case 'SBD':
			return 'Solomon Islands Dollar';
		case 'SCR':
			return 'Seychellois Rupee';
		case 'SDG':
			return 'Sudanese Pound';
		case 'SEK':
			return 'Swedish Krona';
		case 'SGD':
			return 'Singapore Dollar';
		case 'SHP':
			return 'Saint Helena Pound';
		case 'SLL':
			return 'Sierra Leonean Leone';
		case 'SOS':
			return 'Somali Shilling';
		case 'SRD':
			return 'Surinamese Dollar';
		case 'SSP':
			return 'South Sudanese Pound';
		case 'STD':
			return 'São Tomé and Príncipe Dobra';
		case 'SVC':
			return 'Salvadoran Colón';
		case 'SYP':
			return 'Syrian Pound';
		case 'SZL':
			return 'Swazi Lilangeni';
		case 'THB':
			return 'Thai Baht';
		case 'TJS':
			return 'Tajikistani Somoni';
		case 'TMT':
			return 'Turkmenistani Manat';
		case 'TND':
			return 'Tunisian Dinar';
		case 'TOP':
			return 'Tongan Paanga';
		case 'TRY':
			return 'Turkish Lira';
		case 'TTD':
			return 'Trinidad and Tobago Dollar';
		case 'TWD':
			return 'New Taiwan Dollar';
		case 'TZS':
			return 'Tanzanian Shilling';
		case 'UAH':
			return 'Ukrainian Hryvnia';
		case 'UGX':
			return 'Ugandan Shilling';
		case 'USD':
			return 'United States Dollar';
		case 'UYU':
			return 'Uruguayan Peso';
		case 'UZS':
			return 'Uzbekistan Som';
		case 'VEF':
			return 'Venezuelan Bolívar Fuerte';
		case 'VND':
			return 'Vietnamese Dong';
		case 'VUV':
			return 'Vanuatu Vatu';
		case 'WST':
			return 'Samoan Tala';
		case 'XAF':
			return 'CFA Franc BEAC';
		case 'XCD':
			return 'East Caribbean Dollar';
		case 'XOF':
			return 'CFA Franc BCEAO';
		case 'XPF':
			return 'CFP Franc';
		case 'YER':
			return 'Yemeni Rial';
		case 'ZAR':
			return 'South African Rand';
		case 'ZMW':
			return 'Zambian Kwacha';
		case 'ZWL':
			return 'Zimbabwean Dollar';

		default:
			throw 'Currency not supported.';
	}
}
