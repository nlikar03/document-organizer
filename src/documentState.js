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
  
  // Files uploaded directly to folders (skip OCR/AI classification)
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
  
  // New state for file editing on review page
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileData, setEditingFileData] = useState(null);

  const [authLoading, setAuthLoading] = useState(false);
  
  // Split finalization states
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
  
  // State for metadata extraction modal
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  
  // Track if user skipped AI classification
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
  };
  
  // FIXED: Improved folder movement logic
  const moveFolderUp = (id) => {
    const index = folders.findIndex(f => f.id === id);
    if (index <= 0) return;
    
    const folder = folders[index];
    const folderLevel = folder.level;
    
    // Find previous sibling (same level, same parent)
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
      // If we encounter a parent level folder, stop searching
      if (potentialSibling.level < folderLevel) {
        break;
      }
    }
    
    if (prevSiblingIndex === -1) return; // No sibling found
    
    // Get all descendants of current folder
    const folderAndDescendants = folders.filter(f => 
      f.id === id || f.id.startsWith(id + '.')
    );
    
    // Get all descendants of previous sibling
    const prevSibling = folders[prevSiblingIndex];
    const prevSiblingAndDescendants = folders.filter(f => 
      f.id === prevSibling.id || f.id.startsWith(prevSibling.id + '.')
    );
    
    // Remove both groups from array
    const withoutBoth = folders.filter(f => 
      !folderAndDescendants.includes(f) && !prevSiblingAndDescendants.includes(f)
    );
    
    // Insert current folder group before previous sibling group
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
    
    // Get all descendants of current folder
    const folderAndDescendants = folders.filter(f => 
      f.id === id || f.id.startsWith(id + '.')
    );
    const lastDescendantIndex = folders.findIndex(f => f.id === folderAndDescendants[folderAndDescendants.length - 1].id);
    
    // Find next sibling (same level, same parent)
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
      // If we encounter a parent level folder, stop searching
      if (potentialSibling.level < folderLevel) {
        break;
      }
    }
    
    if (nextSiblingIndex === -1) return; // No sibling found
    
    // Get all descendants of next sibling
    const nextSibling = folders[nextSiblingIndex];
    const nextSiblingAndDescendants = folders.filter(f => 
      f.id === nextSibling.id || f.id.startsWith(nextSibling.id + '.')
    );
    
    // Remove both groups from array
    const withoutBoth = folders.filter(f => 
      !folderAndDescendants.includes(f) && !nextSiblingAndDescendants.includes(f)
    );
    
    // Insert next sibling group before current folder group
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
  
  // NEW: Remove all files
  const removeAllFiles = () => {
    setFiles([]);
  };
  
  // Direct upload to folder (no metadata extraction here)
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
      });
    }
    
    setDirectUploadsWithSave([...directUploads, ...newUploads]);
  };
  
  // Remove direct upload file
  const removeDirectUpload = (fileId) => {
    setDirectUploadsWithSave(directUploads.filter(f => f.id !== fileId));
  };
  
  // NEW: Remove all direct uploads
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

    const results = await processAI(
      ocrResults, 
      folders, 
      password, 
      setAiProgress, 
      setAiLogs,
      (newResults) => {
        setFinalResultsWithSave(prev => [...prev, ...newResults]);
      },
      folderCounts
    );

    const newFolderCounts = { ...folderCounts };
    results.forEach(result => {
      const folderId = result.suggestedFolder.id;
      if (!newFolderCounts[folderId]) {
        newFolderCounts[folderId] = 0;
      }
      newFolderCounts[folderId]++;
    });
    setFolderCountsWithSave(newFolderCounts);

    setAiProcessing(false);
  };
  
  const moveToReviewPage = () => {
    setCurrentStepWithSave(5);
    setSkippedAIClassificationWithSave(true);
  };
  
  // File editing functions for review page
  const startFileEdit = (fileId, fileData) => {
    setEditingFileId(fileId);
    setEditingFileData({ ...fileData });
  };
  
  const saveFileEdit = () => {
    if (!editingFileId || !editingFileData) return;
    
    setFinalResultsWithSave(prev => 
      prev.map(f => f.id === editingFileId ? editingFileData : f)
    );
    
    setDirectUploadsWithSave(prev =>
      prev.map(f => f.id === editingFileId ? editingFileData : f)
    );
    
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
  
  // Open metadata extraction modal
  const openMetadataExtractionModal = () => {
    setShowMetadataModal(true);
  };
  
  // Close metadata extraction modal
  const closeMetadataExtractionModal = () => {
    if (!isExtractingMetadata) {
      setShowMetadataModal(false);
    }
  };
  
  // Extract metadata for selected files from modal
  const extractMetadataForSelectedFiles = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;
    
    setIsExtractingMetadata(true);
    setMetadataProgress(0);
    
    try {
      const filesToExtract = await Promise.all(
        selectedFiles.map(async (upload) => ({
          file: await import('./indexedDBHelper').then(m => m.getFileFromIndexedDB(upload.fileName)),
          fileName: upload.fileName
        }))
      );
      
      const metadata = await extractMetadataBatch(
        filesToExtract, 
        password, 
        (progress) => setMetadataProgress(progress)
      );
      
      // Update only the selected files
      const updatedDirectUploads = directUploads.map((upload) => {
        const selectedIndex = selectedFiles.findIndex(sf => sf.id === upload.id);
        if (selectedIndex !== -1) {
          return {
            ...upload,
            documentTitle: metadata[selectedIndex]?.documentTitle || upload.documentTitle,
            issuer: metadata[selectedIndex]?.issuer || upload.issuer,
            documentNumber: metadata[selectedIndex]?.documentNumber || upload.documentNumber,
            date: metadata[selectedIndex]?.date || upload.date,
          };
        }
        return upload;
      });
      
      setDirectUploadsWithSave(updatedDirectUploads);
      setShowMetadataModal(false);
    } catch (error) {
      console.error('Metadata extraction error:', error);
      alert('Napaka pri izvlačenju metapodatkov');
    } finally {
      setIsExtractingMetadata(false);
    }
  };
  
  // Generate document codes
  const generateDocumentCodes = async () => {
    setIsGeneratingCodes(true);
    
    try {
      // Combine all files
      const allFiles = [
        ...finalResults.map(f => ({ ...f, source: 'ai' })),
        ...directUploads.map(f => ({ ...f, source: 'direct' }))
      ];
      
      // Sort by folder ID
      allFiles.sort((a, b) => {
        const folderA = a.source === 'ai' ? a.suggestedFolder.id : a.folderId;
        const folderB = b.source === 'ai' ? b.suggestedFolder.id : b.folderId;
        return folderA.localeCompare(folderB);
      });
      
      // Calculate file numbers per folder
      const tempFolderCounts = {};
      const finalizedFiles = allFiles.map(file => {
        const folderId = file.source === 'ai' ? file.suggestedFolder.id : file.folderId;
        
        if (!tempFolderCounts[folderId]) {
          tempFolderCounts[folderId] = 0;
        }
        tempFolderCounts[folderId]++;
        
        const fileNumber = tempFolderCounts[folderId];
        const docCode = generateDocCode(folderId, folders) + '.' + String(fileNumber).padStart(3, '0');
        
        if (file.source === 'ai') {
          return {
            ...file,
            fileNumber,
            docCode,
            id: file.id || `ai_${file.fileName}_${Date.now()}`
          };
        } else {
          return {
            ...file,
            fileNumber,
            docCode,
            suggestedFolder: {
              id: folderId,
              name: folders.find(f => f.id === folderId)?.name || 'Unknown',
              fullPath: getFullPath(folderId, folders)
            }
          };
        }
      });
      
      setFinalResultsWithSave(finalizedFiles);
      setFolderCountsWithSave(tempFolderCounts);
      setDirectUploadsWithSave([]);
      
      // Only add files that aren't already in processedFiles
      const newFileNames = finalizedFiles.map(r => r.fileName);
      const uniqueNewFiles = newFileNames.filter(name => !processedFiles.includes(name));
      
      setProcessedFilesWithSave(prev => [...prev, ...uniqueNewFiles]);
      setProcessedFilesCountWithSave(processedFilesCount + uniqueNewFiles.length);
      
      setIsFinalizedWithSave(true);
    } catch (error) {
      console.error('Code generation error:', error);
      alert('Napaka pri generiranju kod dokumentov');
    } finally {
      setIsGeneratingCodes(false);
    }
  };
  
  // NEW: Export folder structure
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
  
  // NEW: Import folder structure
  const importFolderStructure = (structure) => {
    if (!Array.isArray(structure)) {
      alert('Neveljavna struktura: mora biti seznam map');
      return;
    }
    
    // Validate structure
    const isValid = structure.every(folder => 
      folder.id && 
      folder.name && 
      typeof folder.level === 'number' &&
      typeof folder.expanded === 'boolean'
    );
    
    if (!isValid) {
      alert('Neveljavna struktura: manjkajo obvezna polja');
      return;
    }
    
    setFoldersWithSave(structure);
  };

  // Downloads
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const { downloadZipClientSide } = await import('./clientDownloads');
      await downloadZipClientSide(finalResults, folders);
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
      await downloadExcelClientSide(finalResults, folders);
    } catch (error) {
      console.error('Excel download failed:', error);
      alert(`Prenos Excel datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Reset functions
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
    handleDownloadZip,
    handleDownloadExcel,
    resetAll,
    hardReset,
    handleDirectUploadToFolder,
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
    exportFolderStructure,
    importFolderStructure,
  };
};