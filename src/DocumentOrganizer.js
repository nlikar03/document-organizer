import React from 'react';
import { Upload, FolderTree, FileText, CheckCircle, Plus, Trash2, Loader2, Scan, Brain, Download, Eye, Save, FolderOpen } from 'lucide-react';
import { useDocumentState } from './documentState';
import { FolderTreeStep1, FolderTreeStep5, UploadModal } from './FolderTreeView';
import { FolderFilesModal, ProcessedFilesModal, ResetConfirmModal, DeleteAllModal, OcrTextViewModal, FileEditModal, MetadataExtractionModal } from './Modals';

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
    processedFiles,
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
    hardReset,
    resetAll,
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
    finalizeDocuments,
    exportFolderStructure,
    importFolderStructure,
  } = useDocumentState();

  // Modals
  const [showProcessedFiles, setShowProcessedFiles] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showDeleteAll, setShowDeleteAll] = React.useState(false);
  const [showFolderFiles, setShowFolderFiles] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState(null);
  
  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [uploadModalFolderId, setUploadModalFolderId] = React.useState(null);
  const [uploadingToFolder, setUploadingToFolder] = React.useState(false);

  const openUploadModal = (folderId) => {
    setUploadModalFolderId(folderId);
    setUploadModalOpen(true);
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


  //dragging
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e) => {
    e.preventDefault(); // This is crucial: it prevents the browser from opening the file
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); // Prevents browser opening the file
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // We "mimic" the event structure that your existing handleFileUpload expects
      handleFileUpload({ target: { files: droppedFiles } });
    }
  };

  // Handle import
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
    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  // Calculate total files for processed banner (only shows AFTER finalization)
  const totalFilesForBanner = isFinalized ? processedFilesCount : 0;

  // FIXED: Always combine finalResults and directUploads for metadata extraction
  const metadataExtractionFiles = (() => {
    const combined = new Map();
    
    // Add finalResults first (AI classified)
    finalResults.forEach(file => {
      const key = file.id || file.fileName;
      combined.set(key, file);
    });
    
    // Add directUploads (manual uploads) - only if not already in finalResults
    directUploads.forEach(file => {
      const key = file.id || file.fileName;
      if (!combined.has(key)) {
        combined.set(key, file);
      }
    });
    
    return Array.from(combined.values());
  })();

  // Authentication screen
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
            
            {authError && (
              <p className="text-red-600 text-sm mb-4">{authError}</p>
            )}
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold
                        hover:bg-indigo-700 transition-colors disabled:opacity-70"
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <img
              src={process.env.PUBLIC_URL + '/KOLEKTOR_LOGO.png'}
              className="h-10 w-auto"
              alt="Logo"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-xl p-8 relative">
          {/* Reset buttons */}
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

          {/* Processed files banner - only shown AFTER finalization */}
          {isFinalized && totalFilesForBanner > 0 && (
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <div 
                  className="flex-1 flex items-center gap-4 cursor-pointer group"
                  onClick={() => setShowProcessedFiles(true)}
                >
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      Uspešno procesirano
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-900 leading-none">
                        {totalFilesForBanner}
                      </span>
                      <span className="text-slate-600 font-semibold">dokumentov</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadZip(); }}
                    disabled={isDownloading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-blue-700 border-2 border-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 transition-all active:scale-95 shadow-sm"
                  >
                    {isDownloading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Download size={20} />
                    )}
                    <span>ZIP Arhiv</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadExcel(); }}
                    disabled={isDownloadingExcel}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-400 transition-all active:scale-95 shadow-md shadow-emerald-100"
                  >
                    {isDownloadingExcel ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                    <span>Excel Seznam</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Definiraj Strukturo Map</h2>
                  {directUploads.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {directUploads.length} dokumentov naloženih direktno v mape
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Import button */}
                  <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium cursor-pointer">
                    <FolderOpen size={18} />
                    Uvozi strukturo
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Export button */}
                  <button
                    onClick={exportFolderStructure}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Save size={18} />
                    Shrani strukturo
                  </button>
                  
                  {/* Add folder button */}
                  <button
                    onClick={() => addFolder('root', 0)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <Plus size={18} />
                    Nova Mapa
                  </button>
                </div>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 mb-6 max-h-[500px] overflow-y-auto">
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
                />
              </div>

              {/* Remove all direct uploads button */}
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
                <p className="text-sm text-gray-500 mt-3">PDF, PNG, JPG, JPEG do 150MB</p>
              </div>
              
              {files.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Število datotek:</span>
                    <span className={`font-bold ${files.length > 200 ? 'text-red-600' : 'text-indigo-600'}`}>
                      {files.length} / 200
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Skupna velikost:</span>
                    <span className={`font-bold ${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024) > 150 ? 'text-red-600' : 'text-indigo-600'}`}>
                      {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} / 150 MB
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
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Odstrani"
                        >
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
                        {result.issuer && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">Izdajatelj:</span>
                            <span className="text-sm text-gray-800">{result.issuer}</span>
                          </div>
                        )}
                        {result.date && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">Datum:</span>
                            <span className="text-sm text-gray-800">{result.date}</span>
                          </div>
                        )}
                        {result.documentNumber && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">Št. dokumenta:</span>
                            <span className="text-sm text-gray-800">{result.documentNumber}</span>
                          </div>
                        )}
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
                  <p className="text-sm text-gray-600 mt-1">
                    Preglejte in uredite dokumente pred finalizacijo
                  </p>
                </div>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 mb-6 max-h-[600px] overflow-y-auto">
                <FolderTreeStep5 
                  folders={folders}
                  finalResults={finalResults}
                  directUploads={directUploads}
                  toggleFolder={toggleFolder}
                  startFileEdit={startFileEdit}
                  removeFileFromReview={removeFileFromReview}
                />
              </div>

              {/* Bottom Button Row */}
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(skippedAIClassification ? 1 : 4)}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg font-bold hover:bg-gray-300 transition-colors text-lg"
                >
                  ← Nazaj
                </button>

                {/* Metadata Button */}
                <button
                  onClick={openMetadataExtractionModal}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Scan size={20} />
                  Izvleci metapodatke
                </button>

                {/* Generate Button */}
                <button
                  onClick={generateDocumentCodes}
                  disabled={isGeneratingCodes}
                  className="flex-1 bg-red-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  {isGeneratingCodes ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generiram...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Generiraj šifre
                    </>
                  )}
                </button>
                <button
                  onClick={finalizeDocuments}
                  disabled={!finalResults.length && !directUploads.length || isGeneratingCodes}
                  className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <CheckCircle size={20} />
                  Procesiraj
                </button>
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
          
          <ProcessedFilesModal 
            isOpen={showProcessedFiles}
            onClose={() => setShowProcessedFiles(false)}
            processedFiles={processedFiles}
          />

          <ResetConfirmModal 
            isOpen={showResetConfirm}
            onClose={() => setShowResetConfirm(false)}
            onConfirm={() => {
              resetAll();
              setShowResetConfirm(false);
            }}
          />

          <DeleteAllModal 
            isOpen={showDeleteAll}
            onClose={() => setShowDeleteAll(false)}
            onConfirm={() => {
              hardReset();
              setShowDeleteAll(false);
            }}
          />

          <UploadModal 
            isOpen={uploadModalOpen}
            folderId={uploadModalFolderId}
            folders={folders}
            uploading={uploadingToFolder}
            onClose={() => {
              setUploadModalOpen(false);
              setUploadModalFolderId(null);
            }}
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

          {/* Metadata Extraction Modal */}
          <MetadataExtractionModal
            isOpen={showMetadataModal}
            onClose={closeMetadataExtractionModal}
            directUploads={metadataExtractionFiles}
            isExtracting={isExtractingMetadata}
            progress={metadataProgress}
            onExtract={extractMetadataForSelectedFiles}
          />
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Spletna stran za pomoč pri kategorizaciji DZO dokumentov</p>
        </div>
        <span className="text-xs text-gray-500">v1.3</span>
      </div>
    </div>
  );
}