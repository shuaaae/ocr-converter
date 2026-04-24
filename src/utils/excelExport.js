import ExcelJS from 'exceljs';

const ID_HEADERS = ['ID NUMBER', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'BIRTH DATE', 'ADDRESS', 'EXPIRATION OF ID'];

const COR_HEADERS = [
  'FIRST NAME',
  'MIDDLE NAME',
  'LAST NAME',
  'BDAY',
  'ADDRESS',
  'ID NUMBER',
  'AGE',
  'GENDER',
  'MARITAL STATUS',
  'BIR REGISTRATION DATE',
  'EXPIRATION DATE',
  'REMINDER'
];

const buildWorkbook = async (rows, isCor = false) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Extracted Data');

  const headers = isCor ? COR_HEADERS : ID_HEADERS;

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  if (isCor) {
    // COR format: FIRST NAME, MIDDLE NAME, LAST NAME, BDAY, ADDRESS, ID NUMBER, AGE, GENDER, MARITAL STATUS, BIR REGISTRATION DATE, EXPIRATION DATE (empty), REMINDER (formula)
    rows.forEach((item) => {
      sheet.addRow([
        item.firstName,
        item.middleName,
        item.lastName,
        item.dateOfBirth,
        item.address,
        item.documentNumber,
        item.age,
        item.gender,
        item.maritalStatus,
        item.birRegistrationDate,
        null, // EXPIRATION DATE - manual input, leave empty (null for truly blank)
        null  // REMINDER - formula applied to entire column after loop
      ]);
    });

    // Apply formula to entire L2:L1000 range so users can paste dates in new rows
    for (let i = 2; i <= 1000; i++) {
      const cell = sheet.getCell(`L${i}`);
      cell.value = {
        formula: `IF(ISBLANK(K${i}), "", IF(K${i}-TODAY()<=5, IF(K${i}>=TODAY(), "Your expiration is near", "Expired"), ""))`
      };
    }
  } else {
    // ID format
    rows.forEach((item) => {
      sheet.addRow([item.documentNumber, item.lastName, item.firstName, item.middleName, item.dateOfBirth, item.address, item.expiryDate]);
    });
  }

  // Add conditional formatting for REMINDER column (column L) if COR export
  // Apply to L2:L1000 so formatting works for new rows when users paste dates
  if (isCor) {
    // Rule 1: "Your expiration is near" -> Yellow background
    sheet.addConditionalFormatting({
      ref: 'L2:L1000',
      rules: [
        {
          type: 'expression',
          formulae: [`NOT(ISERROR(FIND("Your expiration is near",L2)))`],
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF00' } // Yellow background
            },
            font: {
              bold: true,
              color: { argb: 'FF000000' } // Black text
            }
          }
        }
      ]
    });

    // Rule 2: "Expired" -> Red background with white text
    sheet.addConditionalFormatting({
      ref: 'L2:L1000',
      rules: [
        {
          type: 'expression',
          formulae: [`NOT(ISERROR(FIND("Expired",L2)))`],
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF0000' } // Red background
            },
            font: {
              bold: true,
              color: { argb: 'FFFFFFFF' } // White text
            }
          }
        }
      ]
    });
  }

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
 * Download extracted ID data as an Excel file.
 * @param {Array} data - Array of extracted ID objects (with documentNumber, fullName, etc.)
 * @param {string} [filename] - Optional filename (without extension)
 */
export const downloadExtractedExcel = async (data, filename) => {
  if (!data || data.length === 0) return;
  const workbook = await buildWorkbook(data, false);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename || `IDScan_AI_Export_${new Date().toISOString().slice(0, 10)}`;
  triggerDownload(blob, `${name}.xlsx`);
};

/**
 * Download extracted COR data as an Excel file.
 * @param {Array} data - Array of extracted COR objects
 * @param {string} [filename] - Optional filename (without extension)
 */
export const downloadCorExcel = async (data, filename) => {
  if (!data || data.length === 0) return;
  const workbook = await buildWorkbook(data, true);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename || `COR_Export_${new Date().toISOString().slice(0, 10)}`;
  triggerDownload(blob, `${name}.xlsx`);
};

/**
 * Download scan history items as an Excel file.
 * @param {Array} scans - Array of scan objects (with .data property containing ID fields)
 * @param {string} label - Label for the filename
 * @param {boolean} [isCor] - Whether the scans are COR documents
 */
export const downloadScanExcel = async (scans, label, isCor = false) => {
  if (!scans || scans.length === 0) return;
  const rows = scans.map((s) => s.data || s);
  const workbook = await buildWorkbook(rows, isCor);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const prefix = isCor ? 'COR' : 'IDScan';
  triggerDownload(blob, `${prefix}_${label}.xlsx`);
};
