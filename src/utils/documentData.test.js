import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJsonPayload, flattenDocumentFields, getCleanDocumentData, humanizeFieldName, sanitizeDocumentData } from './documentData.js';

test('sanitizes nested document values and removes internal metadata', () => {
  const result = sanitizeDocumentData({ name: '  Ana  ', blank: ' ', count: 2, checked: false, nested: { value: 'yes' }, rows: [{ item: 'A' }], _provider: 'hidden' });
  assert.deepEqual(result, { name: 'Ana', blank: null, count: 2, checked: false, nested: { value: 'yes' }, rows: [{ item: 'A' }] });
});

test('uses internal clean data without exporting metadata', () => {
  assert.deepEqual(getCleanDocumentData({ _documentType: 'PDS', _fileName: 'pds.pdf', _data: { personalInformation: { surname: 'Cruz' } } }), { personalInformation: { surname: 'Cruz' } });
});

test('builds an object for one result and an array for multiple results', () => {
  assert.deepEqual(buildJsonPayload([{ _data: { one: 1 } }]), { one: 1 });
  assert.deepEqual(buildJsonPayload([{ _data: { one: 1 } }, { _data: { two: 2 } }]), [{ one: 1 }, { two: 2 }]);
});

test('flattens scalar fields while leaving object arrays for worksheets', () => {
  assert.deepEqual(flattenDocumentFields({ person: { name: 'Ana' }, tags: ['a', 'b'], work: [{ role: 'Dev' }] }), [['person.name', 'Ana'], ['tags[0]', 'a'], ['tags[1]', 'b'], ['work', '[{"role":"Dev"}]']]);
});

test('humanizes JSON keys', () => {
  assert.equal(humanizeFieldName('dateOfBirth'), 'Date Of Birth');
});
