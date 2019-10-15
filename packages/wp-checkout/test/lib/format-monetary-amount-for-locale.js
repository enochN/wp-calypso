/* @format */

/**
 * Internal dependencies
 */
import formatMonetaryAmountForLocale from '../../src/lib/format-monetary-amount-for-locale';

describe( 'formatMonetaryAmountForLocale', function() {
	// US Locale
	it( 'us/USD, $0', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 0 ) ).toBe( '$0' );
	} );
	it( 'us/USD, $0.05', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 5 ) ).toBe( '$0.05' );
	} );
	it( 'us/USD, $0.50', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 50 ) ).toBe( '$0.50' );
	} );
	it( 'us/USD, $5.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 500 ) ).toBe( '$5.00' );
	} );
	it( 'us/USD, $50.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 5000 ) ).toBe( '$50.00' );
	} );
	it( 'us/USD, $500.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 50000 ) ).toBe( '$500.00' );
	} );
	it( 'us/USD, $5,000.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 500000 ) ).toBe( '$5,000.00' );
	} );
	it( 'us/USD, $50,000.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 5000000 ) ).toBe( '$50,000.00' );
	} );
	it( 'us/USD, $500,000.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 50000000 ) ).toBe( '$500,000.00' );
	} );
	it( 'us/USD, $5,000,000.00', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'USD', 500000000 ) ).toBe( '$5,000,000.00' );
	} );

	it( 'us/GBP, £1,234.56', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'GBP', 123456 ) ).toBe( '£1,234.56' );
	} );
	it( 'us/JPY, ¥123,456', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'JPY', 123456 ) ).toBe( '¥123,456' );
	} );
	it( 'us/EUR, €1,234.56', function() {
		expect( formatMonetaryAmountForLocale( 'us', 'EUR', 123456 ) ).toBe( '€1,234.56' );
	} );
} );
