import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { JSONSchemaToZod } from '../src/JSONSchemaToZod';
import { type JSONSchema } from '../src/Type';

describe('JSONSchemaToZod Conditional Validation', () => {
	it('should handle if-then-else conditional validation for postal codes', () => {
		const jsonSchema: JSONSchema = {
			type: 'object',
			properties: {
				street_address: {
					type: 'string'
				},
				country: {
					default: 'United States of America',
					enum: ['United States of America', 'Canada']
				},
				postal_code: {
					type: 'string'
				}
			},
			if: {
				properties: {
					country: { const: 'United States of America' }
				}
			},
			then: {
				properties: {
					postal_code: { pattern: '[0-9]{5}(-[0-9]{4})?' }
				}
			},
			else: {
				properties: {
					postal_code: { pattern: '[A-Z][0-9][A-Z] [0-9][A-Z][0-9]' }
				}
			}
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be a refined schema (ZodEffects wrapping ZodObject)
		expect(zodSchema).toBeInstanceOf(z.ZodEffects);

		// Should accept US address with valid US postal code
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			country: 'United States of America',
			postal_code: '12345'
		})).not.toThrow();

		// Should accept US address with valid US postal code with extension
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			country: 'United States of America',
			postal_code: '12345-6789'
		})).not.toThrow();

		// Should reject US address with invalid US postal code
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			country: 'United States of America',
			postal_code: 'A1B 2C3'
		})).toThrow(ZodError);

		// Should accept Canadian address with valid Canadian postal code
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			country: 'Canada',
			postal_code: 'A1B 2C3'
		})).not.toThrow();

		// Should reject Canadian address with invalid Canadian postal code
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			country: 'Canada',
			postal_code: '12345'
		})).toThrow(ZodError);

		// Should use default country (US) if not specified
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			postal_code: '12345'
		})).not.toThrow();

		// Should reject default country (US) with invalid postal code
		expect(() => zodSchema.parse({
			street_address: '123 Main St',
			postal_code: 'A1B 2C3'
		})).toThrow(ZodError);
	});

	it('should handle simple if-then condition without else', () => {
		const jsonSchema: JSONSchema = {
			type: 'object',
			properties: {
				age: { type: 'number' },
				drivingLicense: { type: 'string' }
			},
			if: {
				properties: {
					age: { minimum: 18 }
				}
			},
			then: {
				required: ['drivingLicense']
			}
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept adult with driving license
		expect(() => zodSchema.parse({
			age: 21,
			drivingLicense: 'ABC123'
		})).not.toThrow();

		// Should reject adult without driving license
		expect(() => zodSchema.parse({
			age: 21
		})).toThrow(ZodError);

		// Should accept minor without driving license
		expect(() => zodSchema.parse({
			age: 16
		})).not.toThrow();
	});

	it('should handle nested conditional validation', () => {
		const jsonSchema: JSONSchema = {
			type: 'object',
			properties: {
				paymentMethod: { 
					type: 'string',
					enum: ['credit_card', 'bank_transfer', 'paypal']
				},
				creditCardNumber: { type: 'string' },
				bankAccount: { type: 'string' },
				paypalEmail: { type: 'string', format: 'email' }
			},
			required: ['paymentMethod'],
			if: {
				properties: {
					paymentMethod: { const: 'credit_card' }
				}
			},
			then: {
				required: ['creditCardNumber']
			},
			else: {
				if: {
					properties: {
						paymentMethod: { const: 'bank_transfer' }
					}
				},
				then: {
					required: ['bankAccount']
				},
				else: {
					required: ['paypalEmail']
				}
			}
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept credit card payment with credit card number
		expect(() => zodSchema.parse({
			paymentMethod: 'credit_card',
			creditCardNumber: '4111111111111111'
		})).not.toThrow();

		// Should reject credit card payment without credit card number
		expect(() => zodSchema.parse({
			paymentMethod: 'credit_card'
		})).toThrow(ZodError);

		// Should accept bank transfer with bank account
		expect(() => zodSchema.parse({
			paymentMethod: 'bank_transfer',
			bankAccount: '123456789'
		})).not.toThrow();

		// Should reject bank transfer without bank account
		expect(() => zodSchema.parse({
			paymentMethod: 'bank_transfer'
		})).toThrow(ZodError);

		// Should accept paypal with email
		expect(() => zodSchema.parse({
			paymentMethod: 'paypal',
			paypalEmail: 'test@example.com'
		})).not.toThrow();

		// Should reject paypal without email
		expect(() => zodSchema.parse({
			paymentMethod: 'paypal'
		})).toThrow(ZodError);

		// Should reject paypal with invalid email
		expect(() => zodSchema.parse({
			paymentMethod: 'paypal',
			paypalEmail: 'invalid-email'
		})).toThrow(ZodError);
	});
});