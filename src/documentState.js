import { useState } from 'react';
import { defaultStructure } from './documentUtils';
import { useFolderState } from './useFolderState';
import { useFileProcessing } from './useFileProcessing';
import { downloadZipClientSide, downloadMergedPDF, downloadExcelClientSide } from './clientDownloads';

export const useDocumentState = () => {
  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const folderState = useFolderState();
  const fileProcessing = useFileProcessing();

  // ── Shared persisted state ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('currentStep');
    return saved ? parseInt(saved) : 1;
  });

  const [directUploads, setDirectUploads] = useState(() => {
    const saved = localStorage.getItem('directUploads');
    return saved ? JSON.parse(saved) : [];
  });

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
  const [viewingOcrText, setViewingOcrText] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileData, setEditingFileData] = useState(null);
  const [isMetadataExtracted, setIsMetadataExtracted] = useState(() => {
    const saved = localStorage.getItem('isMetadataExtracted');
    return saved ? JSON.parse(saved) : false;
  });
  const [isFinalized, setIsFinalized] = useState(() => {
    const saved = localStorage.getItem('isFinalized');
    return saved ? JSON.parse(saved) : false;
  });
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [skippedAIClassification, setSkippedAIClassification] = useState(() => {
    const saved = localStorage.getItem('skippedAIClassification');
    return saved ? JSON.parse(saved) : false;
  });
  // 'sequential' | 'hierarchical' | null — remembered so returning to step 5 with new
  // files can re-number them without asking again.
  const [codeMethod, setCodeMethod] = useState(() => localStorage.getItem('codeMethod') || null);

  // ── localStorage wrappers ──────────────────────────────────────────────────

  const setCurrentStepWithSave = (step) => {
    setCurrentStep(step);
    localStorage.setItem('currentStep', step.toString());
  };

  const setCodeMethodWithSave = (method) => {
    setCodeMethod(method);
    if (method) localStorage.setItem('codeMethod', method);
    else localStorage.removeItem('codeMethod');
  };

  const setFinalResultsWithSave = (results) => {
    const updated = typeof results === 'function' ? results(finalResults) : results;
    setFinalResults(updated);
    localStorage.setItem('finalResults', JSON.stringify(updated));
  };

  const setDirectUploadsWithSave = (uploads) => {
    const updated = typeof uploads === 'function' ? uploads(directUploads) : uploads;
    setDirectUploads(updated);
    localStorage.setItem('directUploads', JSON.stringify(updated));
  };

  const setProcessedFilesWithSave = (files) => {
    const updated = typeof files === 'function' ? files(processedFiles) : files;
    setProcessedFiles(updated);
    localStorage.setItem('processedFiles', JSON.stringify(updated));
  };

  const setProcessedFilesCountWithSave = (count) => {
    const updated = typeof count === 'function' ? count(processedFilesCount) : count;
    setProcessedFilesCount(updated);
    localStorage.setItem('processedFilesCount', updated.toString());
  };

  const setFolderCountsWithSave = (counts) => {
    const updated = typeof counts === 'function' ? counts(folderCounts) : counts;
    setFolderCounts(updated);
    localStorage.setItem('folderCounts', JSON.stringify(updated));
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

  // ── Folder operations (delegates, injecting directUploads deps) ────────────

  const deleteFolder = (id) =>
    folderState.deleteFolder(id, directUploads, setDirectUploadsWithSave);

  const deleteAllFolders = () =>
    folderState.deleteAllFolders(setDirectUploadsWithSave);

  // ── File operations (delegates, injecting shared state) ───────────────────

  const handleDirectUploadToFolder = (folderId, uploadedFiles) =>
    fileProcessing.handleDirectUploadToFolder(folderId, uploadedFiles, setDirectUploadsWithSave);

  const handleFolderDrop = (dataTransferItems, dropTargetFolderId) =>
    fileProcessing.handleFolderDrop(
      dataTransferItems,
      dropTargetFolderId,
      folderState.folders,
      folderState.setFoldersWithSave,
      setDirectUploadsWithSave
    );

  const startOCRProcessing = () =>
    fileProcessing.startOCRProcessing(setCurrentStepWithSave);

  const startAIProcessing = () =>
    fileProcessing.startAIProcessing(folderState.folders, setFinalResultsWithSave, setCurrentStepWithSave);

  const extractMetadataForSelectedFiles = (selectedFiles) =>
    fileProcessing.extractMetadataForSelectedFiles(
      selectedFiles,
      setDirectUploadsWithSave,
      setFinalResultsWithSave
    );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const moveToReviewPage = () => {
    setCurrentStepWithSave(5);
    setSkippedAIClassificationWithSave(true);
  };

  // ── File review editing ────────────────────────────────────────────────────

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

  const cancelFileEdit = () => { setEditingFileId(null); setEditingFileData(null); };

  const removeFileFromReview = (fileId) => {
    setFinalResultsWithSave(prev => prev.filter(f => f.id !== fileId));
    setDirectUploadsWithSave(prev => prev.filter(f => f.id !== fileId));
    if (isFinalized) setProcessedFilesCountWithSave(prev => Math.max(0, prev - 1));
  };

  const removeFilesFromReview = (fileIds) => {
    const ids = new Set(fileIds);
    if (ids.size === 0) return;
    setFinalResultsWithSave(prev => prev.filter(f => !ids.has(f.id)));
    setDirectUploadsWithSave(prev => prev.filter(f => !ids.has(f.id)));
    if (isFinalized) setProcessedFilesCountWithSave(prev => Math.max(0, prev - ids.size));
  };

  const removeDirectUpload = (fileId) =>
    setDirectUploadsWithSave(directUploads.filter(f => f.id !== fileId));

  const removeAllDirectUploads = () => {
    if (window.confirm(`Ste prepričani, da želite odstraniti vse ${directUploads.length} naložene datoteke?`)) {
      setDirectUploadsWithSave([]);
    }
  };

  // ── Code generation helpers ────────────────────────────────────────────────

  const buildSortedFileList = () => {
    const finalIds = new Set(finalResults.map(f => f.id).filter(Boolean));
    const finalNames = new Set(finalResults.map(f => f.fileName));
    const directOnlyFiles = directUploads.filter(f =>
      !(f.id && finalIds.has(f.id)) && !finalNames.has(f.fileName)
    );
    const allFiles = [
      ...finalResults.map(f => ({ ...f, source: 'ai' })),
      ...directOnlyFiles.map(f => ({ ...f, source: 'direct' })),
    ];
    const folderOrder = {};
    folderState.folders.forEach((f, idx) => { folderOrder[f.id] = idx; });
    allFiles.sort((a, b) => {
      const idA = a.source === 'ai' ? a.suggestedFolder.id : a.folderId;
      const idB = b.source === 'ai' ? b.suggestedFolder.id : b.folderId;
      return (folderOrder[idA] ?? 999999) - (folderOrder[idB] ?? 999999);
    });
    return allFiles;
  };

  const commitFinalizedFiles = (finalizedFiles) => {
    const aiFiles = finalizedFiles.filter(f => f.source === 'ai').map(({ source, ...rest }) => rest);
    const directFiles = finalizedFiles.filter(f => f.source === 'direct').map(({ source, ...rest }) => rest);
    setFinalResultsWithSave(aiFiles);
    setDirectUploadsWithSave(prev => {
      const directFileIds = new Set(directFiles.map(f => f.id));
      return prev.map(file => directFileIds.has(file.id) ? directFiles.find(f => f.id === file.id) : file);
    });
    setFolderCountsWithSave({});
  };

  // ── Method 1: simple global sequence 001, 002, 003 … ──────────────────────

  const generateDocumentCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      const allFiles = buildSortedFileList();
      let seq = 0;
      const finalizedFiles = allFiles.map(file => {
        seq++;
        const docCode = String(seq).padStart(3, '0');
        return file.source === 'ai'
          ? { ...file, fileNumber: seq, docCode, id: file.id || `ai_${file.fileName}_${Date.now()}` }
          : { ...file, fileNumber: seq, docCode, isDirectUpload: true };
      });
      commitFinalizedFiles(finalizedFiles);
      setCodeMethodWithSave('sequential');
      finalizeFileList(finalizedFiles);
    } catch (error) {
      console.error('Code generation error:', error);
      alert('Napaka pri generiranju kod dokumentov');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // ── Method 2: hierarchical code e.g. III.02.02.001 ────────────────────────
  //
  //  level-0  → Roman numeral from folder name  ("III")
  //  level-1+ → 2-digit padded numeric prefix   ("02")
  //  file     → 3-digit per-folder sequence      ("001", resets per folder)

  const generateDocumentCodesHierarchical = async () => {
    setIsGeneratingCodes(true);
    try {
      const allFiles = buildSortedFileList();
      const folders = folderState.folders;
      const folderSeq = {};
      const folderById = Object.fromEntries(folders.map(f => [f.id, f]));

      // 1-based sibling rank (fallback when folder name has no numeric prefix)
      const siblingIndex = {};
      folders.forEach(f => {
        const parentId = f.id.includes('.') ? f.id.split('.').slice(0, -1).join('.') : null;
        const allSibs = folders.filter(s =>
          parentId
            ? s.id.startsWith(parentId + '.') && !s.id.slice(parentId.length + 1).includes('.')
            : !s.id.includes('.')
        );
        siblingIndex[f.id] = allSibs.indexOf(f) + 1;
      });

      const getFolderSegment = (folder, level) => {
        if (level === 0) {
          const m = folder.name.match(/^([IVXLCDM]+)\./i);
          return m ? m[1].toUpperCase() : String(siblingIndex[folder.id] || 1);
        }
        const m = folder.name.match(/^(\d+)/);
        return m
          ? String(parseInt(m[1], 10)).padStart(2, '0')
          : String(siblingIndex[folder.id] || 1).padStart(2, '0');
      };

      const buildHierarchicalCode = (folderId) => {
        const parts = folderId.split('.');
        const segments = parts
          .map((_, idx) => {
            const folder = folderById[parts.slice(0, idx + 1).join('.')];
            return folder ? getFolderSegment(folder, idx) : '';
          })
          .filter(Boolean);
        folderSeq[folderId] = (folderSeq[folderId] || 0) + 1;
        return [...segments, String(folderSeq[folderId]).padStart(3, '0')].join('.');
      };

      let seq = 0;
      const finalizedFiles = allFiles.map(file => {
        seq++;
        const folderId = file.source === 'ai' ? file.suggestedFolder.id : file.folderId;
        const docCode = buildHierarchicalCode(folderId);
        return file.source === 'ai'
          ? { ...file, fileNumber: seq, docCode, id: file.id || `ai_${file.fileName}_${Date.now()}` }
          : { ...file, fileNumber: seq, docCode, isDirectUpload: true };
      });

      commitFinalizedFiles(finalizedFiles);
      setCodeMethodWithSave('hierarchical');
      finalizeFileList(finalizedFiles);
    } catch (error) {
      console.error('Code generation error (hierarchical):', error);
      alert('Napaka pri generiranju hierarhičnih kod dokumentov');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // ── Finalize ───────────────────────────────────────────────────────────────

  // Finalizing right after code generation can't read finalResults/directUploads —
  // React hasn't re-rendered yet — so it takes the freshly-coded list directly.
  const finalizeFileList = (allReviewFiles) => {
    if (allReviewFiles.length === 0) return;
    if (allReviewFiles.some(f => !f.docCode)) return;
    const newFileNames = allReviewFiles.map(r => r.fileName).filter(name => !processedFiles.includes(name));
    setProcessedFilesWithSave(prev => [...prev, ...newFileNames]);
    setProcessedFilesCountWithSave(processedFilesCount + newFileNames.length);
    setIsFinalizedWithSave(true);
  };

  // ── Translation ────────────────────────────────────────────────────────────

  // Documents the LLM detected as not being Slovenian. Only native-PDF ones can
  // actually be translated; scans are listed but not selectable.
  const foreignLanguageDocs = [...finalResults, ...directUploads].filter(
    f => f.language && f.language !== 'sl' && !f.translatedFileName
  );

  const translateDocuments = (documents) =>
    fileProcessing.translateDocuments(documents, setDirectUploadsWithSave, setFinalResultsWithSave);

  // Re-runs the previously chosen numbering method, so files added after the first
  // pass get codes too, without re-prompting.
  const regenerateCodes = () => {
    if (codeMethod === 'hierarchical') return generateDocumentCodesHierarchical();
    if (codeMethod === 'sequential') return generateDocumentCodes();
  };

  const hasUncodedFiles = [...finalResults, ...directUploads].some(f => !f.docCode);

  const finalizeDocuments = () => {
    const allReviewFiles = [...finalResults, ...directUploads];
    if (allReviewFiles.length === 0) {
      alert('Najprej generirajte šifre dokumentov.');
      return;
    }
    if (allReviewFiles.some(f => !f.docCode)) {
      alert('Vsi dokumenti morajo imeti generirano šifro pred finalizacijo.');
      return;
    }
    finalizeFileList(allReviewFiles);
  };

  // ── Downloads ──────────────────────────────────────────────────────────────

  const handleDownloadMergedPDF = async (addWatermark) => {
    setIsDownloading(true);
    try {
      return await downloadMergedPDF([...finalResults, ...directUploads], folderState.folders, addWatermark);
    } catch (error) {
      console.error('Merged PDF failed:', error);
      return { success: false, totalPages: 0, skippedDocx: [], skippedOther: [], skippedMissing: [], skippedEncrypted: [] };
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadZip = async (namingMode = 'original') => {
    setIsDownloading(true);
    try {
      await downloadZipClientSide([...finalResults, ...directUploads], folderState.folders, namingMode);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Prenos ZIP datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadExcel = async (titleMode = 'combined', stripPrefix = false) => {
    setIsDownloadingExcel(true);
    try {
      await downloadExcelClientSide([...finalResults, ...directUploads], folderState.folders, titleMode, stripPrefix);
    } catch (error) {
      console.error('Excel download failed:', error);
      alert(`Prenos Excel datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  // Soft reset — start a new batch while keeping the download banner visible
  const resetAll = () => {
    fileProcessing.setOcrResultsWithSave([]);
    setCurrentStepWithSave(1);
    setIsMetadataExtractedWithSave(false);
    setSkippedAIClassificationWithSave(false);
    localStorage.removeItem('ocrResults');
    localStorage.removeItem('currentStep');
    localStorage.removeItem('isMetadataExtracted');
    localStorage.removeItem('skippedAIClassification');
  };

  // Hard reset — wipe everything including processed files and IndexedDB
  const hardReset = async () => {
    setCurrentStep(1);
    setDirectUploads([]);
    setFinalResults([]);
    setProcessedFilesCount(0);
    setFolderCounts({});
    setProcessedFiles([]);
    setIsMetadataExtracted(false);
    setIsFinalized(false);
    setSkippedAIClassification(false);
    setCodeMethod(null);
    localStorage.clear();
    folderState.setFoldersWithSave(defaultStructure);
    const { clearAllFiles } = await import('./indexedDBHelper');
    await clearAllFiles();
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Folder state
    folders: folderState.folders,
    editingId: folderState.editingId,
    editingName: folderState.editingName,
    setEditingName: folderState.setEditingName,
    toggleFolder: folderState.toggleFolder,
    addFolder: folderState.addFolder,
    deleteFolder,
    deleteAllFolders,
    moveFolderUp: folderState.moveFolderUp,
    moveFolderDown: folderState.moveFolderDown,
    sortFoldersByNumber: folderState.sortFoldersByNumber,
    startEdit: folderState.startEdit,
    saveEdit: folderState.saveEdit,
    exportFolderStructure: folderState.exportFolderStructure,
    importFolderStructure: folderState.importFolderStructure,

    // File processing state
    files: fileProcessing.files,
    ocrProgress: fileProcessing.ocrProgress,
    ocrProcessing: fileProcessing.ocrProcessing,
    ocrResults: fileProcessing.ocrResults,
    aiProgress: fileProcessing.aiProgress,
    aiProcessing: fileProcessing.aiProcessing,
    aiLogs: fileProcessing.aiLogs,
    password: fileProcessing.password,
    isAuthenticated: fileProcessing.isAuthenticated,
    authError: fileProcessing.authError,
    authLoading: fileProcessing.authLoading,
    handleLogout: fileProcessing.handleLogout,
    isExtractingMetadata: fileProcessing.isExtractingMetadata,
    metadataProgress: fileProcessing.metadataProgress,
    showMetadataModal: fileProcessing.showMetadataModal,
    setPassword: fileProcessing.setPassword,
    handleFileUpload: (e) => fileProcessing.handleFileUpload(e, processedFiles),
    removeFile: fileProcessing.removeFile,
    removeAllFiles: fileProcessing.removeAllFiles,
    handlePasswordSubmit: fileProcessing.handlePasswordSubmit,
    openMetadataExtractionModal: fileProcessing.openMetadataExtractionModal,
    closeMetadataExtractionModal: fileProcessing.closeMetadataExtractionModal,

    // Shared / orchestrated state
    currentStep,
    directUploads,
    finalResults,
    processedFilesCount,
    processedFiles,
    folderCounts,
    isDownloading,
    isDownloadingExcel,
    viewingOcrText,
    editingFileId,
    editingFileData,
    isMetadataExtracted,
    isFinalized,
    isGeneratingCodes,
    skippedAIClassification,

    // Setters
    setCurrentStep: setCurrentStepWithSave,
    setViewingOcrText,
    setEditingFileData,

    // Handlers
    handleDirectUploadToFolder,
    handleFolderDrop,
    removeDirectUpload,
    removeAllDirectUploads,
    startOCRProcessing,
    startAIProcessing,
    extractMetadataForSelectedFiles,
    moveToReviewPage,
    startFileEdit,
    saveFileEdit,
    cancelFileEdit,
    removeFileFromReview,
    removeFilesFromReview,
    generateDocumentCodes,
    generateDocumentCodesHierarchical,
    codeMethod,
    regenerateCodes,
    hasUncodedFiles,
    foreignLanguageDocs,
    isTranslating: fileProcessing.isTranslating,
    translationProgress: fileProcessing.translationProgress,
    showTranslationModal: fileProcessing.showTranslationModal,
    setShowTranslationModal: fileProcessing.setShowTranslationModal,
    translateDocuments,
    finalizeDocuments,
    handleDownloadMergedPDF,
    handleDownloadZip,
    handleDownloadExcel,
    resetAll,
    hardReset,
  };
};
