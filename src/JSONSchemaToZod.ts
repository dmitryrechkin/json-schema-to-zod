import { z, ZodSchema, type ZodTypeAny, ZodObject } from 'zod';
import { type JSONSchema } from './Type';

export class JSONSchemaToZod
{
	/**
	 * Converts a JSON schema to a Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodSchema} - The Zod schema.
	 */
	public static convert(schema: JSONSchema): ZodSchema
	{
		return this.parseSchema(schema);
	}

	/**
	 * Parses a JSON schema and returns the corresponding Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseSchema(schema: JSONSchema): ZodTypeAny
	{
		// Handle array of types (e.g., ['string', 'null'] for nullable types)
		if (Array.isArray(schema.type))
		{
			return this.handleTypeArray(schema);
		}

		return this.handleSingleType(schema);
	}

	/**
	 * Handles schemas with an array of types.
	 *
	 * @param {JSONSchema} schema - The JSON schema with type array.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static handleTypeArray(schema: JSONSchema): ZodTypeAny
	{
		if (!Array.isArray(schema.type))
		{
			throw new Error('Expected schema.type to be an array');
		}

		// Check if the type array includes 'null' to create a nullable type
		if (schema.type.includes('null'))
		{
			return this.handleNullableType(schema);
		}

		// If no 'null' in the type array, handle as a union of types
		return this.createUnionFromTypes(schema.type, schema);
	}

	/**
	 * Handles nullable types by creating a nullable schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema with nullable type.
	 * @returns {ZodTypeAny} - The nullable Zod schema.
	 */
	private static handleNullableType(schema: JSONSchema): ZodTypeAny
	{
		if (!Array.isArray(schema.type))
		{
			throw new Error('Expected schema.type to be an array');
		}

		// Create a copy of the schema without the 'null' type
		const nonNullSchema = { ...schema };
		nonNullSchema.type = schema.type.filter(t => t !== 'null');

		// If there's only one type left, set it as a string
		if (nonNullSchema.type.length === 1)
		{
			nonNullSchema.type = nonNullSchema.type[0];
		}

		// Parse the non-null schema and make it nullable
		return this.parseSchema(nonNullSchema).nullable();
	}

	/**
	 * Creates a union type from an array of types.
	 *
	 * @param {string[]} types - Array of type strings.
	 * @param {JSONSchema} baseSchema - The base schema to apply to each type.
	 * @returns {ZodTypeAny} - The union Zod schema.
	 */
	private static createUnionFromTypes(types: string[], baseSchema: JSONSchema): ZodTypeAny
	{
		const schemas = types.map(type =>
		{
			const singleTypeSchema = { ...baseSchema, type };
			return this.parseSchema(singleTypeSchema);
		});

		return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
	}

	/**
	 * Handles schemas with a single type.
	 *
	 * @param {JSONSchema} schema - The JSON schema with single type.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static handleSingleType(schema: JSONSchema): ZodTypeAny
	{
		// Handle schemas without a type property
		if (schema.type === undefined)
		{
			// If schema has combinators, use parseCombinator
			if (schema.oneOf || schema.anyOf || schema.allOf)
			{
				return this.parseCombinator(schema);
			}
			// If schema has properties, treat as object
			if (schema.properties)
			{
				return this.parseObject(schema);
			}
			// Default to any() for schemas with no type and no other indicators
			return z.any();
		}

		switch (schema.type)
		{
			case 'string':
				return this.parseString(schema);
			case 'number':
				return z.number();
			case 'integer':
				return z.number().int();
			case 'boolean':
				return z.boolean();
			case 'array':
				return this.parseArray(schema);
			case 'object':
				return this.parseObject(schema);
			default:
				return this.parseCombinator(schema);
		}
	}

	/**
	 * Parses a JSON schema of type string and returns the corresponding Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseString(schema: JSONSchema): ZodTypeAny
	{
		let zodSchema = z.string();

		// Apply format-specific methods
		switch (schema.format)
		{
			case 'email':
				zodSchema = zodSchema.email();
				break;
			case 'date-time':
				zodSchema = zodSchema.datetime();
				break;
			case 'uri':
				zodSchema = zodSchema.url();
				break;
			case 'uuid':
				zodSchema = zodSchema.uuid();
				break;
			case 'date':
				zodSchema = zodSchema.date();
				break;
			default:
				break;
		}

		// Apply enum validation last to retain ZodString methods
		if (schema.enum)
		{
			return zodSchema.refine((val) => schema.enum?.includes(val), {
				message: `Value must be one of: ${schema.enum?.join(', ')}`
			});
		}

		return zodSchema;
	}

	/**
	 * Parses a JSON schema of type array and returns the corresponding Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseArray(schema: JSONSchema): ZodTypeAny
	{
		if (!schema.items)
		{
			throw new Error('Array schema must have "items" defined');
		}

		const itemSchema = Array.isArray(schema.items)
			? z.union(schema.items.map((item) => this.parseSchema(item)) as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
			: this.parseSchema(schema.items);

		return z.array(itemSchema);
	}

	/**
	 * Parses a JSON schema of type object and returns the corresponding Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodObject<any>} - The ZodObject schema.
	 */
	private static parseObject(schema: JSONSchema): ZodObject<any>
	{
		const shape: Record<string, ZodTypeAny> = {};
		const required = new Set(schema.required || []);

		for (const [key, value] of Object.entries(schema.properties || {}))
		{
			const zodSchema = this.parseSchema(value);
			shape[key] = required.has(key) ? zodSchema : zodSchema.optional();
		}

		let zodObject: z.ZodObject<any>;

		if (schema.additionalProperties === true)
		{
			zodObject = z.object(shape).catchall(z.any()).strip();
		}
		else if (schema.additionalProperties && typeof schema.additionalProperties === 'object')
		{
			zodObject = z.object(shape).catchall(this.parseSchema(schema.additionalProperties)).strip();
		}
		else
		{
			zodObject = z.object(shape).strict();
		}

		return zodObject;
	}

