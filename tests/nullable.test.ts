import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { JSONSchemaToZod } from '../src/JSONSchemaToZod';
import { type JSONSchema } from '../src/Type';

describe('JSONSchemaToZod Nullable Types', () => {
	it('should handle nullable string using type array', () => {
		const jsonSchema: JSONSchema = { type: ['string', 'null'] };
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be a nullable string schema
		expect(zodSchema).toBeInstanceOf(z.ZodNullable);
		
		// Should accept string values
		expect(() => zodSchema.parse('test')).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject other types
		expect(() => zodSchema.parse(123)).toThrow(ZodError);
		expect(() => zodSchema.parse(true)).toThrow(ZodError);
	});

	it('should handle nullable string with format', () => {
		const jsonSchema: JSONSchema = { 
			type: ['string', 'null'],
			format: 'email'
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept valid email
		expect(() => zodSchema.parse('test@example.com')).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject invalid email
		expect(() => zodSchema.parse('not-an-email')).toThrow(ZodError);
	});

	it('should handle nullable number', () => {
		const jsonSchema: JSONSchema = { type: ['number', 'null'] };
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept number values
		expect(() => zodSchema.parse(42)).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject other types
		expect(() => zodSchema.parse('test')).toThrow(ZodError);
	});

	it('should handle multiple non-null types with null', () => {
		const jsonSchema: JSONSchema = { type: ['string', 'number', 'null'] };
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept string values
		expect(() => zodSchema.parse('test')).not.toThrow();
		
		// Should accept number values
		expect(() => zodSchema.parse(42)).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject other types
		expect(() => zodSchema.parse(true)).toThrow(ZodError);
	});

	it('should handle nullable in object properties', () => {
		const jsonSchema: JSONSchema = {
			type: 'object',
			properties: {
				requiredString: { type: 'string' },
				nullableString: { type: ['string', 'null'] }
			},
			required: ['requiredString']
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept object with string in nullable field
		expect(() => zodSchema.parse({
			requiredString: 'hello',
			nullableString: 'world'
		})).not.toThrow();

		// Should accept object with null in nullable field
		expect(() => zodSchema.parse({
			requiredString: 'hello',
			nullableString: null
		})).not.toThrow();

		// Should accept object without the optional nullable field
		expect(() => zodSchema.parse({
			requiredString: 'hello'
		})).not.toThrow();

		// Should reject object with wrong type in nullable field
		expect(() => zodSchema.parse({
			requiredString: 'hello',
			nullableString: 123
		})).toThrow(ZodError);
	});
});