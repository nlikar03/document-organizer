import { ZipDeflate, Zip } from 'fflate';
import * as streamSaver from 'streamsaver';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getFileFromIndexedDB } from './indexedDBHelper';
import * as pdfjsLib from 'pdfjs-dist';
import { dzoValuesByRow } from './dzoFields';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const renderPdfPagesToImages = async (pdfBytes) => {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdfDoc = await loadingTask.promise;
  const images = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: viewport.width, height: viewport.height });
    page.cleanup();
  }
  await pdfDoc.destroy();
  return images;
};

export const addWatermarkToPDF = async (pdfBytes, watermarkText) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBytes;

    const page = pages[0];
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle % 360;

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 20;
    const margin = 30;
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = fontSize;

    let x, y;
    switch (rotation) {
      case 90:  x = margin + textHeight; y = height - margin - textWidth; break;
      case 180: x = margin + textWidth;  y = margin; break;
      case 270: x = width - margin - textHeight; y = margin + textWidth; break;
      case 0:
      default:  x = width - textWidth - margin; y = height - margin - textHeight; break;
    }

    page.drawText(watermarkText, { x, y, size: fontSize, font, color: rgb(1, 0, 0), rotate: degrees(rotation) });
    return await pdfDoc.save();
  } catch (error) {
    console.error('Watermark error:', error);
    return pdfBytes;
  }
};

const getFolderId = (result) => result.suggestedFolder?.id ?? result.folderId;

// Always derive extension from the stored fileName, not from the File object's .name
const getExt = (fileName) => (fileName || '').toLowerCase().split('.').pop().trim();

const sortByFolderTree = (results, folders) => {
  const folderOrder = {};
  folders.forEach((f, idx) => { folderOrder[f.id] = idx; });
  return [...results].sort((a, b) => {
    const orderA = folderOrder[getFolderId(a)] ?? 999999;
    const orderB = folderOrder[getFolderId(b)] ?? 999999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.fileNumber ?? 0) - (b.fileNumber ?? 0);
  });
};

