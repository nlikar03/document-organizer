import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { getFileFromIndexedDB } from './indexedDBHelper';

export const addWatermarkToPDF = async (pdfBytes, watermarkText) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBytes;

    const firstPage = pages[0];
    
    const { width, height } = firstPage.getSize();
    const rotationAngle = firstPage.getRotation().angle;

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 20;
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    
    const margin = 30;


    firstPage.drawText(watermarkText, {
      x: width - textWidth - margin, 
      y: height - margin - 15, 
      size: fontSize,
      font: font,
      color: rgb(1, 0, 0),
      rotate: degrees(rotationAngle), 
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Watermark error:', error);
    return pdfBytes;
  }
};

export const downloadZipClientSide = async (finalResults, folders) => {
  const zip = new JSZip();
  
  // Create folder structure
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
  
  // Add files
  for (const result of finalResults) {
    const file = await getFileFromIndexedDB(result.fileName);
    if (!file) continue;
    
    let fileBytes = await file.arrayBuffer();
    
    // Add watermark to PDFs
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
    return parts.join(' / ');
  };
  
  const sorted = [...finalResults].sort((a, b) => 
    a.suggestedFolder.id.localeCompare(b.suggestedFolder.id)
  );
  
  const data = [
    ['Zap. št.', 'Ime dokazila oz. na kaj se dokazilo nanaša', 'Izdajatelj', 'Št. dokazila', 'Datum', 'Kategorija', 'Koda dokumenta']
  ];
  
  for (const res of sorted) {
    data.push([
      res.fileNumber,
      res.documentTitle || '',
      res.issuer || '',
      res.documentNumber || '',
      res.date || '',
      buildFolderPath(res.suggestedFolder.id),
      res.docCode
    ]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seznam Dokumentov');
  XLSX.writeFile(wb, 'DZO_Dokumenti_Seznam.xlsx');
};