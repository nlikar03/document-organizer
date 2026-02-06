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

    // Logic for VISUAL Top-Right based on internal rotation
    switch (rotation) {
      case 90:
        // Page is rotated 90 deg CCW internally
        x = margin + textHeight; 
        y = height - margin - textWidth;
        break;
      case 180:
        // Page is upside down internally
        x = margin + textWidth;
        y = margin;
        break;
      case 270:
        // Page is rotated 270 deg CCW internally
        x = width - margin - textHeight;
        y = margin + textWidth;
        break;
      case 0:
      default:
        // Standard orientation
        x = width - textWidth - margin;
        y = height - margin - textHeight;
        break;
    }

    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(1, 0, 0), // Red
      rotate: degrees(rotation), 
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Watermark error:', error);
    return pdfBytes;
  }
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
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
      fileBytes = await addWatermarkToPDF(fileBytes, result.docCode);
    }
    
    const base = file.name.substring(0, file.name.lastIndexOf('.'));
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const newName = `${String(result.fileNumber).padStart(3, '0')}_${base}${ext}`;
    const path = `${folderPaths[result.suggestedFolder.id]}/${newName}`;
    
    zip.file(path, fileBytes);
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

  // Sort by folder hierarchy
  const sorted = [...finalResults].sort((a, b) =>
    a.suggestedFolder.id.localeCompare(b.suggestedFolder.id)
  );

  // Group by top-level folder
  const grouped = {};
  sorted.forEach(res => {
    const pathArr = buildFolderPath(res.suggestedFolder.id);
    const topFolder = pathArr[0] || 'Neznano';
    if (!grouped[topFolder]) grouped[topFolder] = [];
    grouped[topFolder].push({ ...res, __pathArr: pathArr });
  });

  const data = [];

  // Column headers (UNCHANGED)
  data.push([
    'Zap. št.',
    'Originalno ime',
    'Ime dokazila oz. na kaj se dokazilo nanaša',
    'Izdajatelj',
    'Št. dokazila',
    'Datum',
    'Kategorija',
    'Koda dokumenta'
  ]);

  const folderRowIndexes = [];

  Object.keys(grouped).sort().forEach(topFolder => {
    // === MAIN SECTION HEADER (like roman numeral section) ===
    const sectionRowIndex = data.length;
    data.push([topFolder.toUpperCase(), '', '', '', '', '', '', '']);
    folderRowIndexes.push({ row: sectionRowIndex, type: 'section' });

    let currentSub = null;

    grouped[topFolder].forEach(res => {
      const subFolder = res.__pathArr[1]; // second level folder

      // === SUBTITLE ROW (like description row) ===
      if (subFolder && subFolder !== currentSub) {
        currentSub = subFolder;
        const subRowIndex = data.length;
        data.push([`- ${subFolder}`, '', '', '', '', '', '', '']);
        folderRowIndexes.push({ row: subRowIndex, type: 'sub' });
      }

      // === NORMAL ITEM ROW (DATA) ===
      data.push([
        res.fileNumber,
        res.fileName,
        res.documentTitle || '',
        res.issuer || '',
        res.documentNumber || '',
        res.date || '',
        res.__pathArr.join(' / '),
        res.docCode
      ]);
    });

    // spacing row
    data.push(['', '', '', '', '', '', '', '']);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // ===== STYLING =====
  folderRowIndexes.forEach(info => {
    for (let col = 0; col < 8; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: info.row, c: col });
      if (!ws[cellAddress]) continue;

      if (info.type === 'section') {
        ws[cellAddress].s = {
          font: { bold: true, sz: 13 },
          fill: { fgColor: { rgb: 'FFF2CC' } }, // light yellow
          alignment: { vertical: 'center' }
        };
      }

      if (info.type === 'sub') {
        ws[cellAddress].s = {
          font: { bold: true, italic: true },
          fill: { fgColor: { rgb: 'E7F3FF' } }, // light blue
          alignment: { vertical: 'center' }
        };
      }
    }
  });

  // Column widths
  ws['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 45 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 35 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seznam Dokumentov');
  XLSX.writeFile(wb, 'DZO_Dokumenti_Seznam.xlsx');
};