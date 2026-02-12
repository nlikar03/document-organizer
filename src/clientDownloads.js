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
        x = margin + textHeight; 
        y = height - margin - textWidth;
        break;
      case 180:
        x = margin + textWidth;
        y = margin;
        break;
      case 270:
        x = width - margin - textHeight;
        y = margin + textWidth;
        break;
      case 0:
      default:
        x = width - textWidth - margin;
        y = height - margin - textHeight;
        break;
    }

    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(1, 0, 0),
      rotate: degrees(rotation), 
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Watermark error:', error);
    return pdfBytes;
  }
};

// Helper: get the folder ID regardless of whether file is a direct upload or AI-classified
const getFolderId = (result) => {
  // AI-classified files have suggestedFolder.id
  // Direct uploads have folderId (string)
  return result.suggestedFolder?.id ?? result.folderId;
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

    // FIX: use getFolderId() to support both direct uploads and AI-classified files
    const folderId = getFolderId(result);
    const folderPath = folderPaths[folderId];
    if (!folderPath) {
      console.warn(`No folder path found for folderId "${folderId}" on file "${result.fileName}" — skipping.`);
      continue;
    }
    const path = `${folderPath}/${newName}`;
    
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

  // FIX: use getFolderId() to support both direct uploads and AI-classified files
  const sorted = [...finalResults].sort((a, b) =>
    getFolderId(a).localeCompare(getFolderId(b))
  );

  const grouped = {};
  sorted.forEach(res => {
    const folderId = getFolderId(res);
    const pathArr = buildFolderPath(folderId);
    const topFolder = pathArr[0] || 'Neznano';
    if (!grouped[topFolder]) grouped[topFolder] = [];
    grouped[topFolder].push({ ...res, __pathArr: pathArr });
  });

  const data = [];
  const styleMap = [];

  let rowIndex = 0;

  Object.keys(grouped).sort().forEach((topFolder) => {
    // === MAIN SECTION HEADER ===
    const sectionRow = rowIndex;
    data.push([topFolder, '', '', '', '', '']);
    styleMap.push({ row: sectionRow, type: 'section' });
    rowIndex++;

    // === TABLE HEADERS ===
    const headerRow = rowIndex;
    data.push([
      'zap. št.',
      'ime dokazila oz. na kaj se dokazilo nanaša',
      'Originalna datoteka',
      'Izdajatelj',
      'št. dokazila',
      'datum'
    ]);
    styleMap.push({ row: headerRow, type: 'header' });
    rowIndex++;

    // === DATA ROWS ===
    let itemNumber = 1;
    grouped[topFolder].forEach(res => {
      data.push([
        itemNumber++,
        res.documentTitle || '',
        res.originalFileName || res.fileName || '',
        res.issuer || '',
        res.documentNumber || '',
        res.date || ''
      ]);
      rowIndex++;
    });

    // Empty row separator
    data.push(['', '', '', '', '', '']);
    rowIndex++;
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // ===== STYLING =====
  styleMap.forEach(info => {
    const cellAddress = XLSX.utils.encode_cell({ r: info.row, c: 0 });
    
    if (info.type === 'section') {
      ws[cellAddress].s = {
        font: { bold: true, sz: 11 },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
    
    if (info.type === 'description') {
      ws[cellAddress].s = {
        font: { italic: true, sz: 9 },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
      };
    }
    
    if (info.type === 'header') {
      for (let col = 0; col < 6; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: info.row, c: col });
        if (ws[headerCell]) {
          ws[headerCell].s = {
            font: { bold: true, sz: 10 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }
    }
  });

  // Add borders to data rows
  data.forEach((row, rowIdx) => {
    if (styleMap.some(s => s.row === rowIdx)) return;
    
    for (let col = 0; col < 6; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: col });
      if (ws[cellAddr]) {
        ws[cellAddr].s = {
          border: {
            left: { style: 'dotted', color: { rgb: 'CCCCCC' } },
            right: { style: 'dotted', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'dotted', color: { rgb: 'CCCCCC' } }
          }
        };
      }
    }
  });

  ws['!cols'] = [
    { wch: 8 },
    { wch: 45 },
    { wch: 35 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
    { wch: 5 }
  ];

  if (!ws['!merges']) ws['!merges'] = [];
  styleMap.forEach(info => {
    if (info.type === 'section' || info.type === 'description') {
      ws['!merges'].push({
        s: { r: info.row, c: 0 },
        e: { r: info.row, c: 5 }
      });
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seznam Dokumentov');
  XLSX.writeFile(wb, 'DZO_Dokumenti_Seznam.xlsx');
};