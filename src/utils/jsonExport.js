import { buildJsonPayload } from './documentData.js';

const safeFilename = (value) => String(value || 'Document_Export')
  .replace(/[^a-z0-9-_]+/gi, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 80) || 'Document_Export';

export const downloadDocumentJson = (results, filename) => {
  const payload = buildJsonPayload(results);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(filename || `Document_Export_${new Date().toISOString().slice(0, 10)}`)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
