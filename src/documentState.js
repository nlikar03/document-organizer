import { useState } from 'react';
import { defaultStructure, generateDocCode, getFullPath } from './documentUtils';
import { verifyPassword, processOCR, processAI, extractMetadataBatch } from './documentApi';
import { saveFileToIndexedDB } from './indexedDBHelper';

export const useDocumentState = () => {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('folders');
    return saved ? JSON.parse(saved) : defaultStructure;
  });
  
  const [files, setFiles] = useState([]);
  
  const [directUploads, setDirectUploads] = useState(() => {
    const saved = localStorage.getItem('directUploads');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('currentStep');
    return saved ? parseInt(saved) : 1;
  });
  
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  
  const [ocrResults, setOcrResults] = useState(() => {
    const saved = localStorage.getItem('ocrResults');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);
  
  const [finalResults, setFinalResults] = useState(() => {
    const saved = localStorage.getItem('finalResults');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [processedFilesCount, setProcessedFilesCount] = useState(() => {
    const saved = localStorage.getItem('processedFilesCount');
    return saved ? parseInt(saved) : 0;
  });

  const [processedFiles, setProcessedFiles] = useState(() => {
    const saved = localStorage.getItem('processedFiles');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [folderCounts, setFolderCounts] = useState(() => {
    const saved = localStorage.getItem('folderCounts');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [viewingOcrText, setViewingOcrText] = useState(null);
  
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileData, setEditingFileData] = useState(null);

  const [authLoading, setAuthLoading] = useState(false);
  
  const [isMetadataExtracted, setIsMetadataExtracted] = useState(() => {
    const saved = localStorage.getItem('isMetadataExtracted');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isFinalized, setIsFinalized] = useState(() => {
    const saved = localStorage.getItem('isFinalized');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [metadataProgress, setMetadataProgress] = useState(0);
  
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  
  const [skippedAIClassification, setSkippedAIClassification] = useState(() => {
    const saved = localStorage.getItem('skippedAIClassification');
    return saved ? JSON.parse(saved) : false;
  });

  // Wrapper functions to save to localStorage
  const setFoldersWithSave = (newFolders) => {
    const updated = typeof newFolders === 'function' ? newFolders(folders) : newFolders;
    setFolders(updated);
    localStorage.setItem('folders', JSON.stringify(updated));
  };

  const setCurrentStepWithSave = (step) => {
    setCurrentStep(step);
    localStorage.setItem('currentStep', step.toString());
  };

  const setOcrResultsWithSave = (results) => {
    const updated = typeof results === 'function' ? results(ocrResults) : results;
    setOcrResults(updated);
    localStorage.setItem('ocrResults', JSON.stringify(updated));
  };

  const setFinalResultsWithSave = (results) => {
    const updated = typeof results === 'function' ? results(finalResults) : results;
    setFinalResults(updated);
    localStorage.setItem('finalResults', JSON.stringify(updated));
  };

  const setProcessedFilesWithSave = (files) => {
    const updated = typeof files === 'function' ? files(processedFiles) : files;
    setProcessedFiles(updated);
    localStorage.setItem('processedFiles', JSON.stringify(updated));
  };

  const setFolderCountsWithSave = (counts) => {
    const updated = typeof counts === 'function' ? counts(folderCounts) : counts;
    setFolderCounts(updated);
    localStorage.setItem('folderCounts', JSON.stringify(updated));
  };

  const setProcessedFilesCountWithSave = (count) => {
    const updated = typeof count === 'function' ? count(processedFilesCount) : count;
    setProcessedFilesCount(updated);
    localStorage.setItem('processedFilesCount', updated.toString());
  };
  
  const setDirectUploadsWithSave = (uploads) => {
    const updated = typeof uploads === 'function' ? uploads(directUploads) : uploads;
    setDirectUploads(updated);
    localStorage.setItem('directUploads', JSON.stringify(updated));
  };
  
  const setIsMetadataExtractedWithSave = (value) => {
    setIsMetadataExtracted(value);
    localStorage.setItem('isMetadataExtracted', JSON.stringify(value));
  };
  
  const setIsFinalizedWithSave = (value) => {
    setIsFinalized(value);
    localStorage.setItem('isFinalized', JSON.stringify(value));
  };
  
  const setSkippedAIClassificationWithSave = (value) => {
    setSkippedAIClassification(value);
    localStorage.setItem('skippedAIClassification', JSON.stringify(value));
  };

  // Folder management
  const toggleFolder = (id) => {
    setFoldersWithSave(folders.map(f => {
      if (f.id === id) return { ...f, expanded: !f.expanded };
      if (f.id.startsWith(id + '.')) return { ...f, expanded: false };
      return f;
    }));
  };

  const addFolder = (parentId, level) => {
    const newId = parentId === 'root' ? Date.now().toString() : `${parentId}.${Date.now()}`;
    const newFolder = { id: newId, name: 'Nova Mapa', level: level, expanded: false };
    
    if (parentId === 'root') {
      setFoldersWithSave([...folders, newFolder]);
    } else {
      const parentIndex = folders.findIndex(f => f.id === parentId);
      const newFolders = [...folders];
      let insertIndex = parentIndex + 1;
      while (insertIndex < newFolders.length && newFolders[insertIndex].id.startsWith(parentId + '.')) {
        insertIndex++;
      }
      newFolders.splice(insertIndex, 0, newFolder);
      setFoldersWithSave(newFolders);
    }
    
    setEditingId(newId);
    setEditingName('Nova Mapa');
  };

  const deleteFolder = (id) => {
    setFoldersWithSave(folders.filter(f => f.id !== id && !f.id.startsWith(id + '.')));
    setDirectUploadsWithSave(directUploads.filter(f => f.folderId !== id && !f.folderId?.startsWith(id + '.')));
  };

  const deleteAllFolders = () => {
    setFoldersWithSave([]);
    setDirectUploadsWithSave([]);
  };

  const moveFolderUp = (id) => {
    const index = folders.findIndex(f => f.id === id);
    if (index <= 0) return;
    
    const folder = folders[index];
    const folderLevel = folder.level;
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    let prevSiblingIndex = -1;
    
    for (let i = index - 1; i >= 0; i--) {
      const potentialSibling = folders[i];
      if (potentialSibling.level === folderLevel) {
        const potentialParentId = potentialSibling.id.split('.').slice(0, -1).join('.');
        if (potentialParentId === parentId) {
          prevSiblingIndex = i;
          break;
        }
      }
      if (potentialSibling.level < folderLevel) break;
    }
    
    if (prevSiblingIndex === -1) return;
    
    const folderAndDescendants = folders.filter(f => f.id === id || f.id.startsWith(id + '.'));
    const prevSibling = folders[prevSiblingIndex];
    const prevSiblingAndDescendants = folders.filter(f => f.id === prevSibling.id || f.id.startsWith(prevSibling.id + '.'));
    const withoutBoth = folders.filter(f => !folderAndDescendants.includes(f) && !prevSiblingAndDescendants.includes(f));
    
    const newFolders = [
      ...withoutBoth.slice(0, prevSiblingIndex),
      ...folderAndDescendants,
      ...prevSiblingAndDescendants,
      ...withoutBoth.slice(prevSiblingIndex)
    ];
    
    setFoldersWithSave(newFolders);
  };
  
  const moveFolderDown = (id) => {
    const index = folders.findIndex(f => f.id === id);
    if (index === -1) return;
    
    const folder = folders[index];
    const folderLevel = folder.level;
    const folderAndDescendants = folders.filter(f => f.id === id || f.id.startsWith(id + '.'));
    const lastDescendantIndex = folders.findIndex(f => f.id === folderAndDescendants[folderAndDescendants.length - 1].id);
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    let nextSiblingIndex = -1;
    
    for (let i = lastDescendantIndex + 1; i < folders.length; i++) {
      const potentialSibling = folders[i];
      if (potentialSibling.level === folderLevel) {
        const potentialParentId = potentialSibling.id.split('.').slice(0, -1).join('.');
        if (potentialParentId === parentId) {
          nextSiblingIndex = i;
          break;
        }
      }
      if (potentialSibling.level < folderLevel) break;
    }
    
    if (nextSiblingIndex === -1) return;
    
    const nextSibling = folders[nextSiblingIndex];
    const nextSiblingAndDescendants = folders.filter(f => f.id === nextSibling.id || f.id.startsWith(nextSibling.id + '.'));
    const withoutBoth = folders.filter(f => !folderAndDescendants.includes(f) && !nextSiblingAndDescendants.includes(f));
    
    const newFolders = [
      ...withoutBoth.slice(0, index),
      ...nextSiblingAndDescendants,
      ...folderAndDescendants,
      ...withoutBoth.slice(index)
    ];
    
    setFoldersWithSave(newFolders);
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id) => {
    setFoldersWithSave(folders.map(f => f.id === id ? { ...f, name: editingName } : f));
    setEditingId(null);
    setEditingName('');
  };

  // File management
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    const allFiles = [...files, ...newFiles];
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (allFiles.length > 200) {
      alert('Maksimalno število datotek je 200 na enkrat.');
      return;
    }
    
    if (totalSize > 150 * 1024 * 1024) {
      alert('Skupna velikost datotek presega 150MB.');
      return;
    }
    
    setFiles(allFiles);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };
  
  const removeAllFiles = () => {
    setFiles([]);
  };
  
  const handleDirectUploadToFolder = async (folderId, uploadedFiles) => {
    const newUploads = [];
    
    for (const file of uploadedFiles) {
      await saveFileToIndexedDB(file.name, file);
      
      newUploads.push({
        id: `direct_${Date.now()}_${Math.random()}`,
        fileName: file.name,
        folderId: folderId,
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

  // Read a FileSystemEntry recursively, returns { folders: [...], files: [...] }
  // parentFolderId: the app folder ID under which this entry lives
  // parentLevel: depth level
  const readEntryRecursive = (entry, parentFolderId, parentLevel, existingFolders) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          resolve({ newFolders: [], files: [{ file, folderId: parentFolderId }] });
        }, () => resolve({ newFolders: [], files: [] }));
      } else if (entry.isDirectory) {
        // Create a folder entry for this directory
        const folderId = parentFolderId === 'root'
          ? `drop_${Date.now()}_${Math.random().toString(36).slice(2)}`
          : `${parentFolderId}.${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const folderEntry = {
          id: folderId,
          name: entry.name,
          level: parentLevel,
          expanded: true,
        };

        const reader = entry.createReader();
        const readAllEntries = (allEntries) => {
          reader.readEntries(async (batch) => {
            if (batch.length === 0) {
              // Process all child entries
              const childPromises = allEntries.map(child =>
                readEntryRecursive(child, folderId, parentLevel + 1, existingFolders)
              );
              const childResults = await Promise.all(childPromises);

              const newFolders = [folderEntry];
              const files = [];
              for (const result of childResults) {
                newFolders.push(...result.newFolders);
                files.push(...result.files);
              }
              resolve({ newFolders, files });
            } else {
              readAllEntries([...allEntries, ...batch]);
            }
          }, () => resolve({ newFolders: [folderEntry], files: [] }));
        };
        readAllEntries([]);
      } else {
        resolve({ newFolders: [], files: [] });
      }
    });
  };

  // Handle dropping folders (or files) onto the folder tree
  // dropTargetFolderId: the folder they dropped onto, or null for root
  const handleFolderDrop = async (dataTransferItems, dropTargetFolderId = null) => {
    const items = Array.from(dataTransferItems);
    const entries = items
      .map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)
      .filter(Boolean);

    if (entries.length === 0) return;

    const parentFolderId = dropTargetFolderId || 'root';
    const parentLevel = dropTargetFolderId
      ? (folders.find(f => f.id === dropTargetFolderId)?.level ?? 0) + 1
      : 0;

    const results = await Promise.all(
      entries.map(entry => readEntryRecursive(entry, parentFolderId, parentLevel, folders))
    );

    const newFolders = [];
    const newFiles = [];
    for (const result of results) {
      newFolders.push(...result.newFolders);
      newFiles.push(...result.files);
    }

    // Insert new folders into the right position in the folder list
    if (newFolders.length > 0) {
      let updatedFolders;
      if (dropTargetFolderId) {
        const targetIndex = folders.findIndex(f => f.id === dropTargetFolderId);
        let insertAt = targetIndex + 1;
        while (insertAt < folders.length && folders[insertAt].id.startsWith(dropTargetFolderId + '.')) {
          insertAt++;
        }
        updatedFolders = [
          ...folders.slice(0, insertAt),
          ...newFolders,
          ...folders.slice(insertAt),
        ];
        updatedFolders = updatedFolders.map(f =>
          f.id === dropTargetFolderId ? { ...f, expanded: true } : f
        );
      } else {
        updatedFolders = [...folders, ...newFolders];
      }
      setFoldersWithSave(updatedFolders);
    }

    // Only upload files that belong to an actual folder (not root)
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
  
  const removeDirectUpload = (fileId) => {
    setDirectUploadsWithSave(directUploads.filter(f => f.id !== fileId));
  };
  
  const removeAllDirectUploads = () => {
    if (window.confirm(`Ste prepričani, da želite odstraniti vse ${directUploads.length} naložene datoteke?`)) {
      setDirectUploadsWithSave([]);
    }
  };

  // Authentication
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setAuthError('Prosim vnesite geslo');
      return;
    }
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
    } catch (error) {
      setAuthError('Napaka pri preverjanju gesla');
      setAuthLoading(false);
    }
  };

  // Processing
  const startOCRProcessing = async () => {
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

  const startAIProcessing = async () => {
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
      (newResults) => {
        setFinalResultsWithSave(prev => [...prev, ...newResults]);
      }
    );

    setAiProcessing(false);
  };
  
  const moveToReviewPage = () => {
    setCurrentStepWithSave(5);
    setSkippedAIClassificationWithSave(true);
  };
  
  const startFileEdit = (fileId, fileData) => {
    setEditingFileId(fileId);
    setEditingFileData({ ...fileData });
  };
  
  const saveFileEdit = () => {
    if (!editingFileId || !editingFileData) return;
    setFinalResultsWithSave(prev => prev.map(f => f.id === editingFileId ? editingFileData : f));
    setDirectUploadsWithSave(prev => prev.map(f => f.id === editingFileId ? editingFileData : f));
    setEditingFileId(null);
    setEditingFileData(null);
  };
  
  const cancelFileEdit = () => {
    setEditingFileId(null);
    setEditingFileData(null);
  };
  
  const removeFileFromReview = (fileId) => {
    setFinalResultsWithSave(prev => prev.filter(f => f.id !== fileId));
    setDirectUploadsWithSave(prev => prev.filter(f => f.id !== fileId));
  };
  
  const openMetadataExtractionModal = () => setShowMetadataModal(true);
  
  const closeMetadataExtractionModal = () => {
    if (!isExtractingMetadata) setShowMetadataModal(false);
  };
  
  const extractMetadataForSelectedFiles = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;
    
    setIsExtractingMetadata(true);
    setMetadataProgress(0);
    
    try {
      const CHUNK_SIZE = 3;
      const totalChunks = Math.ceil(selectedFiles.length / CHUNK_SIZE);
      const allMetadata = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkOriginals = selectedFiles.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);

        await new Promise(resolve => setTimeout(resolve, 0));
        setMetadataProgress((chunkIndex / totalChunks) * 100);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
          const formData = new FormData();
          for (const upload of chunkOriginals) {
            const file = await import('./indexedDBHelper').then(m => m.getFileFromIndexedDB(upload.fileName));
            if (file) formData.append('files', file);
          }

          const response = await fetch(
            'https://document-organizer-backend-0aje.onrender.com/api/extract-metadata-batch',
            {
              method: 'POST',
              headers: { 'X-Password': password },
              body: formData,
            }
          );

          if (!response.ok) throw new Error('Batch failed');

          const data = await response.json();
          allMetadata.push(...data.results);
        } catch (err) {
          console.error(`Chunk ${chunkIndex + 1} failed:`, err);
          for (const f of chunkOriginals) {
            allMetadata.push({ fileName: f.fileName, documentTitle: '', issuer: '', documentNumber: '', date: '' });
          }
        }

        setMetadataProgress(((chunkIndex + 1) / totalChunks) * 100);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const metadataById = selectedFiles.reduce((acc, file, index) => {
        acc[file.id] = allMetadata[index] || {};
        return acc;
      }, {});

      const applyMetadata = (file) => {
        const extracted = metadataById[file.id];
        if (!extracted) return file;
        return {
          ...file,
          documentTitle: extracted.documentTitle || file.documentTitle,
          issuer: extracted.issuer || file.issuer,
          documentNumber: extracted.documentNumber || file.documentNumber,
          date: extracted.date || file.date,
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
  
  const generateDocumentCodes = async () => {
    setIsGeneratingCodes(true);
    
    try {
      const finalIds = new Set(finalResults.map(f => f.id).filter(Boolean));
      const finalNames = new Set(finalResults.map(f => f.fileName));
      const directOnlyFiles = directUploads.filter(f => {
        if (f.id && finalIds.has(f.id)) return false;
        return !finalNames.has(f.fileName);
      });
      const allFiles = [
        ...finalResults.map(f => ({ ...f, source: 'ai' })),
        ...directOnlyFiles.map(f => ({ ...f, source: 'direct' }))
      ];
      
      allFiles.sort((a, b) => {
        const folderA = a.source === 'ai' ? a.suggestedFolder.id : a.folderId;
        const folderB = b.source === 'ai' ? b.suggestedFolder.id : b.folderId;
        return folderA.localeCompare(folderB);
      });
      
      let globalSeq = 0;
      const finalizedFiles = allFiles.map(file => {
        globalSeq++;
        const fileNumber = globalSeq;
        const docCode = String(globalSeq).padStart(3, '0');

        if (file.source === 'ai') {
          return { ...file, fileNumber, docCode, id: file.id || `ai_${file.fileName}_${Date.now()}` };
        } else {
          return { ...file, fileNumber, docCode, isDirectUpload: true };
        }
      });

      const aiFiles = finalizedFiles.filter(f => f.source === 'ai').map(({ source, ...rest }) => rest);
      const directFiles = finalizedFiles.filter(f => f.source === 'direct').map(({ source, ...rest }) => rest);

      setFinalResultsWithSave(aiFiles);
      setDirectUploadsWithSave(prev => {
        const directFileIds = new Set(directFiles.map(f => f.id));
        return prev.map(file => {
          if (directFileIds.has(file.id)) return directFiles.find(f => f.id === file.id);
          return file;
        });
      });
      setFolderCountsWithSave({});
    } catch (error) {
      console.error('Code generation error:', error);
      alert('Napaka pri generiranju kod dokumentov');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const hasRequiredMetadata = (file) => Boolean(
    file.documentTitle && file.issuer && file.documentNumber && file.date
  );

  const finalizeDocuments = () => {
    const allReviewFiles = [...finalResults, ...directUploads];
    
    if (allReviewFiles.length === 0) {
      alert('Najprej generirajte šifre dokumentov.');
      return;
    }

    const hasMissingCodes = allReviewFiles.some(file => !file.docCode);
    if (hasMissingCodes) {
      alert('Vsi dokumenti morajo imeti generirano šifro pred finalizacijo.');
      return;
    }

    const newFileNames = allReviewFiles.map(r => r.fileName);
    const uniqueNewFiles = newFileNames.filter(name => !processedFiles.includes(name));

    setProcessedFilesWithSave(prev => [...prev, ...uniqueNewFiles]);
    setProcessedFilesCountWithSave(processedFilesCount + uniqueNewFiles.length);
    setIsFinalizedWithSave(true);
  };
  
  const exportFolderStructure = () => {
    const data = JSON.stringify(folders, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folder-structure-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const importFolderStructure = (structure) => {
    if (!Array.isArray(structure)) {
      alert('Neveljavna struktura: mora biti seznam map');
      return;
    }
    const isValid = structure.every(folder => 
      folder.id && folder.name && typeof folder.level === 'number' && typeof folder.expanded === 'boolean'
    );
    if (!isValid) {
      alert('Neveljavna struktura: manjkajo obvezna polja');
      return;
    }
    setFoldersWithSave(structure);
  };

  const handleDownloadMergedPDF = async (addWatermark) => {
    setIsDownloading(true);
    try {
      const { downloadMergedPDF } = await import('./clientDownloads');
      const allFiles = [...finalResults, ...directUploads];
      const result = await downloadMergedPDF(allFiles, folders, addWatermark);
      return result;
    } catch (error) {
      console.error('Merged PDF failed:', error);
      return { success: false, totalPages: 0, skippedDocx: [], skippedOther: [], skippedMissing: [] };
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const { downloadZipClientSide } = await import('./clientDownloads');
      const allFiles = [...finalResults, ...directUploads];
      await downloadZipClientSide(allFiles, folders);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Prenos ZIP datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const { downloadExcelClientSide } = await import('./clientDownloads');
      const allFiles = [...finalResults, ...directUploads];
      await downloadExcelClientSide(allFiles, folders);
    } catch (error) {
      console.error('Excel download failed:', error);
      alert(`Prenos Excel datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setOcrResults([]);
    setAiLogs([]);
    setOcrProgress(0);
    setAiProgress(0);
    setCurrentStepWithSave(1);
    setIsMetadataExtractedWithSave(false);
    setIsFinalizedWithSave(false);
    setSkippedAIClassificationWithSave(false);
    localStorage.removeItem('ocrResults');
    localStorage.removeItem('currentStep');
    localStorage.removeItem('isMetadataExtracted');
    localStorage.removeItem('isFinalized');
    localStorage.removeItem('skippedAIClassification');
  };

  const hardReset = async () => {
    setFiles([]);
    setOcrResults([]);
    setFinalResults([]);
    setDirectUploads([]);
    setAiLogs([]);
    setOcrProgress(0);
    setAiProgress(0);
    setCurrentStep(1);
    setProcessedFilesCount(0);
    setFolderCounts({});
    setFoldersWithSave(defaultStructure);
    setProcessedFiles([]);
    setIsMetadataExtracted(false);
    setIsFinalized(false);
    setSkippedAIClassification(false);
    localStorage.clear();
    const { clearAllFiles } = await import('./indexedDBHelper');
    await clearAllFiles();
  };

  return {
    // State
    folders,
    files,
    currentStep,
    editingId,
    editingName,
    ocrProgress,
    ocrProcessing,
    ocrResults,
    aiProgress,
    aiProcessing,
    aiLogs,
    finalResults,
    isDownloading,
    isDownloadingExcel,
    password,
    isAuthenticated,
    authError,
    viewingOcrText,
    processedFilesCount,
    folderCounts,
    processedFiles,
    directUploads,
    editingFileId,
    editingFileData,
    authLoading,
    isMetadataExtracted,
    isFinalized,
    isExtractingMetadata,
    isGeneratingCodes,
    metadataProgress,
    showMetadataModal,
    skippedAIClassification,
    
    // Setters
    setEditingName,
    setPassword,
    setCurrentStep: setCurrentStepWithSave,
    setViewingOcrText,
    setEditingFileData,
    
    // Handlers
    toggleFolder,
    addFolder,
    deleteFolder,
    deleteAllFolders,
    moveFolderUp,
    moveFolderDown,
    startEdit,
    saveEdit,
    handleFileUpload,
    removeFile,
    removeAllFiles,
    handlePasswordSubmit,
    startOCRProcessing,
    startAIProcessing,
    handleDownloadMergedPDF,
    handleDownloadZip,
    handleDownloadExcel,
    resetAll,
    hardReset,
    handleDirectUploadToFolder,
    handleFolderDrop,
    removeDirectUpload,
    removeAllDirectUploads,
    moveToReviewPage,
    startFileEdit,
    saveFileEdit,
    cancelFileEdit,
    removeFileFromReview,
    openMetadataExtractionModal,
    closeMetadataExtractionModal,
    extractMetadataForSelectedFiles,
    generateDocumentCodes,
    finalizeDocuments,
    exportFolderStructure,
    importFolderStructure,
  };
};