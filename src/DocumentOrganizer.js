import React from 'react';
import { Upload, FolderTree, FileText, CheckCircle, Plus, Trash2, Loader2, Scan, Brain, Download, Eye, Save, FolderOpen, FolderPlus, ArrowUpDown, List, Languages } from 'lucide-react';
import { useDocumentState } from './documentState';
import { FolderTreeStep1, FolderTreeStep5, UploadModal } from './FolderTreeView';
import DocumentListView from './DocumentListView';
import { TranslationModal } from './TranslationModal';
import { FolderFilesModal, ResetConfirmModal, DeleteAllModal, OcrTextViewModal, FileEditModal, MetadataExtractionModal, MergedPDFWatermarkModal, MergedPDFResultModal, MergedPDFLoadingModal } from './Modals';
import { defaultStructure } from './documentUtils';


export default function DocumentOrganizer() {
  const {
    folders,
    files,
    currentStep,
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
    directUploads,
    editingFileId,
    editingFileData,
    authLoading,
    isFinalized,
    isExtractingMetadata,
    isGeneratingCodes,
    metadataProgress,
    processedFilesCount,
    editingId,
    editingName,
    showMetadataModal,
    skippedAIClassification,
    setEditingName,
    setPassword,
    setCurrentStep,
    setViewingOcrText,
    setEditingFileData,
    toggleFolder,
    addFolder,
    deleteFolder,
    deleteAllFolders,
    moveFolderUp,
    moveFolderDown,
    sortFoldersByNumber,
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
    hardReset,
    resetAll,
    handleDirectUploadToFolder,
    handleFolderDrop,
    removeDirectUpload,
    removeAllDirectUploads,
    moveToReviewPage,
    startFileEdit,
    saveFileEdit,
    cancelFileEdit,
    removeFileFromReview,
    removeFilesFromReview,
    openMetadataExtractionModal,
    closeMetadataExtractionModal,
    extractMetadataForSelectedFiles,
    generateDocumentCodes,
    generateDocumentCodesHierarchical,
    codeMethod,
    regenerateCodes,
    hasUncodedFiles,
    foreignLanguageDocs,
    isTranslating,
    translationProgress,
    showTranslationModal,
    setShowTranslationModal,
    translateDocuments,
    previewTranslation,
    exportFolderStructure,
    importFolderStructure,
  } = useDocumentState();

  const [showProcessedFiles, setShowProcessedFiles] = React.useState(false);
  const [reviewViewMode, setReviewViewMode] = React.useState('tree'); // 'tree' | 'list'

  const hasReviewFiles = finalResults.length > 0 || directUploads.length > 0;

  // Entering step 5: ask for the numbering method the first time. On later visits the
  // method is remembered, so files added since just get numbered with it.
  React.useEffect(() => {
    if (currentStep !== 5 || !hasReviewFiles || isGeneratingCodes) return;
    if (!codeMethod) {
      setShowCodeMethodModal(true);
    } else if (hasUncodedFiles) {
      regenerateCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, hasReviewFiles, codeMethod, hasUncodedFiles]);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showDeleteAll, setShowDeleteAll] = React.useState(false);
  const [showDeleteAllFolders, setShowDeleteAllFolders] = React.useState(false);
  const [showFolderFiles, setShowFolderFiles] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState(null);
  
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [uploadModalFolderId, setUploadModalFolderId] = React.useState(null);
  const [uploadingToFolder, setUploadingToFolder] = React.useState(false);

  const [showPDFWatermarkModal, setShowPDFWatermarkModal] = React.useState(false);
  const [showPDFResultModal, setShowPDFResultModal] = React.useState(false);
  const [showPDFLoadingModal, setShowPDFLoadingModal] = React.useState(false);
  const [pdfMergeResult, setPdfMergeResult] = React.useState(null);

  // Root drop zone state
  const [isDraggingOverRoot, setIsDraggingOverRoot] = React.useState(false);
  const [isProcessingRootDrop, setIsProcessingRootDrop] = React.useState(false);

  // Code generation method picker
  const [showCodeMethodModal, setShowCodeMethodModal] = React.useState(false);
  const [showAITitles, setShowAITitles] = React.useState(false);

  // ZIP naming mode picker
  const [showZipNamingModal, setShowZipNamingModal] = React.useState(false);
  const [showExcelNamingModal, setShowExcelNamingModal] = React.useState(false);
  const [excelStripPrefix, setExcelStripPrefix] = React.useState(false);

  const openUploadModal = (folderId) => {
    setUploadModalFolderId(folderId);
    setUploadModalOpen(true);
  };

  const handlePDFWatermarkConfirm = async (addWatermark) => {
    setShowPDFWatermarkModal(false);
    setShowPDFLoadingModal(true);
    const result = await handleDownloadMergedPDF(addWatermark);
    setShowPDFLoadingModal(false);
    setPdfMergeResult(result);
    setShowPDFResultModal(true);
  };

  const handleUploadToFolder = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;
    setUploadingToFolder(true);
    await handleDirectUploadToFolder(uploadModalFolderId, uploadedFiles);
    setUploadingToFolder(false);
    setUploadModalOpen(false);
    setUploadModalFolderId(null);
  };
  
  const openFolderFiles = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    setSelectedFolder(folder);
    setShowFolderFiles(true);
  };

  // Root-level drop zone handlers
  const handleRootDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverRoot(true);
  };

  const handleRootDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the root zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingOverRoot(false);
    }
  };

  const handleRootDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverRoot(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setIsProcessingRootDrop(true);
    await handleFolderDrop(items, null); // null = root level
    setIsProcessingRootDrop(false);
  };

  // Step 2 file dragging
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    // dataTransfer.files lists a dropped folder as a zero-byte entry, so read the
    // item entries instead and separate folders from files.
    const entries = Array.from(e.dataTransfer.items)
      .map(item => item.webkitGetAsEntry?.())
      .filter(Boolean);

    const droppedFolders = entries.filter(entry => entry.isDirectory);
    const droppedFiles = (await Promise.all(
      entries
        .filter(entry => entry.isFile)
        .map(entry => new Promise(resolve => entry.file(resolve, () => resolve(null))))
    )).filter(Boolean);

    const isSupported = (file) => file.type.startsWith('image/') || /\.pdf$/i.test(file.name);
    const accepted = droppedFiles.filter(isSupported);
    const rejected = droppedFiles.filter(file => !isSupported(file));

    if (droppedFolders.length > 0 || rejected.length > 0) {
      const reasons = [];
      if (droppedFolders.length > 0) {
        reasons.push(`Mape niso podprte (${droppedFolders.map(f => f.name).join(', ')}).`);
      }
      if (rejected.length > 0) {
        reasons.push(`Nepodprti tipi datotek: ${rejected.map(f => f.name).join(', ')}.`);
      }
      reasons.push('Naložite lahko samo PDF, PNG, JPG in JPEG datoteke.');
      if (accepted.length > 0) {
        reasons.push(`Naloženih bo ${accepted.length} podprtih datotek.`);
      }
      alert(reasons.join('\n\n'));
    }

    if (accepted.length > 0) handleFileUpload({ target: { files: accepted } });
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const structure = JSON.parse(event.target.result);
        importFolderStructure(structure);
      } catch (error) {
        alert('Napaka pri nalaganju strukture: Neveljavna JSON datoteka');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalFilesForBanner = isFinalized ? (() => {
    const combined = new Map();
    finalResults.forEach(f => combined.set(f.id || f.fileName, f));
    directUploads.forEach(f => { const k = f.id || f.fileName; if (!combined.has(k)) combined.set(k, f); });
    return combined.size;
  })() : 0;

  const hasDownloads = isFinalized && totalFilesForBanner > 0;

  const metadataExtractionFiles = (() => {
    const combined = new Map();
    finalResults.forEach(file => combined.set(file.id || file.fileName, file));
    directUploads.forEach(file => {
      const key = file.id || file.fileName;
      if (!combined.has(key)) combined.set(key, file);
    });
    return Array.from(combined.values());
  })();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Dostop Zaščiten</h1>
          <p className="text-gray-600 mb-6 text-center">Vnesite geslo za dostop do sistema</p>
          
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vnesite geslo"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 mb-4"
            />
            {authError && <p className="text-red-600 text-sm mb-4">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              {authLoading ? 'Zaganjam aplikacijo…' : 'Vstopi'}
            </button>
            {authLoading && (
              <p className="text-gray-500 text-sm mt-4 text-center">
                Prvi zagon lahko traja do 2 minuti, ker se strežnik še zaganja
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <img
              src={process.env.PUBLIC_URL + '/KOLEKTOR_LOGO.png'}
              className="h-10 w-auto"
              alt="Logo"
            />
          </div>
        </div>

        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 bg-white rounded-lg shadow-xl p-8 relative">
          <div className="absolute top-6 right-6 flex gap-2">
            {processedFilesCount > 0 && (
              <button
                onClick={() => setShowDeleteAll(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} />
                Pobriši napredek
              </button>
            )}
            {processedFilesCount > 0 && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                ⟳ Začni od začetka
              </button>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FolderTree className="text-indigo-600" size={40} />
            Organizator Dokumentov DZO
          </h1>
          <p className="text-gray-600 mb-8">AI klasifikacija dokumentov z OCR</p>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b overflow-x-auto">
            {[
              { num: 1, label: 'Struktura Map' },
              { num: 2, label: 'Naloži Datoteke' },
              { num: 3, label: 'OCR Skeniranje' },
              { num: 4, label: 'AI Kategorizacija' },
              { num: 5, label: 'Pregled in Urejanje' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= step.num ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                    {step.num}
                  </div>
                  <span className="font-medium text-xs whitespace-nowrap">{step.label}</span>
                </div>
                {idx < 4 && (
                  <div className="flex-1 h-1 bg-gray-200 mx-2">
                    <div className={`h-full ${currentStep > step.num ? 'bg-indigo-600' : 'bg-gray-200'} transition-all`}></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Folder Structure */}
          {currentStep === 1 && (
            <div>
              <div className="mb-6">
                <div className="mb-3">
                  <h2 className="text-2xl font-bold text-gray-800">Definiraj Strukturo Map</h2>
                  {directUploads.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {directUploads.length} dokumentov naloženih direktno v mape
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Import / Export group */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors font-medium cursor-pointer whitespace-nowrap">
                      <FolderOpen size={15} />
                      Uvozi
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                    <button
                      onClick={exportFolderStructure}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                    >
                      <Save size={15} />
                      Shrani
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-gray-300" />

                  {/* Structure actions */}
                  <div className="flex items-center gap-1">
                    {folders.length > 0 && (
                      <button
                        onClick={sortFoldersByNumber}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                      >
                        <ArrowUpDown size={15} />
                        Razvrsti po številki
                      </button>
                    )}
                    <button
                      onClick={() => addFolder('root', 0)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
                    >
                      <Plus size={15} />
                      Nova Mapa
                    </button>
                  </div>

                  {/* Danger zone */}
                  {folders.length > 0 && (
                    <>
                      <div className="h-8 w-px bg-gray-300" />
                      <button
                        onClick={() => setShowDeleteAllFolders(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors font-medium whitespace-nowrap"
                      >
                        <Trash2 size={15} />
                        Izbriši vse mape
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Folder tree with root-level drop zone */}
              <div
                className={`border-2 rounded-lg p-4 bg-gray-50 mb-6 max-h-[500px] overflow-y-auto transition-all ${
                  isDraggingOverRoot
                    ? 'border-indigo-400 border-dashed bg-indigo-50'
                    : 'border-gray-200'
                }`}
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
              >
                {isProcessingRootDrop && (
                  <div className="flex items-center gap-2 text-indigo-600 text-sm mb-3 px-2">
                    <Loader2 className="animate-spin" size={16} />
                    Uvažam strukturo map...
                  </div>
                )}

                {isDraggingOverRoot && (
                  <div className="flex flex-col items-center justify-center py-8 text-indigo-500 pointer-events-none">
                    <FolderPlus size={40} className="mb-2 opacity-60" />
                    <p className="font-semibold">Spusti mape ali datoteke sem</p>
                    <p className="text-sm text-indigo-400 mt-1">Struktura map bo samodejno ustvarjena</p>
                  </div>
                )}

                {!isDraggingOverRoot && (
                  <FolderTreeStep1 
                    folders={folders}
                    directUploads={directUploads}
                    editingId={editingId}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    toggleFolder={toggleFolder}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    addFolder={addFolder}
                    deleteFolder={deleteFolder}
                    moveFolderUp={moveFolderUp}
                    moveFolderDown={moveFolderDown}
                    openUploadModal={openUploadModal}
                    openFolderFiles={openFolderFiles}
                    removeDirectUpload={removeDirectUpload}
                    handleDirectUploadToFolder={handleDirectUploadToFolder}
                    handleFolderDrop={handleFolderDrop}
                  />
                )}

                {/* Empty state hint */}
                {!isDraggingOverRoot && folders.length === 0 && !isProcessingRootDrop && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FolderPlus size={48} className="mb-3 opacity-40" />
                    <p className="font-medium">Ni map</p>
                    <p className="text-sm mt-1">Dodajte mapo ali povlecite mapo sem</p>
                    <button
                      onClick={() => importFolderStructure(defaultStructure)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      <FolderTree size={16} />
                      Vrni privzeto strukturo
                    </button>
                  </div>
                )}
              </div>

              {directUploads.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={removeAllDirectUploads}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <Trash2 size={18} />
                    Odstrani datoteke ({directUploads.length})
                  </button>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 bg-indigo-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-lg"
                >
                  Naprej na Nalaganje Datotek →
                </button>
                <button
                  onClick={moveToReviewPage}
                  disabled={directUploads.length === 0}
                  className="flex-1 bg-purple-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <Eye size={24} />
                  Preskoči AI Kategorizacijo
                </button>
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Naloži Dokumente za Auto-Klasifikacijo</h2>
              </div>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all mb-6 ${
                  isDragging 
                    ? 'border-indigo-600 bg-indigo-50 scale-[1.02]' 
                    : 'border-gray-300 hover:border-indigo-500 bg-transparent'
                }`}
              >
                <Upload className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} size={64} />
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-indigo-600 font-semibold hover:text-indigo-700 text-lg">
                    {isDragging ? 'Spustite datoteke tukaj' : 'Kliknite za nalaganje'}
                  </span>
                  {!isDragging && <span className="text-gray-600 text-lg"> ali povlecite datoteke</span>}
                </label>
                <p className="text-sm text-gray-500 mt-3">PDF, PNG, JPG, JPEG</p>
              </div>

              {files.length > 0 && (
                <div className="mt-4 mb-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Število datotek:</span>
                    <span className="font-bold text-indigo-600">{files.length}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Skupna velikost:</span>
                    <span className="font-bold text-indigo-600">
                      {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">Izbrane Datoteke ({files.length}):</h3>
                    <button
                      onClick={removeAllFiles}
                      className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <Trash2 size={14} />
                      Odstrani vse
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-lg">
                        <FileText size={24} className="text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => removeFile(idx)} className="p-1 hover:bg-red-100 rounded transition-colors">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg font-bold hover:bg-gray-300 transition-colors text-lg"
                >
                  ← Nazaj
                </button>
                <button
                  onClick={startOCRProcessing}
                  disabled={files.length === 0}
                  className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <Scan size={24} />
                  Začni OCR Skeniranje ({files.length})
                </button>
              </div>
            </div>
          )}

          {/* Step 3: OCR Processing */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Scan className="text-indigo-600" size={32} />
                OCR Skeniranje Dokumentov
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-blue-800">
                    {ocrProcessing ? 'Skeniranje v teku...' : 'Skeniranje zaključeno!'}
                  </span>
                  <span className="text-blue-700 font-bold">{Math.round(ocrProgress)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300 rounded-full" style={{ width: `${ocrProgress}%` }}></div>
                </div>
                {ocrProcessing && (
                  <div className="flex items-center gap-2 mt-3 text-blue-700">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Procesiranje {ocrResults.length} / {files.length} datotek</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                {ocrResults.map((result, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle size={20} className="text-green-500" />
                      <span className="font-semibold text-gray-800">{result.fileName}</span>
                      <button
                        onClick={() => setViewingOcrText(result)}
                        className="ml-auto text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition-colors font-medium"
                      >
                        Poglej celotno besedilo
                      </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Izvlečeno besedilo:</p>
                      <p className="text-sm text-gray-700 font-mono whitespace-pre-line line-clamp-3">{result.extractedText}</p>
                    </div>
                  </div>
                ))}
              </div>
              {!ocrProcessing && ocrResults.length > 0 && (
                <button
                  onClick={startAIProcessing}
                  className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-purple-700 transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <Brain size={24} />
                  Začni AI Kategorizacijo →
                </button>
              )}
            </div>
          )}

          {/* Step 4: AI Processing */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Brain className="text-purple-600" size={32} />
                AI Kategorizacija
              </h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-purple-800">
                    {aiProcessing ? 'AI analiza v teku...' : 'Kategorizacija zaključena!'}
                  </span>
                  <span className="text-purple-700 font-bold">{Math.round(aiProgress)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-4 overflow-hidden">
                  <div className="bg-purple-600 h-full transition-all duration-300 rounded-full" style={{ width: `${aiProgress}%` }}></div>
                </div>
              </div>
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 h-[200px] overflow-y-auto font-mono text-sm">
                {aiLogs.map((log, idx) => (
                  <div key={idx} className={`mb-1 ${log.success ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="text-gray-500">[{log.time}]</span> {log.message}
                  </div>
                ))}
                {aiProcessing && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Procesiranje...</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                {finalResults.map((result, idx) => (
                  <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">{result.fileName}</span>
                      <CheckCircle size={20} className="text-green-500" />
                    </div>
                    {(result.issuer || result.date || result.documentNumber) && (
                      <div className="mb-3 bg-blue-50 p-3 rounded-lg space-y-1">
                        {result.issuer && <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-600">Izdajatelj:</span><span className="text-sm text-gray-800">{result.issuer}</span></div>}
                        {result.date && <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-600">Datum:</span><span className="text-sm text-gray-800">{result.date}</span></div>}
                        {result.documentNumber && <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-600">Št. dokumenta:</span><span className="text-sm text-gray-800">{result.documentNumber}</span></div>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg">
                      <span className="text-purple-600 text-2xl">📁</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-semibold">Predlagana kategorija:</p>
                        <p className="text-sm font-bold text-purple-700">{result.suggestedFolder.fullPath}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!aiProcessing && finalResults.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Proces Zaključen!</h3>
                    <p className="text-green-700">Uspešno kategoriziranih {finalResults.length} dokumentov</p>
                  </div>
                  <button
                    onClick={moveToReviewPage}
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-lg flex items-center justify-center gap-2"
                  >
                    <Eye size={24} />
                    Pregled in Urejanje Dokumentov →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Edit */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Pregled in Urejanje Dokumentov</h2>
                  <p className="text-sm text-gray-600 mt-1">Preglejte in uredite dokumente pred finalizacijo</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex rounded-lg border-2 border-indigo-300 overflow-hidden">
                    <button
                      onClick={() => setReviewViewMode('tree')}
                      className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                        reviewViewMode === 'tree'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <FolderTree size={16} />
                      Mape
                    </button>
                    <button
                      onClick={() => setReviewViewMode('list')}
                      className={`px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                        reviewViewMode === 'list'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <List size={16} />
                      Seznam
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAITitles(v => !v)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors font-medium text-sm ${
                      showAITitles
                        ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700'
                        : 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100'
                    }`}
                  >
                    {showAITitles ? 'Prikaži originalna imena' : 'Prikaži AI naslove'}
                  </button>
                </div>
              </div>

              {foreignLanguageDocs.length > 0 && (
                <button
                  onClick={() => setShowTranslationModal(true)}
                  className="w-full mb-4 flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg hover:bg-amber-100 hover:border-amber-400 transition-colors text-left group"
                >
                  <div className="bg-amber-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Languages size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">
                      {foreignLanguageDocs.length === 1
                        ? '1 dokument je v tujem jeziku'
                        : `${foreignLanguageDocs.length} dokumentov je v tujem jeziku`}
                    </p>
                    <p className="text-sm text-amber-700">
                      Kliknite za pregled in prevod v slovenščino
                    </p>
                  </div>
                  <span className="text-amber-600 font-bold text-xl">→</span>
                </button>
              )}

              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 mb-6 max-h-[600px] overflow-y-auto">
                {reviewViewMode === 'tree' ? (
                  <FolderTreeStep5
                    folders={folders}
                    finalResults={finalResults}
                    directUploads={directUploads}
                    toggleFolder={toggleFolder}
                    startFileEdit={startFileEdit}
                    removeFileFromReview={removeFileFromReview}
                    showAITitles={showAITitles}
                    onPreviewTranslation={previewTranslation}
                  />
                ) : (
                  <DocumentListView
                    folders={folders}
                    finalResults={finalResults}
                    directUploads={directUploads}
                    removeFilesFromReview={removeFilesFromReview}
                    showAITitles={showAITitles}
                    onPreviewTranslation={previewTranslation}
                  />
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(skippedAIClassification ? 1 : 4)}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg font-bold hover:bg-gray-300 transition-colors text-lg"
                >
                  ← Nazaj
                </button>
                <button
                  onClick={openMetadataExtractionModal}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Scan size={20} />
                  Izvleci metapodatke
                </button>
                <button
                  onClick={() => setShowCodeMethodModal(true)}
                  disabled={isGeneratingCodes || !hasReviewFiles}
                  className="flex-1 bg-red-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  {isGeneratingCodes ? (
                    <><Loader2 className="animate-spin" size={20} />Generiram...</>
                  ) : (
                    <><CheckCircle size={20} />Izberi način šifriranja</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ZIP naming mode picker modal */}
          {showZipNamingModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Prenesi ZIP Arhiv</h3>
                <p className="text-sm text-gray-500 mb-5">Izberi kako naj bodo poimenovane datoteke:</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setShowZipNamingModal(false); handleDownloadZip('original'); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm transition-colors">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Originalno ime</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Zaporedna številka + originalno ime datoteke{' '}
                        <span className="font-mono text-gray-700">001_racun_podjetje.pdf</span>
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowZipNamingModal(false); handleDownloadZip('ai'); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center flex-shrink-0 font-bold text-purple-600 text-sm transition-colors">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">AI naslov dokumenta</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Zaporedna številka + AI določen naslov{' '}
                        <br />
                        <span className="font-mono text-gray-700">001_Račun za gradbena dela.pdf</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Datoteke brez AI naslova dobijo originalno ime
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setShowZipNamingModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Prekliči
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Excel naming mode picker modal */}
          {showExcelNamingModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Prenesi Excel Seznam</h3>
                <p className="text-sm text-gray-500 mb-5">Izberi kako naj bodo prikazani naslovi dokumentov:</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setShowExcelNamingModal(false); handleDownloadExcel('combined', excelStripPrefix); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 font-bold text-emerald-600 text-sm transition-colors">1</div>
                    <div>
                      <p className="font-semibold text-gray-800">AI naslov + originalno ime skupaj</p>
                      <p className="text-sm text-gray-500 mt-0.5">Oba v isti celici, vsak v svoji vrstici <span className="font-mono text-gray-700">(privzeto)</span></p>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowExcelNamingModal(false); handleDownloadExcel('split', excelStripPrefix); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 font-bold text-emerald-600 text-sm transition-colors">2</div>
                    <div>
                      <p className="font-semibold text-gray-800">AI naslov in originalno ime v ločenih stolpcih</p>
                      <p className="text-sm text-gray-500 mt-0.5">Vsak v svojem stolpcu za lažje filtriranje</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowExcelNamingModal(false); handleDownloadExcel('original', excelStripPrefix); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 font-bold text-emerald-600 text-sm transition-colors">3</div>
                    <div>
                      <p className="font-semibold text-gray-800">Samo originalno ime datoteke</p>
                      <p className="text-sm text-gray-500 mt-0.5">Brez AI naslova</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowExcelNamingModal(false); handleDownloadExcel('ai', excelStripPrefix); }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 font-bold text-emerald-600 text-sm transition-colors">4</div>
                    <div>
                      <p className="font-semibold text-gray-800">Samo AI naslov dokumenta</p>
                      <p className="text-sm text-gray-500 mt-0.5">Datoteke brez AI naslova dobijo originalno ime</p>
                    </div>
                  </button>
                </div>


<div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setShowExcelNamingModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Prekliči
                  </button>
                </div>
                <label className="mt-4 flex items-center gap-3 cursor-pointer select-none border-t pt-4">
                  <input
                    type="checkbox"
                    checked={excelStripPrefix}
                    onChange={e => setExcelStripPrefix(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">Odstrani zaporedno številko iz imena <span className="font-mono text-gray-500">001_, 002_, ...</span></span>
                </label>
              </div>
            </div>
          )}

          {/* Code generation method picker modal */}
          {showCodeMethodModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Generiraj šifre dokumentov</h3>
                <p className="text-sm text-gray-500 mb-5">Izberi metodo dodeljevanja šifer:</p>

                <div className="flex flex-col gap-3">
                  {/* Method 1 */}
                  <button
                    onClick={() => {
                      setShowCodeMethodModal(false);
                      generateDocumentCodes();
                    }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center flex-shrink-0 font-bold text-red-600 text-sm transition-colors">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Zaporedna šifra</p>
                      <p className="text-sm text-gray-500 mt-0.5">Zaporedje čez vse dokumente  <span className="font-mono text-gray-700">001, 002, 003</span></p>
                    </div>
                  </button>

                  {/* Method 2 */}
                  <button
                    onClick={() => {
                      setShowCodeMethodModal(false);
                      generateDocumentCodesHierarchical();
                    }}
                    className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center flex-shrink-0 font-bold text-indigo-600 text-sm transition-colors">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Hierarhična šifra</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Šifra odraža mesto v strukturi map {' '}
                        <span className="font-mono text-gray-700">III.02.02.001</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        npr. III → mapa III. INŠTALACIJE &nbsp;·&nbsp; 02 → 02 ELEKTRO &nbsp;·&nbsp; 02 → 02 SVETILKE &nbsp;·&nbsp; 001 → 1. datoteka v tej mapi
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setShowCodeMethodModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Prekliči
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
          <FolderFilesModal
            isOpen={showFolderFiles}
            onClose={() => setShowFolderFiles(false)}
            folder={selectedFolder}
            files={directUploads}
            folders={folders}
          />
          {showProcessedFiles && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                <div className="p-5 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Procesirani dokumenti</h3>
                  <button
                    onClick={() => setShowProcessedFiles(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-5 overflow-y-auto">
                  <DocumentListView
                    folders={folders}
                    finalResults={finalResults}
                    directUploads={directUploads}
                    removeFilesFromReview={removeFilesFromReview}
                    showAITitles={showAITitles}
                    onPreviewTranslation={previewTranslation}
                  />
                </div>
              </div>
            </div>
          )}
          <ResetConfirmModal 
            isOpen={showResetConfirm}
            onClose={() => setShowResetConfirm(false)}
            onConfirm={() => { resetAll(); setShowResetConfirm(false); }}
          />
          <DeleteAllModal 
            isOpen={showDeleteAll}
            onClose={() => setShowDeleteAll(false)}
            onConfirm={() => { hardReset(); setShowDeleteAll(false); }}
          />

          {/* Delete all folders confirmation */}
          {showDeleteAllFolders && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b">
                  <h3 className="text-xl font-bold text-gray-800">Izbriši vse mape?</h3>
                  <p className="text-gray-600 mt-2">
                    Izbrisanih bo <strong>{folders.length}</strong> map in vse datoteke znotraj njih ({directUploads.length} datotek). Tega dejanja ni mogoče razveljaviti.
                  </p>
                </div>
                <div className="p-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteAllFolders(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Prekliči
                  </button>
                  <button
                    onClick={() => { deleteAllFolders(); setShowDeleteAllFolders(false); }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                  >
                    Da, izbriši vse
                  </button>
                </div>
              </div>
            </div>
          )}

          <MergedPDFWatermarkModal
            isOpen={showPDFWatermarkModal}
            onConfirm={handlePDFWatermarkConfirm}
            onCancel={() => setShowPDFWatermarkModal(false)}
          />
          <MergedPDFLoadingModal isOpen={showPDFLoadingModal} />
          <MergedPDFResultModal
            isOpen={showPDFResultModal}
            result={pdfMergeResult}
            onClose={() => setShowPDFResultModal(false)}
          />

          <UploadModal 
            isOpen={uploadModalOpen}
            folderId={uploadModalFolderId}
            folders={folders}
            uploading={uploadingToFolder}
            onClose={() => { setUploadModalOpen(false); setUploadModalFolderId(null); }}
            onUpload={handleUploadToFolder}
          />
          <OcrTextViewModal 
            isOpen={!!viewingOcrText}
            onClose={() => setViewingOcrText(null)}
            ocrText={viewingOcrText}
          />
          <FileEditModal 
            isOpen={!!editingFileId}
            editingFileData={editingFileData}
            folders={folders}
            setEditingFileData={setEditingFileData}
            onCancel={cancelFileEdit}
            onSave={saveFileEdit}
          />
          <MetadataExtractionModal
            isOpen={showMetadataModal}
            onClose={closeMetadataExtractionModal}
            directUploads={metadataExtractionFiles}
            isExtracting={isExtractingMetadata}
            progress={metadataProgress}
            onExtract={extractMetadataForSelectedFiles}
          />
          <TranslationModal
            isOpen={showTranslationModal}
            onClose={() => setShowTranslationModal(false)}
            documents={foreignLanguageDocs}
            isTranslating={isTranslating}
            progress={translationProgress}
            onTranslate={translateDocuments}
          />
        </div>

        {/* Download sidebar — always present; greyed out until documents are processed */}
        <aside className="w-72 flex-shrink-0 sticky top-8">
          <div className={`bg-white rounded-2xl shadow-xl border overflow-hidden transition-opacity ${
            hasDownloads ? 'border-blue-100' : 'border-slate-200 opacity-60'
          }`}>
            <button
              onClick={() => setShowProcessedFiles(true)}
              disabled={!hasDownloads}
              className={`w-full flex items-center gap-3 p-5 text-left group border-b transition-colors ${
                hasDownloads
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-100 cursor-pointer'
                  : 'bg-slate-50 border-slate-200 cursor-not-allowed'
              }`}
            >
              <div className={`p-2.5 rounded-xl text-white shadow-lg transition-transform ${
                hasDownloads
                  ? 'bg-blue-600 shadow-blue-200 group-hover:scale-110'
                  : 'bg-slate-400 shadow-slate-200'
              }`}>
                <CheckCircle size={24} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
                  hasDownloads ? 'text-blue-500' : 'text-slate-400'
                }`}>
                  Dokumenti za prenos
                </p>
                {hasDownloads ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 leading-none">{totalFilesForBanner}</span>
                    <span className="text-slate-600 font-semibold text-sm">dokumentov</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 font-medium">Še ni dokumentov</span>
                )}
              </div>
            </button>

            <div className="flex flex-col gap-2.5 p-4">
              {hasDownloads && currentStep !== 5 && (
                <button
                  onClick={() => setCurrentStep(5)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md text-sm mb-1"
                >
                  <Eye size={18} />
                  <span>Pregled dokumentov</span>
                </button>
              )}
              <button
                onClick={() => setShowPDFWatermarkModal(true)}
                disabled={!hasDownloads || isDownloading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md text-sm"
              >
                {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                <span>Združen PDF</span>
              </button>
              <button
                onClick={() => setShowZipNamingModal(true)}
                disabled={!hasDownloads || isDownloading}
                className="w-full flex items-center justify-center gap-2 bg-white text-blue-700 border-2 border-blue-600 px-4 py-3 rounded-xl font-bold hover:bg-blue-50 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm text-sm"
              >
                {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                <span>ZIP Arhiv</span>
              </button>
              <button
                onClick={() => setShowExcelNamingModal(true)}
                disabled={!hasDownloads || isDownloadingExcel}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-emerald-100 text-sm"
              >
                {isDownloadingExcel ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                <span>Excel Seznam</span>
              </button>
            </div>
          </div>
        </aside>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Spletna stran za pomoč pri kategorizaciji DZO dokumentov</p>
        </div>
        <span className="text-xs text-gray-500">v1.4</span>
      </div>
    </div>
  );
}