// namingMode: 'original' = šifra + originalno ime (default)
//             'ai'       = šifra + AI naslov dokumenta
export const downloadZipClientSide = async (finalResults, folders, namingMode = 'original') => {
  const base = process.env.PUBLIC_URL || '';
  streamSaver.mitm = `${window.location.origin}${base}/mitm.html`;

  const folderPaths = {};
  for (const folder of folders) {
    const parts = [];
    const ids = folder.id.split('.');
    for (let i = 0; i < ids.length; i++) {
      const fid = ids.slice(0, i + 1).join('.');
      const f = folders.find(x => x.id === fid);
      if (f) parts.push(f.name);
    }
    folderPaths[folder.id] = parts.join('/');
  }

  const fileStream = streamSaver.createWriteStream('DZO_Dokumenti.zip');
  const writer = fileStream.getWriter();

  await new Promise((resolve, reject) => {
    const zip = new Zip((err, chunk, final) => {
      if (err) { writer.abort(err); reject(err); return; }
      writer.write(chunk);
      if (final) { writer.close(); resolve(); }
    });

    (async () => {
      for (const result of finalResults) {
        const file = await getFileFromIndexedDB(result.fileName);
        if (!file) continue;

        let fileBytes = new Uint8Array(await file.arrayBuffer());

        if (getExt(result.fileName) === 'pdf') {
          fileBytes = new Uint8Array(await addWatermarkToPDF(fileBytes, result.docCode));
        }

        const ext = result.fileName.substring(result.fileName.lastIndexOf('.'));
        const prefix = String(result.fileNumber).padStart(3, '0');

        let newName;
        if (namingMode === 'ai' && result.documentTitle) {
          const safeTitle = result.documentTitle
            .replace(/[\\/:*?"<>|]/g, '')
            .trim()
            .substring(0, 100);
          newName = `${prefix}_${safeTitle}${ext}`;
        } else {
          const base = result.fileName.substring(0, result.fileName.lastIndexOf('.'));
          newName = `${prefix}_${base}${ext}`;
        }

        const folderId = getFolderId(result);
        const folderPath = folderPaths[folderId];
        if (!folderPath) {
          console.warn(`No folder path for "${folderId}" on "${result.fileName}" — skipping.`);
          continue;
        }

        await new Promise((res, rej) => {
          const entry = new ZipDeflate(`${folderPath}/${newName}`, { level: 6 });
          zip.add(entry);
          try {
            entry.push(fileBytes, true);
            res();
          } catch (e) { rej(e); }
        });
      }
      zip.end();
    })().catch(reject);
  });
};

// ─── DZO EXCEL EXPORT (fills the official template, never regenerates) ─────────
//
// The official workbook DZO_i_obrazci.xlsm is bundled as a template in /public. We
// load it with ExcelJS, which preserves everything — fonts (Arial Narrow), the
// number format that hides empty "0" cells, formulas linking 5A/5B to VNOS PODATKOV,
// merges, borders — then only inject data:
//   • the DZO modal fields into VNOS PODATKOV column D (5A/5B pull them via formulas)
//   • the classified documents into the dokazilo tables on sheet 5B
// This guarantees a byte-faithful copy of the form, not a reconstruction.

const DZO_TEMPLATE_URL = `${process.env.PUBLIC_URL || ''}/DZO_obrazec_template.xlsx`;

// Fixed layout of the seven dokazilo sections on sheet "5B DZO" (from the template):
// each section has 5 data rows starting at these row numbers, columns are
// A=zap.št, B=ime dokazila, D=izdajatelj, F=št. dokazila, G=datum.
const DZO_5B_SECTION_ROWS = [51, 60, 69, 78, 87, 96, 105];
const DZO_5B_ROWS_PER_SECTION = 5;

// titleMode: 'combined' | 'original' | 'ai'  ('split' → 'combined')
// dzoData:   header data from the DZO modal; null → empty fields (blank official form)
export const downloadExcelClientSide = async (finalResults, folders, titleMode = 'combined', stripPrefix = false, dzoData = null) => {
  // 1) Load the official template, preserving all its formatting and formulas.
  const resp = await fetch(DZO_TEMPLATE_URL);
  if (!resp.ok) throw new Error('Predloge DZO ni bilo mogoče naložiti.');
  const templateBuffer = await resp.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  // 2) Inject the modal data into VNOS PODATKOV column D. The 5A/5B sheets reference
  //    these cells by formula, so the values flow through automatically.
  const vnos = workbook.getWorksheet('VNOS PODATKOV');
  if (vnos) {
    const byRow = dzoValuesByRow(dzoData || {});
    for (const [row, val] of Object.entries(byRow)) {
      vnos.getCell(`D${row}`).value = val;
    }
  }

  // 3) Fill the dokazilo tables on 5B from the classified documents.
  const ws5b = workbook.getWorksheet('5B DZO');
  if (ws5b) fillDokazila5B(ws5b, finalResults, folders, titleMode, stripPrefix);

  // 4) Download. Keep the .xlsm extension so macros/format stay intact.
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'DZO_obrazci.xlsx');
};

// Writes classified documents into the seven dokazilo tables on 5B. Each top-level
// folder maps to a section (I–VII) in order. Subfolders appear as bold subheadings
// inside their section, with their own documents numbered from 1 underneath.
//
// The seven sections have a fixed 5-blank-row table in the template. We fill/extend
// the rows for each section, working from the LAST section upward so that inserting
// rows in an earlier section never shifts the anchor rows of the ones below it.
const fillDokazila5B = (ws, finalResults, folders, titleMode, stripPrefix) => {
  const strip = (name) => stripPrefix ? name.replace(/^\d{2,4}_/, '') : name;
  const titleFor = (r) => {
    const orig = strip((r.originalFileName || r.fileName || '').replace(/\.[^/.]+$/, ''));
    if (titleMode === 'original') return orig;
    if (titleMode === 'ai') return r.documentTitle || orig;
    return r.documentTitle ? (orig ? `${r.documentTitle}\n${orig}` : r.documentTitle) : orig;
  };
  const MAX_CHARS_PER_LINE = 120;
  const clamp = (text) =>
    String(text || '')
      .split('\n')
      .map(line => line.length > MAX_CHARS_PER_LINE ? line.slice(0, MAX_CHARS_PER_LINE - 1) + '…' : line)
      .join('\n');

  // ── group documents by their exact folder id ────────────────────────────────
  const itemsByFolder = {};
  finalResults.forEach(r => {
    const id = getFolderId(r);
    (itemsByFolder[id] = itemsByFolder[id] || []).push(r);
  });

  const roots = folders.filter(f => !f.id.includes('.'));

  // Map a root folder to its fixed section index (I→0 … VII→6) by the roman numeral
  // in its name. This is what decides which of the seven official tables a folder's
  // documents go into — NOT the folder's position in the list. Roots without a roman
  // numeral (e.g. "0 PODATKI O POGODBI") don't belong to any dokazilo table.
  const ROMAN_TO_INDEX = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
  const sectionIndexOf = (folder) => {
    const m = folder.name.match(/^\s*([IVX]+)\.?\s/);
    return m && ROMAN_TO_INDEX[m[1]] !== undefined ? ROMAN_TO_INDEX[m[1]] : null;
  };

  // Subfolders of a root, in structural order, that actually contain documents.
  const descendantsWithDocs = (rootId) =>
    folders.filter(f =>
      f.id !== rootId &&
      f.id.startsWith(rootId + '.') &&
      (itemsByFolder[f.id] || []).length > 0
    );

  // The subfolder code shown in column A. Prefer the leading number in the folder
  // name (e.g. "01 BETONSKA DELA" → "01"); fall back to its position otherwise.
  const subCode = (sub, siblingsWithDocs) => {
    const m = sub.name.match(/^\s*(\d+)/);
    return m ? m[1] : String(siblingsWithDocs.indexOf(sub) + 1);
  };

  // Build the ordered list of rows for a section, matching the official form. The
  // template already provides one header row above the data block, so the FIRST group
  // reuses it (no leading 'header' entry); every later group emits its own header.
  //   • documents directly in the root: those docs (1..n)
  //   • each subfolder: header, a subheading row (code + name), then docs from 1
  const buildEntries = (root) => {
    const entries = [];
    let first = true;
    const direct = itemsByFolder[root.id] || [];
    if (direct.length > 0) {
      first = false;
      direct.forEach((doc, i) => entries.push({ type: 'doc', seq: i + 1, doc }));
    }
    const subs = descendantsWithDocs(root.id);
    subs.forEach(sub => {
      if (!first) entries.push({ type: 'header' });
      first = false;
      // Show the name without its leading number (the number goes in column A).
      const label = sub.name.replace(/^\s*\d+\s+/, '');
      entries.push({ type: 'subheading', code: subCode(sub, subs), name: label });
      (itemsByFolder[sub.id] || []).forEach((doc, i) =>
        entries.push({ type: 'doc', seq: i + 1, doc }));
    });
    return entries;
  };

  // Style snapshots captured from the template's section I block, so inserted rows
  // keep the exact look: header row (50), data row (51), and a subheading row —
  // same border skeleton as a data row but without the yellow fill or bold.
  const headerStyles = [1, 2, 3, 4, 5, 6, 7].map(c => ({ ...ws.getRow(50).getCell(c).style }));
  const dataStyles = [1, 2, 3, 4, 5, 6, 7].map(c => ({ ...ws.getRow(51).getCell(c).style }));
  const subheadingStyles = dataStyles.map(s => ({ ...s, fill: undefined, font: { name: 'Arial Narrow', size: 9 } }));

  // Header row cell contents, mirroring the template header (row 50).
  const HEADER_TEXTS = ['zap. \nšt.', 'ime dokazila oz. \nna kaj se dokazilo nanaša', '', 'izdajatelj', '', 'št. dokazila', 'datum'];

  const applyRow = (rowNum, styles, height) => {
    const row = ws.getRow(rowNum);
    if (height) row.height = height;
    for (let c = 1; c <= 7; c++) row.getCell(c).style = { ...styles[c - 1] };
    return row;
  };

  // Snapshot every merge in the dokazila region (rows ≥ section I) BEFORE editing,
  // together with which section each belongs to. ExcelJS's spliceRows moves cell
  // content but NOT merged ranges, so we drop them all now and re-apply them at the
  // shifted positions afterwards. This keeps section VII's special "E:G" merges too,
  // so no title/description/header text ever spills.
  const regionStart = DZO_5B_SECTION_ROWS[0];
  const originalMerges = [...ws.model.merges]
    .map(range => {
      const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
      if (!m) return null;
      return { range, col1: m[1], row: Number(m[2]), col2: m[3], row2: Number(m[4]) };
    })
    .filter(x => x && x.row >= regionStart);

  // Record every row insertion as { at, count }: `count` blank rows were inserted just
  // before row `at`. A cell/merge originally at row R ends up at R + (sum of counts of
  // all insertions whose `at` ≤ R). Insertions happen bottom-up so `at` refers to the
  // pre-insertion row number of later insertions correctly (earlier sections are still
  // at their template rows when their insert runs).
  const insertions = [];

  // Pair each root with its target section index, keep only those that map to a
  // section, and fill them bottom-up (by section row) so inserting rows never
  // shifts the sections below during the fill.
  const sectionsToFill = roots
    .map(root => ({ root, section: sectionIndexOf(root) }))
    .filter(x => x.section !== null)
    .sort((a, b) => b.section - a.section); // highest section first

  for (const { root, section } of sectionsToFill) {
    const entries = buildEntries(root);
    if (entries.length === 0) continue;

    // Entries start at the template's first blank data row; its header row just above
    // stays and serves the first group. Insert any rows beyond the template's 5.
    const blockStart = DZO_5B_SECTION_ROWS[section];
    const have = DZO_5B_ROWS_PER_SECTION;
    if (entries.length > have) {
      const inserted = entries.length - have;
      const at = blockStart + have;   // blank rows inserted just before this row
      ws.spliceRows(at, 0, ...Array.from({ length: inserted }, () => []));
      insertions.push({ at, count: inserted });
    }

    entries.forEach((entry, i) => {
      const r = blockStart + i;
      if (entry.type === 'header') {
        applyRow(r, headerStyles, 27.75);
        HEADER_TEXTS.forEach((t, c) => { ws.getCell(r, c + 1).value = t; });
      } else if (entry.type === 'subheading') {
        applyRow(r, subheadingStyles, 15);
        ws.getCell(`A${r}`).value = entry.code;
        ws.getCell(`B${r}`).value = entry.name;
      } else {
        const name = clamp(titleFor(entry.doc));
        applyRow(r, dataStyles, dokaziloRowHeight(name, entry.doc.issuer || ''));
        ws.getCell(`A${r}`).value = entry.seq;
        ws.getCell(`B${r}`).value = name;
        ws.getCell(`D${r}`).value = entry.doc.issuer || '';
        ws.getCell(`F${r}`).value = entry.doc.documentNumber || '';
        ws.getCell(`G${r}`).value = entry.doc.date || '';
      }
    });
  }

  // ── Re-apply the original merges at their shifted rows ──────────────────────
  // A merge originally at row R moves down by the total rows inserted at positions
  // ≤ R. This is exact — no per-section guessing — so a section's title/description
  // (which sit ABOVE that section's own insertion point) only shift for insertions in
  // earlier sections, while rows below an insertion shift correctly.
  const shiftForRow = (row) =>
    insertions.reduce((sum, ins) => sum + (ins.at <= row ? ins.count : 0), 0);

  // Drop every region merge, then recreate each at row + its shift.
  for (const { range } of originalMerges) {
    try { ws.unMergeCells(range); } catch { /* already gone */ }
  }
  for (const { col1, row, col2, row2 } of originalMerges) {
    const shift = shiftForRow(row);
    try { ws.mergeCells(`${col1}${row + shift}:${col2}${row2 + shift}`); } catch { /* overlaps — skip */ }
  }
};

// Estimate the row height (points) needed for the two wrapping columns of a 5B data
// row, so long names/issuers are not clipped. Arial Narrow 9pt in a ~22.5-wide column
// fits roughly 30 characters per line; each line is ~12pt. Newlines are honoured.
const dokaziloRowHeight = (name, issuer) => {
  const CHARS_PER_LINE = 30;
  const LINE_PT = 12;
  const MIN_HEIGHT = 15;

  const linesFor = (text) =>
    String(text || '')
      .split('\n')
      .reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / CHARS_PER_LINE)), 0);

  const lines = Math.max(linesFor(name), linesFor(issuer), 1);
  return Math.max(MIN_HEIGHT, lines * LINE_PT);
};

