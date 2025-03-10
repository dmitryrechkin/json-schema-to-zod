import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { JSONSchemaToZod } from '../src/JSONSchemaToZod';
import { type JSONSchema } from '../src/Type';

describe('JSONSchemaToZod Nullable Types with anyOf', () => {
	it('should handle nullable string using anyOf syntax', () => {
		const jsonSchema: JSONSchema = { 
			anyOf: [
				{ type: 'string' },
				{ type: 'null' }
			]
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be a union schema
		expect(zodSchema).toBeInstanceOf(z.ZodUnion);
		
		// Should accept string values
		expect(() => zodSchema.parse('test')).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject other types
		expect(() => zodSchema.parse(123)).toThrow(ZodError);
		expect(() => zodSchema.parse(true)).toThrow(ZodError);
	});

	it('should handle nullable string with format using anyOf syntax', () => {
		const jsonSchema: JSONSchema = { 
			anyOf: [
				{ type: 'string', format: 'email' },
				{ type: 'null' }
			]
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept valid email
		expect(() => zodSchema.parse('test@example.com')).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject invalid email
		expect(() => zodSchema.parse('not-an-email')).toThrow(ZodError);
	});

	it('should handle nullable number using anyOf syntax', () => {
		const jsonSchema: JSONSchema = { 
			anyOf: [
				{ type: 'number' },
				{ type: 'null' }
			]
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should accept number values
		expect(() => zodSchema.parse(42)).not.toThrow();
		
		// Should accept null
		expect(() => zodSchema.parse(null)).not.toThrow();
		
		// Should reject other types
		expect(() => zodSchema.parse('test')).toThrow(ZodError);
	});

	it('should handle multiple types with null using anyOf syntax', () => {
		const jsonSchema: JSONSchema = { 
			anyOf: [
				{ type: 'string' },
				{ type: 'number' },
				{ type: 'null' }
			]
		};
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

	it('should handle nullable in object properties using anyOf syntax', () => {
		const jsonSchema: JSONSchema = {
			type: 'object',
			properties: {
				requiredString: { type: 'string' },
				nullableString: { 
					anyOf: [
						{ type: 'string' },
						{ type: 'null' }
					]
				}
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

	// Compare both approaches to ensure they produce equivalent results
	it('should produce equivalent results for type array and anyOf approaches', () => {
		const typeArraySchema: JSONSchema = { type: ['string', 'null'] };
		const anyOfSchema: JSONSchema = { 
			anyOf: [
				{ type: 'string' },
				{ type: 'null' }
			]
		};

		const typeArrayZodSchema = JSONSchemaToZod.convert(typeArraySchema);
		const anyOfZodSchema = JSONSchemaToZod.convert(anyOfSchema);

		// Both should accept string values
		expect(() => typeArrayZodSchema.parse('test')).not.toThrow();
		expect(() => anyOfZodSchema.parse('test')).not.toThrow();
		
		// Both should accept null
		expect(() => typeArrayZodSchema.parse(null)).not.toThrow();
		expect(() => anyOfZodSchema.parse(null)).not.toThrow();
		
		// Both should reject other types
		expect(() => typeArrayZodSchema.parse(123)).toThrow(ZodError);
		expect(() => anyOfZodSchema.parse(123)).toThrow(ZodError);
	});
});