import ExcelJS from 'exceljs';

const HEADERS = ['ID NUMBER', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'BIRTH DATE', 'ADDRESS', 'EXPIRATION OF ID'];

const buildWorkbook = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Extracted Data');

  const headerRow = sheet.addRow(HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  rows.forEach((item) => {
    sheet.addRow([item.documentNumber, item.lastName, item.firstName, item.middleName, item.dateOfBirth, item.address, item.expiryDate]);
  });

  // Auto-fit column widths
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length + 2 : 12;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen, 40);
  });

  return workbook;
};

const triggerDownload = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download extracted data as an Excel file.
 * @param {Array} data - Array of extracted ID objects (with documentNumber, fullName, etc.)
 * @param {string} [filename] - Optional filename (without extension)
 */
export const downloadExtractedExcel = async (data, filename) => {
  if (!data || data.length === 0) return;
  const workbook = await buildWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename || `IDScan_AI_Export_${new Date().toISOString().slice(0, 10)}`;
  triggerDownload(blob, `${name}.xlsx`);
};

/**
 * Download scan history items as an Excel file.
 * @param {Array} scans - Array of scan objects (with .data property containing ID fields)
 * @param {string} label - Label for the filename
 */
export const downloadScanExcel = async (scans, label) => {
  if (!scans || scans.length === 0) return;
  const rows = scans.map((s) => s.data || s);
  const workbook = await buildWorkbook(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `IDScan_${label}.xlsx`);
};
