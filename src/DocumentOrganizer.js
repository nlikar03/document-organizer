import React from 'react';
import { Upload, FolderTree, FileText, CheckCircle, Plus, Trash2, ChevronRight, ChevronDown, Loader2, Edit2, Scan, Brain, Download } from 'lucide-react';
import { useDocumentState } from './documentState';
import { getFullPath, isChildVisible } from './documentUtils';

export default function DocumentOrganizer() {
  const {
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
    setEditingName,
    setPassword,
    setCurrentStep,
    setViewingOcrText,
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
    hardReset,
    processedFilesCount,
    resetAll,
  } = useDocumentState();

  const renderFolder = (folder) => {
    if (!isChildVisible(folder, folders)) return null;

    const hasChildren = folders.some(f => 
      f.id.startsWith(folder.id + '.') && f.id.split('.').length === folder.id.split('.').length + 1
    );

    return (
      <div key={folder.id} style={{ marginLeft: `${folder.level * 24}px` }} className="group">
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-indigo-50 rounded transition-colors">
          <button onClick={() => toggleFolder(folder.id)} className="p-1 hover:bg-indigo-100 rounded">
            {hasChildren ? (folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-4" />}
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            {editingId === folder.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => saveEdit(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit(folder.id)}
                className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <>
                <span className="text-indigo-600">📁</span>
                <span className="text-sm font-medium text-gray-700">{folder.name}</span>
              </>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button onClick={() => startEdit(folder.id, folder.name)} className="p-1 hover:bg-indigo-100 rounded" title="Uredi">
              <Edit2 size={14} className="text-gray-600" />
            </button>
            <button onClick={() => addFolder(folder.id, folder.level + 1)} className="p-1 hover:bg-indigo-100 rounded" title="Dodaj podmapo">
              <Plus size={14} className="text-green-600" />
            </button>
            <button onClick={() => deleteFolder(folder.id)} className="p-1 hover:bg-red-100 rounded" title="Izbriši">
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              Vstopi
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 relative">
          {currentStep < 4 && (
            <button
              onClick={hardReset}
              className="absolute top-6 right-6 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2 text-sm"
            >
              <Trash2 size={16} />
              Začni Znova
            </button>
          )}
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FolderTree className="text-indigo-600" size={40} />
            Organizator Dokumentov DZO
          </h1>
          <p className="text-gray-600 mb-8">AI klasifikacija dokumentov z OCR tehnologijo</p>

          {processedFilesCount > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-semibold">Skupno že procesiranih datotek:</p>
                  <p className="text-2xl font-bold text-blue-900">{processedFilesCount}</p>
                </div>
                <div className="text-blue-600">
                  <CheckCircle size={40} />
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b">
            {[
              { num: 1, label: 'Struktura Map' },
              { num: 2, label: 'Naloži Datoteke' },
              { num: 3, label: 'OCR Skeniranje' },
              { num: 4, label: 'AI Kategorizacija' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= step.num ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                    {step.num}
                  </div>
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                {idx < 3 && (
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
                <h2 className="text-2xl font-bold text-gray-800">Definiraj Strukturo Map</h2>
                <button
                  onClick={() => addFolder('root', 0)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Plus size={18} />
                  Nova Mapa
                </button>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 mb-6 max-h-[500px] overflow-y-auto">
                {folders.map((folder) => renderFolder(folder))}
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-lg"
              >
                Naprej na Nalaganje Datotek →
              </button>
            </div>
          )}

          {/* Step 2: File Upload */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Naloži Dokumente</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors mb-6">
                <Upload className="mx-auto text-gray-400 mb-4" size={64} />
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
                    Kliknite za nalaganje
                  </span>
                  <span className="text-gray-600 text-lg"> ali povlecite datoteke</span>
                </label>
                <p className="text-sm text-gray-500 mt-3">PDF, PNG, JPG, JPEG do 150MB</p>
              </div>
              {files.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Število datotek:</span>
                    <span className={`font-bold ${files.length > 150 ? 'text-red-600' : 'text-indigo-600'}`}>
                      {files.length} / 150
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
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Izbrane Datoteke ({files.length}):</h3>
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
              {viewingOcrText && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{viewingOcrText.fileName}</h3>
                      <button
                        onClick={() => setViewingOcrText(null)}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
                        {viewingOcrText.extractedText}
                      </pre>
                    </div>
                  </div>
                </div>
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
                      <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono font-bold">{result.docCode}</span>
                        <CheckCircle size={20} className="text-green-500" />
                      </div>
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
                        <p className="text-sm font-bold text-purple-700">{getFullPath(result.suggestedFolder.id, folders)}</p>
                        <p className="text-xs text-gray-500 mt-1">Številka datoteke: #{result.fileNumber}</p>
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

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">Povzetek Kategorizacije:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const summary = {};
                        finalResults.forEach(r => {
                          const folderPath = getFullPath(r.suggestedFolder.id, folders);
                          summary[folderPath] = (summary[folderPath] || 0) + 1;
                        });
                        return Object.entries(summary).map(([folder, count]) => (
                          <div key={folder} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <span className="text-indigo-600">📁</span>
                              {folder}
                            </span>
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadZip}
                    disabled={isDownloading}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-lg flex items-center justify-center gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Priprava ZIP datoteke...
                      </>
                    ) : (
                      <>
                        <Download size={24} />
                        Prenesi ZIP z Organiziranimi Dokumenti (Lahko traja 5min+)
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    disabled={isDownloadingExcel}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg flex items-center justify-center gap-2"
                  >
                    {isDownloadingExcel ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Priprava Excel datoteke...
                      </>
                    ) : (
                      <>
                        <FileText size={24} />
                        Prenesi Excel Seznam Dokumentov
                      </>
                    )}
                  </button>

                  <button
                    onClick={resetAll}
                    className="w-full bg-gray-600 text-white py-4 px-6 rounded-lg font-bold hover:bg-gray-700 transition-colors text-lg"
                  >
                    ⟳ Začni Znova
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Spletna stran za pomoč pri kategorizaciji DZO dokumentov</p>
        </div>
      </div>
    </div>
  );
}