const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const sanitizeDocumentData = (value, seen = new WeakSet()) => {
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map(item => sanitizeDocumentData(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) throw new Error('Document data contains a circular reference.');
    seen.add(value);
    const clean = Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key && !key.startsWith('_'))
        .map(([key, item]) => [key, sanitizeDocumentData(item, seen)])
    );
    seen.delete(value);
    return clean;
  }

  return null;
};

export const getCleanDocumentData = (result) => {
  if (!isPlainObject(result)) throw new Error('Invalid document result.');
  const clean = sanitizeDocumentData(result._data ?? result);
  if (!isPlainObject(clean) || Object.keys(clean).length === 0) {
    throw new Error('No document fields were extracted.');
  }
  return clean;
};

export const humanizeFieldName = (key) => String(key)
  .replace(/[_-]+/g, ' ')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/^./, letter => letter.toUpperCase());

export const getDocumentTitle = (result, fallback = 'Document') => {
  const data = getCleanDocumentData(result);
  return result._documentType
    || data.documentType
    || data.title
    || data.fullName
    || data.name
    || fallback;
};

export const buildJsonPayload = (results) => {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('No document results to export.');
  }
  const clean = results.map(getCleanDocumentData);
  return clean.length === 1 ? clean[0] : clean;
};

export const flattenDocumentFields = (value, prefix = '', rows = []) => {
  if (Array.isArray(value)) {
    if (value.every(item => !isPlainObject(item) && !Array.isArray(item))) {
      value.forEach((item, index) => rows.push([`${prefix}[${index}]`, item]));
    } else if (prefix) {
      rows.push([prefix, JSON.stringify(value)]);
    }
    return rows;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isPlainObject(item)) flattenDocumentFields(item, path, rows);
      else if (Array.isArray(item)) flattenDocumentFields(item, path, rows);
      else rows.push([path, item]);
    });
  }
  return rows;
};