	/**
	 * Parses a JSON schema of type combinator and returns the corresponding Zod schema.
	 *
	 * @param {JSONSchema} schema - The JSON schema.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseCombinator(schema: JSONSchema): ZodTypeAny
	{
		if (schema.oneOf)
		{
			return this.parseOneOf(schema.oneOf);
		}
		if (schema.anyOf)
		{
			return this.parseAnyOf(schema.anyOf);
		}
		if (schema.allOf)
		{
			return this.parseAllOf(schema.allOf);
		}
		throw new Error('Unsupported schema type');
	}

	/**
	 * Parses a oneOf combinator schema.
	 *
	 * @param {JSONSchema[]} schemas - Array of JSON schemas in the oneOf.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseOneOf(schemas: JSONSchema[]): ZodTypeAny
	{
		if (schemas.length === 1)
		{
			return this.parseSchema(schemas[0]);
		}
		else if (schemas.length > 1)
		{
			return z.union(schemas.map((subSchema) => this.parseSchema(subSchema)) as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
		}

		// Empty oneOf array - fallback to any
		return z.any();
	}

	/**
	 * Parses an anyOf combinator schema.
	 *
	 * @param {JSONSchema[]} schemas - Array of JSON schemas in the anyOf.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseAnyOf(schemas: JSONSchema[]): ZodTypeAny
	{
		if (schemas.length === 1)
		{
			return this.parseSchema(schemas[0]);
		}
		else if (schemas.length > 1)
		{
			// Process each subschema individually to avoid recursive errors
			const zodSchemas: ZodTypeAny[] = [];

			for (const subSchema of schemas)
			{
				// Handle null type specially
				if (subSchema.type === 'null')
				{
					zodSchemas.push(z.null());
				}
				else
				{
					zodSchemas.push(this.parseSchema(subSchema));
				}
			}

			// Ensure we have at least two schemas for the union
			if (zodSchemas.length >= 2)
			{
				return z.union(zodSchemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
			}
			else if (zodSchemas.length === 1)
			{
				return zodSchemas[0];
			}
		}

		// Empty anyOf array or no valid schemas - fallback to any
		return z.any();
	}

	/**
	 * Parses an allOf combinator schema by merging all schemas.
	 *
	 * @param {JSONSchema[]} schemas - Array of JSON schemas in the allOf.
	 * @returns {ZodTypeAny} - The ZodTypeAny schema.
	 */
	private static parseAllOf(schemas: JSONSchema[]): ZodTypeAny
	{
		if (schemas.length === 0)
		{
			return z.any();
		}

		const baseSchema = schemas[0];
		const mergedSchema = schemas.slice(1).reduce((acc, currentSchema) =>
		{
			return this.mergeSchemas(acc, currentSchema);
		}, baseSchema);

		return this.parseSchema(mergedSchema);
	}

	/**
	 * Merges two JSON schemas together.
	 *
	 * @param {JSONSchema} baseSchema - The base JSON schema.
	 * @param {JSONSchema} addSchema - The JSON schema to add.
	 * @returns {JSONSchema} - The merged JSON schema
	 */
	private static mergeSchemas(baseSchema: JSONSchema, addSchema: JSONSchema): JSONSchema
	{
		const merged: JSONSchema = { ...baseSchema, ...addSchema };
		if (baseSchema.properties && addSchema.properties)
		{
			merged.properties = { ...baseSchema.properties, ...addSchema.properties };
		}
		if (baseSchema.required && addSchema.required)
		{
			merged.required = Array.from(new Set([...baseSchema.required, ...addSchema.required]));
		}
		return merged;
	}
}

