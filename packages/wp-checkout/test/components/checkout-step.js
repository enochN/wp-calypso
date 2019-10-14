/* @format */

/**
 * External dependencies
 */
import React from 'react';
import { shallow, mount } from 'enzyme';

/**
 * Internal dependencies
 */
import CheckoutStep from '../../src/components/checkout-step';

describe( 'CheckoutStep', function() {
	const componentWithDefaults = <CheckoutStep title={ 'Step' } stepNumber={ 1 } />;
	it( "Default component is selectable by '.checkout-step'", function() {
		expect( shallow( componentWithDefaults ).is( '.checkout-step' ) ).toBe( true );
	} );
	it( "Default component is not selectable by '.checkout-step--is-collapsed'", function() {
		expect( shallow( componentWithDefaults ).is( '.checkout-step--is-collapsed' ) ).toBe( false );
	} );
	it( 'Default component renders title prop', function() {
		expect(
			mount( componentWithDefaults ).contains(
				<span className="checkout-step__title">{ 'Step' }</span>
			)
		).toBe( true ); // eslint-disable-line wpcalypso/jsx-classname-namespace
	} );

	const componentCollapsed = <CheckoutStep title={ 'Step' } stepNumber={ 1 } collapsed={ true } />;
	it( "Collapsed component is selectable by '.checkout-step'", function() {
		expect( shallow( componentCollapsed ).is( '.checkout-step' ) ).toBe( true );
	} );
	it( "Collapsed component is selectable by '.checkout-step--is-collapsed'", function() {
		expect( shallow( componentCollapsed ).is( '.checkout-step--is-collapsed' ) ).toBe( true );
	} );

	const componentWithCustomClass = (
		<CheckoutStep title={ 'Step' } stepNumber={ 1 } className={ 'custom-class' } /> // eslint-disable-line wpcalypso/jsx-classname-namespace
	);
	it( "Component with custom class is selectable by '.checkout-step'", function() {
		expect( shallow( componentWithCustomClass ).is( '.checkout-step' ) ).toBe( true );
	} );
	it( 'Component with custom class is selectable by custom class name', function() {
		expect( shallow( componentWithCustomClass ).is( '.custom-class' ) ).toBe( true );
	} );

	const componentWithTwoCustomClasses = (
		<CheckoutStep title={ 'Step' } stepNumber={ 1 } className={ 'custom-class-1 custom-class-2' } /> // eslint-disable-line wpcalypso/jsx-classname-namespace
	);
	it( "Component with two custom classes is selectable by '.checkout-step'", function() {
		expect( shallow( componentWithTwoCustomClasses ).is( '.checkout-step' ) ).toBe( true );
	} );
	it( 'Component with two custom classes is selectable by first custom class name', function() {
		expect( shallow( componentWithTwoCustomClasses ).is( '.custom-class-1' ) ).toBe( true );
	} );
	it( 'Component with two custom classes is selectable by second custom class name', function() {
		expect( shallow( componentWithTwoCustomClasses ).is( '.custom-class-2' ) ).toBe( true );
	} );

	const componentWithChild = (
		<CheckoutStep title={ 'Step' } stepNumber={ 1 }>
			<br class="child-span" />
		</CheckoutStep>
	);
	it( 'Children are rendered', function() {
		expect( shallow( componentWithChild ).contains( <br class="child-span" /> ) ).toBe( true );
	} );
} );
