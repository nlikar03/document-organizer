import { useState } from 'react';
import { defaultStructure } from './documentUtils';
import { verifyPassword, processOCR, processAI, downloadZip, downloadExcel } from './documentApi';

export const useDocumentState = () => {
  const [folders, setFolders] = useState(defaultStructure);
  const [files, setFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);
  const [finalResults, setFinalResults] = useState([]);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [viewingOcrText, setViewingOcrText] = useState(null);

  // Folder management
  const toggleFolder = (id) => {
    setFolders(folders.map(f => {
      if (f.id === id) return { ...f, expanded: !f.expanded };
      if (f.id.startsWith(id + '.')) return { ...f, expanded: false };
      return f;
    }));
  };

  const addFolder = (parentId, level) => {
    const newId = parentId === 'root' ? Date.now().toString() : `${parentId}.${Date.now()}`;
    const newFolder = { id: newId, name: 'Nova Mapa', level: level, expanded: false };
    
    if (parentId === 'root') {
      setFolders([...folders, newFolder]);
    } else {
      const parentIndex = folders.findIndex(f => f.id === parentId);
      const newFolders = [...folders];
      let insertIndex = parentIndex + 1;
      while (insertIndex < newFolders.length && newFolders[insertIndex].id.startsWith(parentId + '.')) {
        insertIndex++;
      }
      newFolders.splice(insertIndex, 0, newFolder);
      setFolders(newFolders);
    }
    
    setEditingId(newId);
    setEditingName('Nova Mapa');
  };

  const deleteFolder = (id) => {
    setFolders(folders.filter(f => f.id !== id && !f.id.startsWith(id + '.')));
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id) => {
    setFolders(folders.map(f => f.id === id ? { ...f, name: editingName } : f));
    setEditingId(null);
    setEditingName('');
  };

  // File management
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    const allFiles = [...files, ...newFiles];
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (allFiles.length > 150) {
      alert('Maksimalno število datotek je 150 na enkrat.');
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
    setOcrResults([]);
    setCurrentStep(3);

    await processOCR(
      files, 
      password, 
      setOcrProgress, 
      setOcrResults
    );

    setOcrProcessing(false);
  };

  const startAIProcessing = async () => {
    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);
    setFinalResults([]);
    setCurrentStep(4);

    await processAI(
      ocrResults, 
      folders, 
      password, 
      setAiProgress, 
      setAiLogs, 
      setFinalResults
    );

    setAiProcessing(false);
  };

  // Downloads
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadZip(finalResults, folders, password);
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
      await downloadExcel(finalResults, folders, password);
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
    setFinalResults([]);
    setAiLogs([]);
    setOcrProgress(0);
    setAiProgress(0);
    setCurrentStep(1);
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
    
    // Setters
    setEditingName,
    setPassword,
    setCurrentStep,
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
  };
};