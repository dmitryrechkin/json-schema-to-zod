export type JSONSchema = {
	type?: string | string[];
	properties?: Record<string, JSONSchema>;
	items?: JSONSchema | JSONSchema[];
	required?: string[];
	enum?: (string | number)[];
	format?: string;
	oneOf?: JSONSchema[];
	allOf?: JSONSchema[];
	anyOf?: JSONSchema[];
	additionalProperties?: boolean | JSONSchema;
	[key: string]: any; // For any other additional properties
};
