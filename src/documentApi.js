import { generateDocCode } from './documentUtils';

const API_BASE = 'https://document-organizer-backend-0aje.onrender.com';

export const verifyPassword = async (password) => {
  const response = await fetch(`${API_BASE}/api/verify-password`, {
    method: 'POST',
    headers: { 'X-Password': password }
  });
  return response.ok;
};

export const processOCR = async (files, password, onProgress, onResult) => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/ocr`, {
        method: 'POST',
        headers: { 'X-Password': password },
        body: formData,
      });

      if (!response.ok) throw new Error('OCR Failed');

      const data = await response.json();
      results.push({
        fileName: data.fileName,
        extractedText: data.text || "No text found.",
        originalFile: file
      });
    } catch (error) {
      console.error(error);
      results.push({
        fileName: file.name,
        extractedText: "Error during OCR processing.",
        originalFile: file
      });
    }
    
    onResult(results);
    onProgress(((i + 1) / files.length) * 100);
  }

  return results;
};

export const processAI = async (ocrResults, folders, password, onProgress, onLog, onResult, existingFolderCounts = {}) => {
  const results = [];
  const logs = [];
  const folderCounts = { ...existingFolderCounts }; // Start with existing counts

  logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: 'AI proces začet (GPT-5-mini) - paralelno procesiranje...' });
  onLog(logs);

  const BATCH_SIZE = 5;
  for (let i = 0; i < ocrResults.length; i += BATCH_SIZE) {
    const batch = ocrResults.slice(i, i + BATCH_SIZE);
    
    logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: `Analiziram batch ${Math.floor(i/BATCH_SIZE) + 1}...` });
    onLog(logs);

    try {
      const response = await fetch(`${API_BASE}/api/classify-batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Password': password
        },
        body: JSON.stringify({
          texts: batch.map(r => r.extractedText),
          fileNames: batch.map(r => r.fileName),
          structure: folders
        }),
      });

      if (!response.ok) throw new Error('AI Batch Failed');

      const batchResponse = await response.json();
      
      // Process batch results
      for (let j = 0; j < batchResponse.results.length; j++) {
        const item = batchResponse.results[j];
        const originalResult = batch[j];
        const folderId = item.classification.suggestedFolder.id;
        
        folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
        const fileNumber = folderCounts[folderId];
        
        const docCode = generateDocCode(folderId, folders) + '.' + String(fileNumber).padStart(3, '0');
        
        logs.push({ 
          time: new Date().toLocaleTimeString('sl-SI'), 
          message: `✓ ${item.fileName} → ${docCode}`,
          success: true 
        });

        results.push({
          ...originalResult,
          suggestedFolder: item.classification.suggestedFolder,
          fileNumber: fileNumber,
          docCode: docCode,
          documentTitle: item.classification.documentTitle || "",
          issuer: item.classification.issuer || "",
          documentNumber: item.classification.documentNumber || "",
          date: item.classification.date || ""
        });
      }

      onLog([...logs]);
      onResult([...results]);
      onProgress(((i + batch.length) / ocrResults.length) * 100);

    } catch (error) {
      // Handle batch error - mark all items in batch as failed
      for (const result of batch) {
        logs.push({ 
          time: new Date().toLocaleTimeString('sl-SI'), 
          message: `❌ Napaka pri ${result.fileName}`,
          success: false 
        });
        
        results.push({
          ...result,
          suggestedFolder: { id: folders[0].id, name: folders[0].name, fullPath: folders[0].name },
          fileNumber: 1,
          docCode: '0.001'
        });
      }
      
      onLog([...logs]);
      onResult([...results]);
      onProgress(((i + batch.length) / ocrResults.length) * 100);
    }
  }

  logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: '✓ AI proces zaključen!', success: true });
  onLog(logs);
  
  return results;
};




