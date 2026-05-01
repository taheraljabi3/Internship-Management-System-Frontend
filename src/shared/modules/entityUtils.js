export function toLabel(value = '') {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cloneRecords(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeRecords(records) {
  if (Array.isArray(records)) {
    return records;
  }

  if (records && typeof records === 'object') {
    return [records];
  }

  return [];
}

function shouldUseTextarea(key) {
  return /(description|comment|summary|message|bio|weaknesses|suggestions|objectives|tasks|details|feedback|body)/i.test(key);
}

function shouldUseNumericInput(key, value) {
  return typeof value === 'number' || /(score|mark|weight|hours|rating|weekNumber|versionNo|profileCompletion|gpa|threshold|interval)/i.test(key);
}

function shouldUseStatusBadge(key) {
  return /(status|result|decision)$/i.test(key) || key === 'submissionStatus';
}

function shouldUseSelect(key, values) {
  if (typeof values[0] === 'boolean') {
    return true;
  }

  return /(status|type|role|mode|level|category|environment|decision|sourceType|applicationType|platform|sector|grade|result)/i.test(key) && values.length > 0 && values.length <= 12;
}

function inferFieldType(key, value) {
  if (shouldUseTextarea(key)) {
    return 'textarea';
  }

  if (key.toLowerCase().includes('email')) {
    return 'email';
  }

  if (key.toLowerCase().includes('url')) {
    return 'url';
  }

  if (shouldUseNumericInput(key, value)) {
    return 'number';
  }

  return 'text';
}

function buildOptions(values) {
  return values.map((value) => ({
    label: String(value),
    value: typeof value === 'boolean' ? String(value) : value,
  }));
}

export function buildFieldDefinitions(records, overrides = []) {
  const normalized = normalizeRecords(records);
  const firstRecord = normalized[0] || {};
  const overrideMap = new Map(overrides.map((field) => [field.key, field]));
  const keys = Array.from(
    new Set([
      ...Object.keys(firstRecord),
      ...overrides.map((field) => field.key),
    ])
  );

  return keys.map((key) => {
    const override = overrideMap.get(key) || {};
    const values = Array.from(
      new Set(
        normalized
          .map((record) => record?.[key])
          .filter((value) => value !== undefined && value !== null && value !== '')
      )
    );

    const baseType = override.type || inferFieldType(key, firstRecord[key]);
    const select = override.options || (shouldUseSelect(key, values) ? buildOptions(values) : null);

    return {
      key,
      label: override.label || toLabel(key),
      type: select ? 'select' : baseType,
      options: select || undefined,
      status: override.status ?? shouldUseStatusBadge(key),
      readOnly: override.readOnly || false,
      rows: override.rows || 4,
      step: override.step || (baseType === 'number' ? 'any' : undefined),
    };
  });
}

export function buildColumns(fields) {
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.status ? 'status' : undefined,
  }));
}

export function createInitialFormState(fields, selectedRecord = null) {
  return fields.reduce((accumulator, field) => {
    const selectedValue = selectedRecord?.[field.key];

    if (selectedValue !== undefined && selectedValue !== null) {
      accumulator[field.key] = selectedValue;
      return accumulator;
    }

    if (field.options?.length) {
      accumulator[field.key] = field.options[0].value;
      return accumulator;
    }

    accumulator[field.key] = '';
    return accumulator;
  }, {});
}

export function filterRecords(records, query) {
  const keyword = String(query || '').trim().toLowerCase();

  if (!keyword) {
    return records;
  }

  return records.filter((record) =>
    Object.values(record).some((value) => String(value).toLowerCase().includes(keyword))
  );
}

export function normalizeFormValue(field, value) {
  if (field.type === 'number') {
    if (value === '') {
      return '';
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  if (field.options && typeof field.options[0]?.value === 'boolean') {
    return value === 'true';
  }

  return value;
}
