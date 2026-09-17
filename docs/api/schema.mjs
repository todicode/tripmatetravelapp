// Deliberately limited to the OpenAPI keywords used by this contract.
// Full OpenAPI and fixture validation lives in validate_contract.py.
export function deref(spec, schema) {
  while (schema?.$ref) {
    if (!schema.$ref.startsWith('#/')) throw new Error('Only local refs are allowed');
    schema = schema.$ref.slice(2).split('/').reduce((v, k) => v[k.replaceAll('~1', '/').replaceAll('~0', '~')], spec);
  }
  return schema;
}

export function validate(spec, inputSchema, value, at = '$') {
  const schema = deref(spec, inputSchema);
  if (value === null && schema.nullable) return [];
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(s => validate(spec, s, value, at).length === 0);
    return matches.length === 1 ? [] : [at + ' must match exactly one allowed shape'];
  }
  if (schema.allOf) return schema.allOf.flatMap(s => validate(spec, s, value, at));
  const errors = [];
  const bad = message => errors.push(at + ' ' + message);
  const type = schema.type;
  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [at + ' must be an object'];
    for (const name of schema.required ?? []) if (!(name in value)) bad('requires ' + name);
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) bad('has too few fields');
    for (const [name, v] of Object.entries(value)) {
      if (!schema.properties?.[name]) {
        if (schema.additionalProperties === false) bad('has unknown field ' + name);
      } else errors.push(...validate(spec, schema.properties[name], v, at + '.' + name));
    }
  } else if (type === 'array') {
    if (!Array.isArray(value)) return [at + ' must be an array'];
    if (schema.minItems !== undefined && value.length < schema.minItems) bad('has too few items');
    if (schema.maxItems !== undefined && value.length > schema.maxItems) bad('has too many items');
    if (schema.uniqueItems && new Set(value.map(x => JSON.stringify(x))).size !== value.length) bad('has duplicate items');
    value.forEach((v, i) => errors.push(...validate(spec, schema.items, v, at + '[' + i + ']')));
  } else if (type === 'string') {
    if (typeof value !== 'string') return [at + ' must be a string'];
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) bad('is too short');
    if (schema.maxLength !== undefined && length > schema.maxLength) bad('is too long');
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) bad('has invalid format');
    if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) bad('must be UUID');
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) bad('must be email');
    if (schema.format === 'date') {
      const parsed = new Date(value + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) bad('must be a valid date');
    }
    if (schema.format === 'date-time' && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) || !Number.isFinite(Date.parse(value)))) bad('must be UTC date-time');
    if (schema.maxLength === 19 && schema.pattern?.includes('[1-9]') && /^\d+$/.test(value) && BigInt(value) > 9223372036854775807n) bad('exceeds bigint');
  } else if (type === 'integer' || type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))) return [at + ' must be ' + type];
    if (schema.minimum !== undefined && value < schema.minimum) bad('below minimum');
    if (schema.maximum !== undefined && value > schema.maximum) bad('above maximum');
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    bad('must be boolean');
  }
  if (schema.enum && !schema.enum.includes(value)) bad('is not an allowed enum value');
  return errors;
}
