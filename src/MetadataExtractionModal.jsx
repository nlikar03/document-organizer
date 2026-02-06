import React from 'react';
import { X, ArrowRight, Loader2, Scan, CheckCircle, FileText } from 'lucide-react';

export const MetadataExtractionModal = ({ 
  isOpen, 
  onClose, 
  directUploads,
  isExtracting,
  progress,
  onExtract
}) => {
  const [unselectedFiles, setUnselectedFiles] = React.useState([]);
  const [selectedFiles, setSelectedFiles] = React.useState([]);

  // Initialize files when modal opens
  React.useEffect(() => {
    if (isOpen) {
      // Files that don't have metadata yet
      const filesWithoutMetadata = directUploads.filter(file => 
        !file.documentTitle || !file.issuer || !file.documentNumber || !file.date
      );
      setUnselectedFiles(filesWithoutMetadata);
      setSelectedFiles([]);
    }
  }, [isOpen, directUploads]);

  const moveToSelected = (file) => {
    setUnselectedFiles(prev => prev.filter(f => f.id !== file.id));
    setSelectedFiles(prev => [...prev, file]);
  };

  const moveToUnselected = (file) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
    setUnselectedFiles(prev => [...prev, file]);
  };

  const moveAllToSelected = () => {
    setSelectedFiles([...selectedFiles, ...unselectedFiles]);
    setUnselectedFiles([]);
  };

  const handleExtract = () => {
    if (selectedFiles.length > 0) {
      onExtract(selectedFiles);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Izvleci metapodatke</h3>
            <p className="text-sm text-gray-600 mt-1">
              Izberi datoteke za izvlačenje metapodatkov (izdajatelj, datum, številka)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isExtracting}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress bar - shown when extracting */}
        {isExtracting && (
          <div className="px-6 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800">
                  Izvlačenje metapodatkov...
                </span>
                <span className="text-sm text-blue-700 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                <Loader2 className="animate-spin" size={12} />
                Obdelujem izbrane datoteke...
              </p>
            </div>
          </div>
        )}

        {/* Main content - Two columns */}
        <div className="flex-1 flex gap-4 p-6 overflow-hidden">
          {/* Left column - Unselected files */}
          <div className="flex-1 flex flex-col border-2 border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-700">
                Neizbrane datoteke ({unselectedFiles.length})
              </span>
              <button
                onClick={moveAllToSelected}
                disabled={unselectedFiles.length === 0 || isExtracting}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Izberi vse
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unselectedFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Ni datotek
                </div>
              ) : (
                unselectedFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => !isExtracting && moveToSelected(file)}
                    className={`flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors group ${
                      isExtracting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <FileText size={16} className="text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                    </div>
                    <ArrowRight 
                      size={16} 
                      className="text-gray-400 group-hover:text-indigo-600 flex-shrink-0" 
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column - Selected files */}
          <div className="flex-1 flex flex-col border-2 border-indigo-300 rounded-lg overflow-hidden bg-indigo-50">
            <div className="bg-indigo-100 p-3 border-b border-indigo-300">
              <span className="font-semibold text-indigo-900">
                Izbrane datoteke ({selectedFiles.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-indigo-400 text-sm">
                  <ArrowRight size={32} className="mb-2 opacity-30" />
                  Izberi datoteke za izvlečenje
                </div>
              ) : (
                selectedFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => !isExtracting && moveToUnselected(file)}
                    className={`flex items-center gap-2 p-3 bg-white border border-indigo-200 rounded-lg hover:border-indigo-400 transition-colors group ${
                      isExtracting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <CheckCircle size={16} className="text-indigo-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                    </div>
                    <X 
                      size={16} 
                      className="text-gray-400 group-hover:text-red-600 flex-shrink-0" 
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedFiles.length > 0 && (
              <span>
                Pripravljenih za pridobitev: <strong>{selectedFiles.length}</strong> {selectedFiles.length === 1 ? 'datoteka' : 'datotek'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isExtracting}
              className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prekliči
            </button>
            <button
              onClick={handleExtract}
              disabled={selectedFiles.length === 0 || isExtracting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Pridobivanje...
                </>
              ) : (
                <>
                  <Scan size={16} />
                  Izvleci metapodatke
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};