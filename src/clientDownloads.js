import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { getFileFromIndexedDB } from './indexedDBHelper';

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

export const downloadExcelClientSide = async (finalResults, folders) => {
  const buildFolderPath = (folderId) => {
    const parts = [];
    const ids = folderId.split('.');
    for (let i = 0; i < ids.length; i++) {
      const pid = ids.slice(0, i + 1).join('.');
      const f = folders.find(x => x.id === pid);
      if (f) parts.push(f.name);
    }
    return parts;
  };

  const sorted = [...finalResults].sort((a, b) => {
    const idA = getFolderId(a);
    const idB = getFolderId(b);
    const partsA = idA.split('.').map(Number);
    const partsB = idB.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] ?? -1) - (partsB[i] ?? -1);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  const groups = [];
  sorted.forEach(res => {
    const folderId = getFolderId(res);
    const pathArr = buildFolderPath(folderId);
    const groupKey = pathArr.join(' > ') || 'Neznano';
    const existing = groups.find(g => g.key === groupKey);
    if (existing) existing.items.push(res);
    else groups.push({ key: groupKey, pathArr, items: [res] });
  });

  const data = [];
  const styleMap = [];
  let rowIndex = 0;

  groups.forEach(({ pathArr, items }) => {
    pathArr.forEach((segment, depth) => {
      data.push([`${'  '.repeat(depth)}${segment}`, '', '', '', '', '']);
      styleMap.push({ row: rowIndex, type: depth === 0 ? 'section' : 'subsection', depth });
      rowIndex++;
    });
    data.push(['zap. št.', 'ime dokazila oz. na kaj se dokazilo nanaša', 'Originalna datoteka', 'Izdajatelj', 'št. dokazila', 'datum']);
    styleMap.push({ row: rowIndex, type: 'header' });
    rowIndex++;
    let itemNumber = 1;
    items.forEach(res => {
      data.push([itemNumber++, res.documentTitle || '', (res.originalFileName || res.fileName || '').replace(/\.[^/.]+$/, ''), res.issuer || '', res.documentNumber || '', res.date || '']);
      rowIndex++;
    });
    data.push(['', '', '', '', '', '']);
    rowIndex++;
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  styleMap.forEach(info => {
    const cellAddress = XLSX.utils.encode_cell({ r: info.row, c: 0 });
    if (info.type === 'section') ws[cellAddress].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'left', vertical: 'center' } };
    if (info.type === 'subsection') ws[cellAddress].s = { font: { bold: true, sz: 10, color: { rgb: '444444' } }, alignment: { horizontal: 'left', vertical: 'center' } };
    if (info.type === 'header') {
      for (let col = 0; col < 6; col++) {
        const hc = XLSX.utils.encode_cell({ r: info.row, c: col });
        if (ws[hc]) ws[hc].s = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } } } };
      }
    }
  });

  data.forEach((row, rowIdx) => {
    if (styleMap.some(s => s.row === rowIdx)) return;
    for (let col = 0; col < 6; col++) {
      const ca = XLSX.utils.encode_cell({ r: rowIdx, c: col });
      if (ws[ca]) ws[ca].s = { border: { left: { style: 'dotted', color: { rgb: 'CCCCCC' } }, right: { style: 'dotted', color: { rgb: 'CCCCCC' } }, bottom: { style: 'dotted', color: { rgb: 'CCCCCC' } } } };
    }
  });

  ws['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 35 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 5 }];
  if (!ws['!merges']) ws['!merges'] = [];
  styleMap.forEach(info => {
    if (info.type === 'section' || info.type === 'subsection') ws['!merges'].push({ s: { r: info.row, c: 0 }, e: { r: info.row, c: 5 } });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seznam Dokumentov');
  XLSX.writeFile(wb, 'DZO_Dokumenti_Seznam.xlsx');
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
        if (addWatermark && result.docCode) {
          pdfBytes = await addWatermarkToPDF(pdfBytes, result.docCode);
        }
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
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

  return { success: totalPages > 0, totalPages, skippedDocx, skippedOther, skippedMissing };
};