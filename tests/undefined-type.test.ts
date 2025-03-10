import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { JSONSchemaToZod } from '../src/JSONSchemaToZod';
import { type JSONSchema } from '../src/Type';

describe('JSONSchemaToZod Undefined Type', () => {
	it('should handle schema without type property', () => {
		const jsonSchema: JSONSchema = {};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be an any schema
		expect(() => zodSchema.parse('test')).not.toThrow();
		expect(() => zodSchema.parse(123)).not.toThrow();
		expect(() => zodSchema.parse(true)).not.toThrow();
		expect(() => zodSchema.parse(null)).not.toThrow();
	});

	it('should handle schema with oneOf but no type property', () => {
		const jsonSchema: JSONSchema = {
			oneOf: [
				{ type: 'string' },
				{ type: 'number' }
			]
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be a union schema
		expect(zodSchema).toBeInstanceOf(z.ZodUnion);
		expect(() => zodSchema.parse('test')).not.toThrow();
		expect(() => zodSchema.parse(123)).not.toThrow();
		expect(() => zodSchema.parse(true)).toThrow(ZodError);
	});

	it('should handle schema with properties but no type property', () => {
		const jsonSchema: JSONSchema = {
			properties: {
				name: { type: 'string' },
				age: { type: 'number' }
			},
			required: ['name']
		};
		const zodSchema = JSONSchemaToZod.convert(jsonSchema);

		// Should be an object schema
		expect(zodSchema).toBeInstanceOf(z.ZodObject);
		expect(() => zodSchema.parse({ name: 'John', age: 30 })).not.toThrow();
		expect(() => zodSchema.parse({ name: 'John' })).not.toThrow();
		expect(() => zodSchema.parse({ age: 30 })).toThrow(ZodError);
	});
});