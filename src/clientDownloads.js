import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getFileFromIndexedDB } from './indexedDBHelper';
import * as pdfjsLib from 'pdfjs-dist';

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

export const downloadZipClientSide = async (finalResults, folders) => {
  const zip = new JSZip();
  
  const folderPaths = {};
  for (const folder of folders) {
    const parts = [];
    const ids = folder.id.split('.');
    for (let i = 0; i < ids.length; i++) {
      const fid = ids.slice(0, i + 1).join('.');
      const f = folders.find(x => x.id === fid);
      if (f) parts.push(f.name);
    }
    const path = parts.join('/');
    folderPaths[folder.id] = path;
    zip.folder(path);
  }
  
  for (const result of finalResults) {
    const file = await getFileFromIndexedDB(result.fileName);
    if (!file) continue;
    
    let fileBytes = await file.arrayBuffer();
    
    if (getExt(result.fileName) === 'pdf') {
      fileBytes = await addWatermarkToPDF(fileBytes, result.docCode);
    }
    
    const base = result.fileName.substring(0, result.fileName.lastIndexOf('.'));
    const ext = result.fileName.substring(result.fileName.lastIndexOf('.'));
    const newName = `${String(result.fileNumber).padStart(3, '0')}_${base}${ext}`;

    const folderId = getFolderId(result);
    const folderPath = folderPaths[folderId];
    if (!folderPath) {
      console.warn(`No folder path for "${folderId}" on "${result.fileName}" — skipping.`);
      continue;
    }
    zip.file(`${folderPath}/${newName}`, fileBytes);
  }
  
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DZO_Dokumenti.zip';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};



// ─── BORDER HELPERS ───────────────────────────────────────────────────────────
 
const thinTop       = { top:    { style: 'thin'  } };
const hairBottom    = { bottom: { style: 'hair'  } };
const thinBottom    = { bottom: { style: 'thin'  } };
const thickRight    = { right:  { style: 'thick' } };
const thickLeft     = { left:   { style: 'thick' } };
const thickLeftRight= { left:   { style: 'thick' }, right: { style: 'thick' } };
 
const mergeBorders = (...borders) => {
  const result = {};
  for (const b of borders) Object.assign(result, b);
  return result;
};
 
// ─── STYLE APPLIERS ──────────────────────────────────────────────────────────
 
const applyTitleRowStyle = (row) => {
  // Col A: section number (e.g. "I.")
  const a = row.getCell(1);
  a.font = { bold: true, size: 10 };
  a.alignment = { horizontal: 'left' };
  a.border = mergeBorders(thinTop, hairBottom);

  // Cols B–F: section title (merged)
  for (let c = 2; c <= 6; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'left', wrapText: true };
    cell.border = mergeBorders(thinTop, hairBottom);
  }
};
 
const applyDescRowStyle = (row) => {
  // Col A: empty
  row.getCell(1).border = thinBottom;
  // Cols B–F: italic description (merged)
  for (let c = 2; c <= 6; c++) {
    const cell = row.getCell(c);
    cell.font = { italic: true, size: 9 };
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cell.border = thinBottom;
  }
};
 
const applySubTitleRowStyle = (row) => {
  // Indented child section title — slightly smaller, still bold
  const a = row.getCell(1);
  a.font = { bold: true, size: 9 };
  a.alignment = { horizontal: 'left' };
  a.border = mergeBorders(thinTop, hairBottom);

  for (let c = 2; c <= 6; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'left', wrapText: true };
    cell.border = mergeBorders(thinTop, hairBottom);
  }
};
 
const applyHeaderRowStyle = (row) => {
  // Col A: "šifra" (zap. št.)
  const a = row.getCell(1);
  a.font = { size: 9 };
  a.alignment = { vertical: 'top', wrapText: true };
  a.border = mergeBorders(thinTop, hairBottom, thickRight);

  // Col B: "ime dokazila + originalna datoteka" (combined, thick right)
  row.getCell(2).font = { size: 9 };
  row.getCell(2).alignment = { vertical: 'top', wrapText: true };
  row.getCell(2).border = mergeBorders(thinTop, hairBottom, thickRight);

  // Col C–D: "izdajatelj" (merged, thick right on D)
  row.getCell(3).font = { size: 9 };
  row.getCell(3).alignment = { vertical: 'top', wrapText: true };
  row.getCell(3).border = mergeBorders(thinTop, hairBottom);
  row.getCell(4).border = mergeBorders(thinTop, hairBottom, thickRight);

  // Col E: "št. dokazila" (thick left+right)
  row.getCell(5).font = { size: 9 };
  row.getCell(5).alignment = { vertical: 'top', wrapText: false };
  row.getCell(5).border = mergeBorders(thinTop, hairBottom, thickLeftRight);

  // Col F: "datum"
  row.getCell(6).font = { size: 9 };
  row.getCell(6).alignment = { vertical: 'top', wrapText: false };
  row.getCell(6).border = mergeBorders(thinTop, hairBottom);
};
 
const DATA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
 
