import React, { useState, useMemo } from 'react';
import { Trash2, FileText, ArrowUpDown, Eye } from 'lucide-react';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('sl-SI', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatSize = (bytes) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} KB` : '—';

const DocumentListView = ({ folders, finalResults, directUploads, removeFilesFromReview, showAITitles, onPreviewTranslation }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [anchorIndex, setAnchorIndex] = useState(null);
  const [sortBy, setSortBy] = useState('processedAt');
  const [sortDir, setSortDir] = useState('desc');

  const folderNameById = useMemo(() => {
    const map = new Map();
    folders.forEach(f => map.set(f.id, f.name));
    return map;
  }, [folders]);

  // AI results carry suggestedFolder ({id, name, fullPath}); direct uploads carry folderId.
  const rows = useMemo(() => {
    const byKey = new Map();
    [...finalResults, ...directUploads].forEach(file => {
      const key = file.id || file.fileName;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ...file,
          folderLabel: file.suggestedFolder?.fullPath
            || file.suggestedFolder?.name
            || folderNameById.get(file.folderId)
            || 'Nerazvrščeno',
          sourceLabel: file.isDirectUpload ? 'Ročno' : 'AI',
        });
      }
    });
    return Array.from(byKey.values());
  }, [finalResults, directUploads, folderNameById]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = String(a[sortBy] ?? '');
      const bv = String(b[sortBy] ?? '');
      return av.localeCompare(bv, 'sl-SI', { numeric: true }) * dir;
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (column) => {
    // Row order changes, so the anchor index no longer points at the same row.
    setAnchorIndex(null);
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const allSelected = sortedRows.length > 0 && selectedIds.size === sortedRows.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(sortedRows.map(r => r.id)));
    setAnchorIndex(null);
  };

  // Windows-style selection: plain click selects only the row, Ctrl/Cmd toggles one,
  // Shift selects the range from the last anchor row.
  const selectRow = (index, { shiftKey, ctrlKey, metaKey }) => {
    const id = sortedRows[index].id;

    if (shiftKey && anchorIndex !== null) {
      const [from, to] = anchorIndex <= index ? [anchorIndex, index] : [index, anchorIndex];
      const range = sortedRows.slice(from, to + 1).map(r => r.id);
      // Ctrl+Shift extends the existing selection; plain Shift replaces it.
      setSelectedIds(ctrlKey || metaKey ? prev => new Set([...prev, ...range]) : new Set(range));
      return;
    }

    setAnchorIndex(index);

    if (ctrlKey || metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      return;
    }

    // Plain click: select only this row, unless it's the sole selection (then clear).
    setSelectedIds(prev =>
      prev.size === 1 && prev.has(id) ? new Set() : new Set([id])
    );
  };

  // The checkbox itself always toggles just its own row, regardless of modifiers.
  const toggleOne = (index) => {
    const id = sortedRows[index].id;
    setAnchorIndex(index);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRemoveSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Ste prepričani, da želite odstraniti ${count} ${count === 1 ? 'dokument' : 'dokumentov'}?`)) return;
    removeFilesFromReview(Array.from(selectedIds));
    setSelectedIds(new Set());
    setAnchorIndex(null);
  };

  const SortableHeader = ({ column, children, className = '' }) => (
    <th className={`px-3 py-2 text-left font-semibold text-gray-700 ${className}`}>
      <button
        onClick={() => toggleSort(column)}
        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
      >
        {children}
        <ArrowUpDown size={12} className={sortBy === column ? 'text-indigo-600' : 'text-gray-400'} />
      </button>
    </th>
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText size={48} className="mb-3 opacity-40" />
        <p>Ni dokumentov za prikaz</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          {selectedIds.size > 0
            ? `Izbranih: ${selectedIds.size} / ${rows.length}`
            : (
              <>
                Skupaj dokumentov: {rows.length}
                <span className="ml-2 text-xs text-gray-400">
                  (klik za izbiro, Shift+klik za obseg, Ctrl+klik za posamezne)
                </span>
              </>
            )}
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleRemoveSelected}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Trash2 size={14} />
            Odstrani izbrane ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 cursor-pointer accent-indigo-600"
                />
              </th>
              <SortableHeader column="docCode">Šifra</SortableHeader>
              <SortableHeader column={showAITitles ? 'documentTitle' : 'fileName'}>
                {showAITitles ? 'AI naslov' : 'Ime datoteke'}
              </SortableHeader>
              <SortableHeader column="folderLabel">Mapa</SortableHeader>
              <SortableHeader column="issuer">Izdajatelj</SortableHeader>
              <SortableHeader column="documentNumber">Št. dokumenta</SortableHeader>
              <SortableHeader column="date">Datum dokumenta</SortableHeader>
              <SortableHeader column="processedAt">Procesirano</SortableHeader>
              <SortableHeader column="sourceLabel">Vir</SortableHeader>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const isSelected = selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={(e) => selectRow(index, e)}
                  className={`border-b border-gray-100 transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(index)}
                      className="w-4 h-4 cursor-pointer accent-indigo-600"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.docCode || '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-[280px]">
                    <div className="truncate" title={showAITitles ? row.documentTitle : row.fileName}>
                      {(showAITitles ? row.documentTitle : row.fileName) || row.fileName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{formatSize(row.fileSize)}</span>
                      {row.language && row.language !== 'sl' && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold uppercase">
                          {row.language}
                        </span>
                      )}
                      {row.translatedFileName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onPreviewTranslation?.(row.translatedFileName); }}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-[10px] font-semibold transition-colors"
                          title="Predogled prevoda"
                        >
                          prevod {row.docCode ? `${row.docCode}-P` : ''}
                          <Eye size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[180px]">
                    <div className="truncate" title={row.folderLabel}>{row.folderLabel}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[160px]">
                    <div className="truncate" title={row.issuer}>{row.issuer || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.documentNumber || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.date || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(row.processedAt)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.sourceLabel === 'AI'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {row.sourceLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Odstrani "${row.fileName}"?`)) {
                          removeFilesFromReview([row.id]);
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            next.delete(row.id);
                            return next;
                          });
                          setAnchorIndex(null);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Odstrani"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentListView;
