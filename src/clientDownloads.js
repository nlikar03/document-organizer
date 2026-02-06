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

  const sorted = [...finalResults].sort((a, b) =>
    a.suggestedFolder.id.localeCompare(b.suggestedFolder.id)
  );

  const grouped = {};
  sorted.forEach(res => {
    const pathArr = buildFolderPath(res.suggestedFolder.id);
    const topFolder = pathArr[0] || 'Neznano';
    if (!grouped[topFolder]) grouped[topFolder] = [];
    grouped[topFolder].push({ ...res, __pathArr: pathArr });
  });

  const data = [];
  const styleMap = []; // Track rows that need special styling

  let rowIndex = 0;

  Object.keys(grouped).sort().forEach((topFolder, sectionIdx) => {
    // === MAIN SECTION HEADER (Roman numeral + title) ===
    const sectionRow = rowIndex;
    data.push([topFolder, '', '', '', '', '']);
    styleMap.push({ row: sectionRow, type: 'section' });
    rowIndex++;

    

    // === TABLE HEADERS ===
    const headerRow = rowIndex;
    data.push(['zap. št.', 'ime dokazila oz. na kaj se dokazilo nanaša', 'Izdajatelj', 'št. dokazila', 'datum', '']);
    styleMap.push({ row: headerRow, type: 'header' });
    rowIndex++;

    // === DATA ROWS ===
    let itemNumber = 1;
    grouped[topFolder].forEach(res => {
      data.push([
        itemNumber++,
        res.documentTitle || res.fileName,
        res.issuer || '',
        res.documentNumber || '',
        res.date || '',
        ''
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
      // Bold section header
      ws[cellAddress].s = {
        font: { bold: true, sz: 11 },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
    
    if (info.type === 'description') {
      // Italic description
      ws[cellAddress].s = {
        font: { italic: true, sz: 9 },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
      };
    }
    
    if (info.type === 'header') {
      // Bold headers for all columns
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
    if (styleMap.some(s => s.row === rowIdx)) return; // Skip styled rows
    
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

  // Column widths (matching the image proportions)
  ws['!cols'] = [
    { wch: 8 },   // zap. št.
    { wch: 45 },  // ime dokazila
    { wch: 35 },  // izdajatelj
    { wch: 20 },  // št. dokazila
    { wch: 12 },  // datum
    { wch: 5 }    // empty column
  ];

  // Merge cells for section headers and descriptions
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