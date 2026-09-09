import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentParts, parseDocumentResponse } from './geminiOCR.js';

test('parses a generic nested document response', () => {
  const result = parseDocumentResponse(JSON.stringify({ documentType: 'Invoice', data: { invoiceNumber: '0012', paid: true, items: [{ description: 'Paper', quantity: 2 }] } }));
  assert.equal(result._documentType, 'Invoice');
  assert.deepEqual(result._data, { invoiceNumber: '0012', paid: true, items: [{ description: 'Paper', quantity: 2 }] });
});

test('normalizes missing known ID fields to null', () => {
  const result = parseDocumentResponse(JSON.stringify({ documentType: 'ID', data: { fullName: 'Ana Cruz', documentNumber: 'A-01' } }));
  assert.equal(result.fullName, 'Ana Cruz');
  assert.equal(result.expiryDate, null);
});

test('rejects non-document and empty responses', () => {
  assert.throws(() => parseDocumentResponse('{"documentType":"none","reason":"photo","data":{}}'), /No readable document/);
  assert.throws(() => parseDocumentResponse('{"documentType":"Invoice","data":{}}'), /No document fields/);
});

test('keeps multi-page images and OCR hints in page order', () => {
  const parts = buildDocumentParts([
    { label: 'Page 1', base64: 'first', mimeType: 'image/png', ocrText: 'first text' },
    { label: 'Page 2', base64: 'second', mimeType: 'image/jpeg', ocrText: 'second text' },
  ]);
  assert.equal(parts.length, 5);
  assert.match(parts[1], /Page 1.*first text/s);
  assert.equal(parts[2].inlineData.data, 'first');
  assert.match(parts[3], /Page 2.*second text/s);
  assert.equal(parts[4].inlineData.data, 'second');
});