// ─── MERGED PDF ────────────────────────────────────────────────────────────────
// Returns { success, totalPages, skippedDocx, skippedOther, skippedMissing }
// No alert() or confirm() — caller handles UI modals

export const downloadMergedPDF = async (finalResults, folders, addWatermark) => {
  const sorted = sortByFolderTree(finalResults, folders);
  const mergedPdf = await PDFDocument.create();

  const skippedDocx = [];
  const skippedOther = [];
  const skippedMissing = [];
  const skippedEncrypted = [];

  for (const result of sorted) {
    const file = await getFileFromIndexedDB(result.fileName);
    if (!file) {
      skippedMissing.push(result.fileName);
      continue;
    }

    // Use result.fileName for extension — File.name from IndexedDB may differ
    const ext = getExt(result.fileName);
    const isDocx  = ext === 'docx' || ext === 'doc';
    const isPdf   = ext === 'pdf';
    const isJpg   = ext === 'jpg' || ext === 'jpeg';
    const isPng   = ext === 'png';
    const isImage = isJpg || isPng;

    if (isDocx)              { skippedDocx.push(result.fileName);  continue; }
    if (!isPdf && !isImage)  { skippedOther.push(result.fileName); continue; }

    try {
      const fileBytes = await file.arrayBuffer();

      if (isPdf) {
        let pdfBytes = new Uint8Array(fileBytes);

        let srcDoc;
        try {
          srcDoc = await PDFDocument.load(pdfBytes);
        } catch (loadErr) {
          if (loadErr.message?.includes('encrypted')) {
            try {
              const A4_W = 595, A4_H = 842;
              const pageImages = await renderPdfPagesToImages(pdfBytes);
              for (let i = 0; i < pageImages.length; i++) {
                const { bytes: imgBytes, width, height } = pageImages[i];
                const img = await mergedPdf.embedPng(imgBytes);
                const scale = Math.min(A4_W / width, A4_H / height);
                const drawW = width * scale;
                const drawH = height * scale;
                const page = mergedPdf.addPage([A4_W, A4_H]);
                page.drawImage(img, { x: (A4_W - drawW) / 2, y: (A4_H - drawH) / 2, width: drawW, height: drawH });
                if (i === 0 && addWatermark && result.docCode) {
                  const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
                  const fontSize = 20;
                  const textWidth = font.widthOfTextAtSize(result.docCode, fontSize);
                  page.drawText(result.docCode, { x: A4_W - textWidth - 30, y: A4_H - fontSize - 30, size: fontSize, font, color: rgb(1, 0, 0) });
                }
              }
            } catch (renderErr) {
              console.error(`Failed to render encrypted PDF ${result.fileName}:`, renderErr);
              const folderName = folders.find(f => f.id === getFolderId(result))?.name ?? '';
              skippedEncrypted.push({ fileName: result.fileName, folderName });
            }
            continue;
          }
          throw loadErr;
        }

        if (addWatermark && result.docCode) {
          pdfBytes = await addWatermarkToPDF(pdfBytes, result.docCode);
          srcDoc = await PDFDocument.load(pdfBytes);
        }

        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(page => mergedPdf.addPage(page));

      } else if (isImage) {
        const imgBytes = new Uint8Array(fileBytes);
        const img = isPng
          ? await mergedPdf.embedPng(imgBytes)
          : await mergedPdf.embedJpg(imgBytes);

        const { width, height } = img.scale(1);
        const A4_W = 595, A4_H = 842;
        const scale = Math.min((A4_W - 80) / width, (A4_H - 80) / height, 1);
        const drawW = width * scale;
        const drawH = height * scale;

        const page = mergedPdf.addPage([A4_W, A4_H]);
        page.drawImage(img, { x: (A4_W - drawW) / 2, y: (A4_H - drawH) / 2, width: drawW, height: drawH });

        if (addWatermark && result.docCode) {
          const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
          const fontSize = 20;
          const textWidth = font.widthOfTextAtSize(result.docCode, fontSize);
          page.drawText(result.docCode, {
            x: A4_W - textWidth - 30,
            y: A4_H - fontSize - 30,
            size: fontSize, font, color: rgb(1, 0, 0),
          });
        }
      }

      // A translated copy goes straight after its original, watermarked with the
      // derived "-P" code. It is a property of the document, not its own entry.
      if (result.translatedFileName) {
        const translatedFile = await getFileFromIndexedDB(result.translatedFileName);
        if (translatedFile) {
          try {
            let tBytes = new Uint8Array(await translatedFile.arrayBuffer());
            const tCode = result.docCode ? `${result.docCode}-P` : '';
            if (addWatermark && tCode) {
              tBytes = await addWatermarkToPDF(tBytes, tCode);
            }
            const tDoc = await PDFDocument.load(tBytes);
            const tPages = await mergedPdf.copyPages(tDoc, tDoc.getPageIndices());
            tPages.forEach(page => mergedPdf.addPage(page));
          } catch (tErr) {
            console.error(`Failed to merge translation of ${result.fileName}:`, tErr);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to merge ${result.fileName}:`, err);
      skippedOther.push(result.fileName);
    }
  }

  const totalPages = mergedPdf.getPageCount();

  if (totalPages > 0) {
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DZO_Združen_${addWatermark ? 'z_vodnim_znakom' : 'brez_vodnega_znaka'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return { success: totalPages > 0, totalPages, skippedDocx, skippedOther, skippedMissing, skippedEncrypted };
};