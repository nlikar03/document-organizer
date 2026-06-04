import { useState } from 'react';
import { verifyPassword, processOCR, processAI } from './documentApi';
import { saveFileToIndexedDB } from './indexedDBHelper';

export const useFileProcessing = () => {
  const [files, setFiles] = useState([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState(() => {
    const saved = localStorage.getItem('ocrResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataProgress, setMetadataProgress] = useState(0);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  const setOcrResultsWithSave = (results) => {
    const updated = typeof results === 'function' ? results(ocrResults) : results;
    setOcrResults(updated);
    localStorage.setItem('ocrResults', JSON.stringify(updated));
  };

  // ── Auth ───────────────────────────────────────────────────────────────────

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setAuthError('Prosim vnesite geslo'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Napačno geslo');
        setPassword('');
        setAuthLoading(false);
      }
    } catch {
      setAuthError('Napaka pri preverjanju gesla');
      setAuthLoading(false);
    }
  };

  // ── File input ─────────────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    const allFiles = [...files, ...newFiles];
    if (allFiles.length > 200) { alert('Maksimalno število datotek je 200 na enkrat.'); return; }
    if (allFiles.reduce((s, f) => s + f.size, 0) > 150 * 1024 * 1024) {
      alert('Skupna velikost datotek presega 150MB.');
      return;
    }
    setFiles(allFiles);
  };

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));
  const removeAllFiles = () => setFiles([]);

  // ── Direct folder uploads ──────────────────────────────────────────────────

  const handleDirectUploadToFolder = async (folderId, uploadedFiles, setDirectUploadsWithSave) => {
    const newUploads = [];
    for (const file of uploadedFiles) {
      await saveFileToIndexedDB(file.name, file);
      newUploads.push({
        id: `direct_${Date.now()}_${Math.random()}`,
        fileName: file.name,
        folderId,
        originalFile: file,
        documentTitle: '',
        issuer: '',
        documentNumber: '',
        date: '',
        isDirectUpload: true,
      });
    }
    setDirectUploadsWithSave(prev => [...prev, ...newUploads]);
  };

  // ── Folder drag-and-drop ───────────────────────────────────────────────────

  const readEntryRecursive = (entry, parentFolderId, parentLevel) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file(
          (file) => resolve({ newFolders: [], files: [{ file, folderId: parentFolderId }] }),
          () => resolve({ newFolders: [], files: [] })
        );
      } else if (entry.isDirectory) {
        const folderId = parentFolderId === 'root'
          ? `drop_${Date.now()}_${Math.random().toString(36).slice(2)}`
          : `${parentFolderId}.${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const folderEntry = { id: folderId, name: entry.name, level: parentLevel, expanded: true };
        const reader = entry.createReader();

        const readAllEntries = (accumulated) => {
          reader.readEntries(async (batch) => {
            if (batch.length === 0) {
              const childResults = await Promise.all(
                accumulated.map(child => readEntryRecursive(child, folderId, parentLevel + 1))
              );
              const newFolders = [folderEntry];
              const files = [];
              for (const r of childResults) {
                newFolders.push(...r.newFolders);
                files.push(...r.files);
              }
              resolve({ newFolders, files });
            } else {
              readAllEntries([...accumulated, ...batch]);
            }
          }, () => resolve({ newFolders: [folderEntry], files: [] }));
        };
        readAllEntries([]);
      } else {
        resolve({ newFolders: [], files: [] });
      }
    });
  };

  const handleFolderDrop = async (dataTransferItems, dropTargetFolderId, folders, setFoldersWithSave, setDirectUploadsWithSave) => {
    const entries = Array.from(dataTransferItems)
      .map(item => item.webkitGetAsEntry?.())
      .filter(Boolean);

    if (entries.length === 0) return;

    const parentFolderId = dropTargetFolderId || 'root';
    const parentLevel = dropTargetFolderId
      ? (folders.find(f => f.id === dropTargetFolderId)?.level ?? 0) + 1
      : 0;

    const results = await Promise.all(
      entries.map(entry => readEntryRecursive(entry, parentFolderId, parentLevel))
    );

    const newFolders = results.flatMap(r => r.newFolders);
    const newFiles = results.flatMap(r => r.files);

    if (newFolders.length > 0) {
      let updatedFolders;
      if (dropTargetFolderId) {
        const targetIndex = folders.findIndex(f => f.id === dropTargetFolderId);
        let insertAt = targetIndex + 1;
        while (insertAt < folders.length && folders[insertAt].id.startsWith(dropTargetFolderId + '.')) insertAt++;
        updatedFolders = [
          ...folders.slice(0, insertAt),
          ...newFolders,
          ...folders.slice(insertAt),
        ].map(f => f.id === dropTargetFolderId ? { ...f, expanded: true } : f);
      } else {
        updatedFolders = [...folders, ...newFolders];
      }
      setFoldersWithSave(updatedFolders);
    }

    const filteredFiles = newFiles.filter(f => f.folderId !== 'root');
    if (filteredFiles.length > 0) {
      const newUploads = [];
      for (const { file, folderId } of filteredFiles) {
        await saveFileToIndexedDB(file.name, file);
        newUploads.push({
          id: `direct_${Date.now()}_${Math.random()}`,
          fileName: file.name,
          folderId,
          originalFile: file,
          documentTitle: '',
          issuer: '',
          documentNumber: '',
          date: '',
          isDirectUpload: true,
        });
      }
      setDirectUploadsWithSave(prev => [...prev, ...newUploads]);
    }
  };

  // ── OCR ────────────────────────────────────────────────────────────────────

  const startOCRProcessing = async (setCurrentStepWithSave) => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrResultsWithSave([]);
    setCurrentStepWithSave(3);
    const results = await processOCR(files, password, setOcrProgress, setOcrResultsWithSave);
    for (const result of results) {
      await saveFileToIndexedDB(result.fileName, result.originalFile);
    }
    setOcrProcessing(false);
  };

  // ── AI ─────────────────────────────────────────────────────────────────────

  const startAIProcessing = async (folders, setFinalResultsWithSave, setCurrentStepWithSave) => {
    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);
    setCurrentStepWithSave(4);
    await processAI(
      ocrResults,
      folders,
      password,
      setAiProgress,
      setAiLogs,
      (newResults) => setFinalResultsWithSave(prev => [...prev, ...newResults])
    );
    setAiProcessing(false);
  };

  // ── Metadata extraction ────────────────────────────────────────────────────

  const openMetadataExtractionModal = () => setShowMetadataModal(true);
  const closeMetadataExtractionModal = () => { if (!isExtractingMetadata) setShowMetadataModal(false); };

  const extractMetadataForSelectedFiles = async (selectedFiles, setDirectUploadsWithSave, setFinalResultsWithSave) => {
    if (selectedFiles.length === 0) return;
    setIsExtractingMetadata(true);
    setMetadataProgress(0);

    try {
      const CHUNK_SIZE = 3;
      const totalChunks = Math.ceil(selectedFiles.length / CHUNK_SIZE);
      const allMetadata = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = selectedFiles.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
        await new Promise(r => setTimeout(r, 0));
        setMetadataProgress((chunkIndex / totalChunks) * 100);
        await new Promise(r => setTimeout(r, 50));

        try {
          const formData = new FormData();
          for (const upload of chunk) {
            const file = await import('./indexedDBHelper').then(m => m.getFileFromIndexedDB(upload.fileName));
            if (file) formData.append('files', file);
          }
          const response = await fetch(
            'https://document-organizer-backend-0aje.onrender.com/api/extract-metadata-batch',
            { method: 'POST', headers: { 'X-Password': password }, body: formData }
          );
          if (!response.ok) throw new Error('Batch failed');
          const data = await response.json();
          allMetadata.push(...data.results);
        } catch (err) {
          console.error(`Chunk ${chunkIndex + 1} failed:`, err);
          chunk.forEach(f => allMetadata.push({ fileName: f.fileName, documentTitle: '', issuer: '', documentNumber: '', date: '' }));
        }

        setMetadataProgress(((chunkIndex + 1) / totalChunks) * 100);
        await new Promise(r => setTimeout(r, 0));
      }

      const metadataById = Object.fromEntries(
        selectedFiles.map((file, i) => [file.id, allMetadata[i] || {}])
      );

      const applyMetadata = (file) => {
        const m = metadataById[file.id];
        if (!m) return file;
        return {
          ...file,
          documentTitle: m.documentTitle || file.documentTitle,
          issuer: m.issuer || file.issuer,
          documentNumber: m.documentNumber || file.documentNumber,
          date: m.date || file.date,
        };
      };

      setDirectUploadsWithSave(prev => prev.map(applyMetadata));
      setFinalResultsWithSave(prev => prev.map(applyMetadata));
      setShowMetadataModal(false);
    } catch (error) {
      console.error('Metadata extraction error:', error);
      alert('Napaka pri izvlačenju metapodatkov');
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  return {
    files,
    ocrProgress,
    ocrProcessing,
    ocrResults,
    aiProgress,
    aiProcessing,
    aiLogs,
    password,
    isAuthenticated,
    authError,
    authLoading,
    isExtractingMetadata,
    metadataProgress,
    showMetadataModal,
    setPassword,
    setOcrResultsWithSave,
    handlePasswordSubmit,
    handleFileUpload,
    removeFile,
    removeAllFiles,
    handleDirectUploadToFolder,
    handleFolderDrop,
    startOCRProcessing,
    startAIProcessing,
    openMetadataExtractionModal,
    closeMetadataExtractionModal,
    extractMetadataForSelectedFiles,
  };
};