const applyDataRowStyle = (row) => {
  const a = row.getCell(1);
  a.font = { bold: true, size: 9 };
  a.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
  a.fill = DATA_FILL;
  a.border = mergeBorders(hairBottom, { top: { style: 'hair' } }, thickRight);

  for (let c = 2; c <= 6; c++) {
    const cell = row.getCell(c);
    cell.font = { size: 9 };
    cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
    cell.fill = DATA_FILL;

    let border = mergeBorders({ top: { style: 'hair' } }, hairBottom);
    if (c === 2) border = mergeBorders(border, thickRight);  // B: title+file → thick right
    if (c === 4) border = mergeBorders(border, thickRight);  // D: end of issuer merge → thick right
    if (c === 5) border = mergeBorders(border, thickLeftRight); // E: št. dokazila
    cell.border = border;
  }
};

const buildTree = (folders) => {
  const map = {};
  const roots = [];
 
  folders.forEach(f => { map[f.id] = { ...f, children: [] }; });
 
  folders.forEach(f => {
    const parts = f.id.split('.');
    if (parts.length === 1) {
      roots.push(map[f.id]);
    } else {
      const parentId = parts.slice(0, -1).join('.');
      if (map[parentId]) map[parentId].children.push(map[f.id]);
      else roots.push(map[f.id]); // orphan → treat as root
    }
  });
 
  return roots;
};
 
// Roman numerals for top-level sections
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
 
// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
 
export const downloadExcelClientSide = async (finalResults, folders) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Seznam Dokumentov', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });
 
  // Columns: A(seq), B(title), C(cont.), D(issuer), E(cont.), F(docNum), G(date)
  ws.columns = [
    { width: 8  },  // A – šifra
    { width: 55 },  // B – ime dokazila + originalna datoteka
    { width: 22 },  // C – izdajatelj
    { width: 16 },  // D – (continuation of C)
    { width: 14 },  // E – št. dokazila
    { width: 12 },  // F – datum
  ];
 
  // ── index items by folderId for quick lookup
  const itemsByFolder = {};
  finalResults.forEach(r => {
    const id = getFolderId(r);
    if (!itemsByFolder[id]) itemsByFolder[id] = [];
    itemsByFolder[id].push(r);
  });
 
  // ── helper: add a section block (title + desc + headers + rows) to the sheet
  const addSectionBlock = (node, romanLabel, depth) => {
    const isTopLevel = depth === 0;
    const titleRowNum = ws.lastRow ? ws.lastRow.number + 1 : 1;
 
    // ── TITLE ROW
    const sectionLabel = romanLabel ? `${romanLabel}.` : '';
    const titleRow = ws.addRow([sectionLabel, node.name, '', '', '', '']);
    ws.mergeCells(titleRow.number, 2, titleRow.number, 6);
    if (isTopLevel) applyTitleRowStyle(titleRow);
    else applySubTitleRowStyle(titleRow);
 
    // ── DESCRIPTION ROW
    const desc = node.description ||
      'Tabelarični seznam posameznih dokazil z oštevilčenjem, kot si sledijo v prilogah.';
    const descRow = ws.addRow(['', desc, '', '', '', '']);
    ws.mergeCells(descRow.number, 2, descRow.number, 6);
    applyDescRowStyle(descRow);
    descRow.height = undefined; // auto
 
    // ── COLUMN HEADER ROW (only when there are direct items)
    const directItems = itemsByFolder[node.id] || [];
    if (directItems.length > 0) {
      const headerRow = ws.addRow([
        'šifra',
        'ime dokazila oz. \nna kaj se dokazilo nanaša / originalna datoteka',
        'izdajatelj', '',
        'št. dokazila',
        'datum',
      ]);
      ws.mergeCells(headerRow.number, 3, headerRow.number, 4);
      applyHeaderRowStyle(headerRow);
      headerRow.height = 66;

      // ── DATA ROWS
      directItems.forEach((r) => {
        const origFile = (r.originalFileName || r.fileName || '').replace(/\.[^/.]+$/, '');
        const titleCell = r.documentTitle
          ? (origFile ? `${r.documentTitle}\n${origFile}` : r.documentTitle)
          : origFile;
        const docRow = ws.addRow([
          r.docCode || '',
          titleCell,
          r.issuer || '',
          '',
          r.documentNumber || '',
          r.date || '',
        ]);
        ws.mergeCells(docRow.number, 3, docRow.number, 4);
        applyDataRowStyle(docRow);
      });
    }
 
    // ── CHILD SECTIONS (recursive)
    node.children.forEach(child => {
      addSectionBlock(child, null, depth + 1);
    });
  };
 
  // ── Build tree and render
  const tree = buildTree(folders);
  tree.forEach((rootNode, idx) => {
    addSectionBlock(rootNode, ROMAN[idx] ?? String(idx + 1), 0);
  });
 
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'DZO_Dokumenti_Seznam.xlsx');
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
              for (const { bytes: imgBytes, width, height } of pageImages) {
                const img = await mergedPdf.embedPng(imgBytes);
                const scale = Math.min(A4_W / width, A4_H / height);
                const drawW = width * scale;
                const drawH = height * scale;
                const page = mergedPdf.addPage([A4_W, A4_H]);
                page.drawImage(img, { x: (A4_W - drawW) / 2, y: (A4_H - drawH) / 2, width: drawW, height: drawH });
                if (addWatermark && result.docCode) {
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