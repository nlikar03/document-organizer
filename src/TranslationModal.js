import React, { useState, useEffect } from 'react';
import { Languages, Loader2, AlertTriangle, FileText } from 'lucide-react';

const LANGUAGE_NAMES = {
  hr: 'hrvaščina',
  en: 'angleščina',
  de: 'nemščina',
  it: 'italijanščina',
  sr: 'srbščina',
  bs: 'bosanščina',
  fr: 'francoščina',
  es: 'španščina',
  hu: 'madžarščina',
  cs: 'češčina',
  sk: 'slovaščina',
  pl: 'poljščina',
};

const languageLabel = (code) => LANGUAGE_NAMES[code] || (code || '').toUpperCase();

// Only native (text-layer) PDFs can be translated in place. Scans would need OCR with
// word boxes plus inpainting, which the backend rejects.
const isTranslatable = (doc) =>
  doc.isNativePdf && /\.pdf$/i.test(doc.fileName);

export const TranslationModal = ({ isOpen, onClose, documents, isTranslating, progress, onTranslate }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const translatable = documents.filter(isTranslatable);
  const notTranslatable = documents.filter(d => !isTranslatable(d));

  useEffect(() => {
    if (isOpen) setSelectedIds(new Set(translatable.map(d => d.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documents.length]);

  if (!isOpen) return null;

  const allSelected = translatable.length > 0 && selectedIds.size === translatable.length;

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(translatable.map(d => d.id)));

  const toggleOne = (id) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleTranslate = () => {
    const selected = translatable.filter(d => selectedIds.has(d.id));
    if (selected.length > 0) onTranslate(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Languages className="text-amber-600" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Tujejezični dokumenti</h3>
              <p className="text-sm text-gray-500">
                Prevod se doda kot kopija poleg originala (šifra <span className="font-mono">-P</span>).
              </p>
            </div>
          </div>
          {!isTranslating && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              ×
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {isTranslating ? (
            <div className="py-8">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-amber-800 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Prevajam dokumente...
                </span>
                <span className="text-amber-700 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Prevajanje lahko traja nekaj časa. Prosimo, ne zapirajte okna.
              </p>
            </div>
          ) : (
            <>
              {translatable.length > 0 && (
                <div className="mb-5">
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Izberi vse ({translatable.length})
                    </span>
                  </label>

                  <div className="space-y-2">
                    {translatable.map(doc => (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedIds.has(doc.id)
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-gray-200 hover:border-amber-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleOne(doc.id)}
                          className="w-4 h-4 accent-amber-600 cursor-pointer"
                        />
                        <FileText size={18} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                          {doc.docCode && (
                            <p className="text-xs text-gray-500 font-mono">
                              {doc.docCode} → {doc.docCode}-P
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold flex-shrink-0">
                          {languageLabel(doc.language)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {notTranslatable.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-gray-600">
                    <AlertTriangle size={16} className="text-gray-400" />
                    <span className="text-sm font-semibold">
                      Ni mogoče prevesti ({notTranslatable.length})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Skenirani dokumenti in slike nimajo besedilne plasti — prevod zanje še ni podprt.
                  </p>
                  <div className="space-y-2">
                    {notTranslatable.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border-2 border-gray-100 rounded-lg bg-gray-50 opacity-70"
                      >
                        <FileText size={18} className="text-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-500 truncate">{doc.fileName}</p>
                          <p className="text-xs text-gray-400">sken — prevod ni podprt</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-200 text-gray-500 rounded text-xs font-semibold flex-shrink-0">
                          {languageLabel(doc.language)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!isTranslating && (
          <div className="p-5 border-t flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              Prekliči
            </button>
            <button
              onClick={handleTranslate}
              disabled={selectedIds.size === 0}
              className="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Languages size={20} />
              Prevedi ({selectedIds.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationModal;
