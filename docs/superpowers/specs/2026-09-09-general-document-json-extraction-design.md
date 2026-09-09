# General Document JSON Extraction Design

## Objective

Extend the existing scanner from ID and BIR COR extraction to arbitrary document extraction. Each uploaded file produces clean JSON containing only fields visible in that document and their values. After reviewing the result, the user chooses JSON or Excel for the download.

The first version continues to use the existing Gemini integration. The design keeps extraction behind a service boundary so a server-hosted model can replace Gemini later without changing the UI or result format.

## Supported inputs

- JPG, JPEG, and PNG images
- PDF documents, including multiple pages
- DOCX documents containing embedded document images
- Up to the existing limit of ten uploaded files

Each uploaded file is treated as one logical document. All pages or embedded images belonging to that file are combined into one extraction request and one result. If a single image contains multiple clearly separate documents, the result uses a `documents` array.

## User-facing JSON

The downloaded JSON contains document fields and values only. It does not expose model confidence, page coordinates, provider names, filenames, processing state, or internal metadata.

Simple documents use a flat object:

```json
{
  "fullName": "Juan Dela Cruz",
  "dateOfBirth": "1990-05-12",
  "documentNumber": "123456789",
  "address": "Manila, Philippines"
}
```

Documents with sections use nested objects. Repeated rows and tables use arrays of objects:

```json
{
  "personalInformation": {
    "surname": "Dela Cruz",
    "firstName": "Juan",
    "dateOfBirth": "1990-05-12"
  },
  "workExperience": [
    {
      "position": "Developer",
      "company": "Sample Company",
      "dateFrom": "2020-01-01",
      "dateTo": "Present"
    }
  ]
}
```

Missing, blank, or unreadable values are `null`. The extractor must not infer personal facts that are not visibly supported by the document. Printed field labels determine keys for unfamiliar documents. Keys use descriptive camel case. Dates use `YYYY-MM-DD` only when the printed date is unambiguous; otherwise the printed value is preserved.

## Internal result contract

The extraction service returns an internal envelope:

```json
{
  "documentType": "Personal Data Sheet",
  "data": {}
}
```

`documentType` is used for display, history, and known-schema handling. `data` is the clean object used for the JSON download. Internal properties are never mixed into `data`.

Known formats retain stable schemas:

- IDs preserve the current identity fields.
- BIR COR preserves the current registration fields.
- PDS uses nested sections for personal information, family background, education, eligibility, work experience, voluntary work, training, other information, and references.
- Unknown documents use label-derived fields and arrays.

The service recursively sanitizes the returned data. It permits JSON strings, numbers, booleans, nulls, objects, and arrays; removes unsupported values; and rejects an empty or malformed root object.

## Extraction flow

1. The user takes a photo or uploads one or more files.
2. Image files are prepared directly. PDF pages are rendered to images in page order. DOCX embedded images are extracted in document order.
3. Local OCR produces text hints for each image when possible. OCR failure does not discard the document; Gemini can still inspect the images.
4. All ordered images and OCR hints for one file are sent in a single Gemini request with JSON response mode.
5. Gemini classifies the document and extracts visible labels, values, sections, tables, checkboxes, and repeated rows.
6. The response parser validates the internal envelope and recursively sanitizes `data`.
7. The app stores one completed history entry per uploaded file and shows a nested result review.
8. The user downloads JSON or Excel.

Files continue to process sequentially. A failure for one file is reported clearly. The initial implementation retains the current all-or-nothing batch behavior rather than adding a persistent server job queue.

## Review interface

The result screen presents objects as labeled sections and arrays as repeatable tables or item groups. It must never render nested values as `[object Object]`.

The initial version displays extracted values for review without building a full schema-aware form editor. It clearly tells the user to check AI-extracted information against the source document before using it.

For every successful result, the screen provides:

- **Download JSON**, which downloads only the clean `data` object for one result, or an array of clean objects for a multi-file batch.
- **Download Excel**, which uses the existing ID/COR layout for those known formats and a generic workbook for all other documents.
- **Scan another document**, which clears the current selection and result.

## Generic Excel mapping

For arbitrary documents, the workbook contains:

- A `Fields` sheet with `Field` and `Value` columns. Nested scalar values use readable paths such as `personalInformation.surname`.
- A separate sheet for each top-level array of objects, using the union of object keys as columns and one array item per row.
- Arrays of scalar values stored as rows under a `Value` column.
- Nested values that cannot be represented safely in a single cell serialized as valid JSON text.

Worksheet names are sanitized, made unique, and limited to Excel's worksheet-name constraints.

## Errors and safeguards

- A non-document image returns a clear “no readable document found” error.
- Invalid or malformed model JSON returns a retryable extraction error rather than partial fabricated data.
- Empty `data` objects are rejected.
- Missing fields remain `null`.
- Existing API-key validation remains in place.
- The UI states that extraction is assisted by AI and requires user review.
- The Gemini API key remains exposed by the existing client-side architecture in this phase. Moving it to a protected server endpoint is required before production deployment.

## Compatibility

- Existing image, PDF, and DOCX upload controls remain available.
- Existing ID and COR field names and Excel exports remain supported.
- Existing scan history is read defensively. New history entries store the document type separately from clean extracted data.
- Mobile and desktop use the same extraction results and export functions.
- Chat behavior is outside this change.

## Verification

Automated tests cover:

- Parsing a valid generic document envelope
- Preserving nested objects, arrays, booleans, numbers, strings, and null values
- Rejecting malformed, empty, and non-document responses
- Maintaining stable ID and COR output
- Combining ordered multi-page inputs into one extraction request and result
- Producing clean JSON without internal metadata
- Mapping nested objects and repeated arrays into a generic Excel workbook

Project lint and production builds must pass. Browser checks verify image selection, multi-page result rendering, JSON download, Excel download, history display, and responsive mobile behavior.

## Deferred work

- Moving extraction to server-side background jobs
- Replacing Gemini with PaddleOCR-VL or another local model
- Editable schema-aware review forms
- Document authenticity verification
- Durable cloud history and multi-user authentication
