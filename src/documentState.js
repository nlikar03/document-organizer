import { useState } from 'react';
import { defaultStructure } from './documentUtils';
import { verifyPassword, processOCR, processAI} from './documentApi';
import { saveFileToIndexedDB} from './indexedDBHelper';

export const useDocumentState = () => {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('folders');
    return saved ? JSON.parse(saved) : defaultStructure;
  });
  
  const [files, setFiles] = useState([]);
  
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

  // Authentication
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setAuthError('Prosim vnesite geslo');
      return;
    }
    
    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Napačno geslo');
        setPassword('');
      }
    } catch (error) {
      setAuthError('Napaka pri preverjanju gesla');
    }
  };

  // Processing
  const startOCRProcessing = async () => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrResultsWithSave([]);
    setCurrentStepWithSave(3);

    const results = await processOCR(files, password, setOcrProgress, setOcrResultsWithSave);
    
    // Save files to IndexedDB
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

    // Pass current folder counts and processed files count to AI processing
    const results = await processAI(
      ocrResults, 
      folders, 
      password, 
      setAiProgress, 
      setAiLogs,
      (newResults) => {
        // Append to existing finalResults instead of replacing
        setFinalResultsWithSave(prev => [...prev, ...newResults]);
      },
      folderCounts // Pass existing folder counts
    );

    // Update folder counts after processing
    const newFolderCounts = { ...folderCounts };
    results.forEach(result => {
      const folderId = result.suggestedFolder.id;
      if (!newFolderCounts[folderId]) {
        newFolderCounts[folderId] = 0;
      }
      newFolderCounts[folderId]++;
    });
    setFolderCountsWithSave(newFolderCounts);

    // Append to processed files list
    setProcessedFilesWithSave(prev => [
      ...prev,
      ...results.map(r => r.fileName)
    ]);
    setProcessedFilesCountWithSave(processedFilesCount + results.length);

    setAiProcessing(false);
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
    
    localStorage.removeItem('ocrResults');
    localStorage.removeItem('currentStep');
  };

  const hardReset = async () => {
    setFiles([]);
    setOcrResults([]);
    setFinalResults([]);
    setAiLogs([]);
    setOcrProgress(0);
    setAiProgress(0);
    setCurrentStep(1);
    setProcessedFilesCount(0);
    setFolderCounts({});
    setFoldersWithSave(defaultStructure);
    setProcessedFiles([]);
    
    // Clear all localStorage AND IndexedDB
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
    
    // Setters
    setEditingName,
    setPassword,
    setCurrentStep: setCurrentStepWithSave,
    setViewingOcrText,
    
    // Handlers
    toggleFolder,
    addFolder,
    deleteFolder,
    startEdit,
    saveEdit,
    handleFileUpload,
    removeFile,
    handlePasswordSubmit,
    startOCRProcessing,
    startAIProcessing,
    handleDownloadZip,
    handleDownloadExcel,
    resetAll,
    hardReset,
  };
};