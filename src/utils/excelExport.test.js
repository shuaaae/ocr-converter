import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenericWorkbook } from './excelExport.js';

test('maps nested fields and repeated rows into workbook sheets', () => {
  const workbook = buildGenericWorkbook([{ _documentType: 'PDS', _data: { personalInformation: { surname: 'Cruz' }, workExperience: [{ position: 'Developer', company: 'Example' }] } }]);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Fields', 'Work Experience']);
  assert.equal(workbook.getWorksheet('Fields').getCell('A2').value, 'personalInformation.surname');
  assert.equal(workbook.getWorksheet('Work Experience').getCell('A2').value, 'Developer');
});

