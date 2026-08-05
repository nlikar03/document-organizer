import React from 'react';
import { Upload, Edit2, Plus, Trash2, ChevronRight, ChevronDown, FileText, Loader2, ArrowUp, ArrowDown, User, Calendar, Hash, Brain, Languages, Eye, X } from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import { sortByExplicitIndex } from './documentUtils';

const countFilesInFolderTree = (folderId, allFiles) => {
  return allFiles.filter(f => {
    const fileFolderId = f.folderId || f.suggestedFolder?.id;
    return fileFolderId === folderId || fileFolderId?.startsWith(folderId + '.');
  }).length;
};

export const FolderTreeStep1 = ({
  folders,
  directUploads,
  finalResults = [],
  editingId,
  editingName,
  setEditingName,
  toggleFolder,
  startEdit,
  saveEdit,
  addFolder,
  deleteFolder,
  moveFolderUp,
  moveFolderDown,
  openUploadModal,
  openFolderFiles,
  removeFile,
  moveReviewFileUp,
  moveReviewFileDown,
  handleDirectUploadToFolder,
  handleFolderDrop,
}) => {
  const [dragOverFolderId, setDragOverFolderId] = React.useState(null);
  const [uploadingFolderId, setUploadingFolderId] = React.useState(null);

  // Step 1 shows manual uploads *and* AI-classified files, so a file that has
  // been through classification stays visible here. AI results carry their
  // folder as suggestedFolder; manual uploads carry folderId.
  const allFiles = React.useMemo(() => {
    const byKey = new Map();
    finalResults.forEach(f => byKey.set(f.id || f.fileName, f));
    directUploads.forEach(f => {
      const key = f.id || f.fileName;
      if (!byKey.has(key)) byKey.set(key, f);
    });
    // sortIndex is what manual reordering / alphabetical sort write.
    return sortByExplicitIndex(Array.from(byKey.values()));
  }, [finalResults, directUploads]);

  const fileFolderId = (f) => f.suggestedFolder?.id || f.folderId;

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    // Check if any item is a directory
    const items = Array.from(e.dataTransfer.items || []);
    const hasDirectory = items.some(item => {
      const entry = item.webkitGetAsEntry?.();
      return entry?.isDirectory;
    });

    if (hasDirectory || items.length > 0) {
      // Use folder-aware drop handler
      setUploadingFolderId(folderId);
      await handleFolderDrop(e.dataTransfer.items, folderId);
      setUploadingFolderId(null);
    } else {
      // Fallback: plain files only
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setUploadingFolderId(folderId);
        await handleDirectUploadToFolder(folderId, files);
        setUploadingFolderId(null);
      }
    }
  };

  const isChildVisible = (folder) => {
    if (folder.level === 0) return true;
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    const parent = folders.find(f => f.id === parentId);
    if (!parent) return true;
    if (!parent.expanded) return false;
    return isChildVisible(parent);
  };

  const renderFolder = (folder) => {
    if (!isChildVisible(folder)) return null;

    const hasChildren = folders.some(f => 
      f.id.startsWith(folder.id + '.') && f.id.split('.').length === folder.id.split('.').length + 1
    );
    
    const folderFiles = allFiles.filter(f => fileFolderId(f) === folder.id);
    const totalFileCount = countFilesInFolderTree(folder.id, allFiles);
    const isDraggingOver = dragOverFolderId === folder.id;
    const isUploading = uploadingFolderId === folder.id;

    return (
      <div key={folder.id} style={{ marginLeft: `${folder.level * 24}px` }}>
        <div 
          className={`flex items-center gap-2 py-2 px-3 rounded transition-all group ${
            isDraggingOver 
              ? 'bg-indigo-100 border-2 border-indigo-400 border-dashed' 
              : 'hover:bg-indigo-50 border-2 border-transparent'
          }`}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <button onClick={() => toggleFolder(folder.id)} className="p-1 hover:bg-indigo-100 rounded">
            {hasChildren || folderFiles.length > 0 
              ? (folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) 
              : <div className="w-4" />}
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
                {isUploading ? (
                  <Loader2 className="animate-spin text-indigo-600 ml-2" size={16} />
                ) : totalFileCount > 0 ? (
                  <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {totalFileCount}
                  </span>
                ) : null}
                {isDraggingOver && (
                  <span className="ml-2 text-xs text-indigo-600 font-semibold animate-pulse">
                    Spusti tukaj
                  </span>
                )}
              </>
            )}
          </div>

          <ContextMenu
            items={[
              { label: 'Premakni gor', icon: <ArrowUp size={14} />, keepOpen: true, onClick: () => moveFolderUp(folder.id) },
              { label: 'Premakni dol', icon: <ArrowDown size={14} />, keepOpen: true, onClick: () => moveFolderDown(folder.id) },
              { label: 'Naloži datoteke', icon: <Upload size={14} />, onClick: () => openUploadModal(folder.id) },
              { label: 'Preimenuj', icon: <Edit2 size={14} />, onClick: () => startEdit(folder.id, folder.name) },
              { label: 'Nova podmapa', icon: <Plus size={14} />, onClick: () => addFolder(folder.id, folder.level + 1) },
              { label: 'Izbriši', icon: <Trash2 size={14} />, danger: true, onClick: () => deleteFolder(folder.id) },
            ]}
          />
        </div>
        
        {folder.expanded && folderFiles.length > 0 && (
          <div className="ml-6 mt-1 space-y-1">
            {folderFiles.map((file, fileIndex) => {
              const fileId = file.id || file.fileName;
              const isAIClassified = Boolean(file.suggestedFolder) && !file.isDirectUpload;
              return (
                <div
                  key={fileId}
                  className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors group"
                >
                  <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                    {isAIClassified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold flex-shrink-0">
                        <Brain size={12} />
                        AI
                      </span>
                    )}
                  </div>
                  <ContextMenu
                    items={[
                      {
                        label: 'Premakni gor',
                        icon: <ArrowUp size={14} />,
                        keepOpen: true,
                        disabled: fileIndex === 0,
                        onClick: () => moveReviewFileUp?.(fileId),
                      },
                      {
                        label: 'Premakni dol',
                        icon: <ArrowDown size={14} />,
                        keepOpen: true,
                        disabled: fileIndex === folderFiles.length - 1,
                        onClick: () => moveReviewFileDown?.(fileId),
                      },
                      {
                        label: 'Odstrani',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onClick: () => {
                          if (window.confirm(`Odstrani "${file.fileName}"?`)) removeFile(fileId);
                        },
                      },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
};

export const FolderTreeStep5 = ({
  folders,
  finalResults,
  directUploads,
  toggleFolder,
  startFileEdit,
  removeFileFromReview,
  removeFilesFromReview,
  showAITitles,
  onPreviewTranslation,
  onAttachTranslation,
  onRemoveTranslation,
  onAiTranslate,
}) => {
  // Build the deduplicated file list once for the whole tree
  const reviewFileMap = new Map();
  finalResults.forEach(file => reviewFileMap.set(file.id || file.fileName, file));
  directUploads.forEach(file => {
    const key = file.id || file.fileName;
    if (!reviewFileMap.has(key)) reviewFileMap.set(key, file);
  });
  const reviewFiles = Array.from(reviewFileMap.values());

  const isChildVisible = (folder) => {
    if (folder.level === 0) return true;
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    const parent = folders.find(f => f.id === parentId);
    if (!parent) return true;
    if (!parent.expanded) return false;
    return isChildVisible(parent);
  };

  const renderFolder = (folder) => {
    if (!isChildVisible(folder)) return null;

    const hasChildren = folders.some(f =>
      f.id.startsWith(folder.id + '.') && f.id.split('.').length === folder.id.split('.').length + 1
    );
    const folderFiles = reviewFiles.filter(file => {
      const fileFolderId = file.suggestedFolder?.id || file.folderId;
      return fileFolderId === folder.id;
    });
    
    const totalFileCount = countFilesInFolderTree(folder.id, reviewFiles);

    // Files in this folder only vs. including every subfolder — offered as two
    // separate actions, since deleting a whole branch is easy to do by accident.
    const idsHere = folderFiles.map(f => f.id || f.fileName);
    const idsWithSubfolders = reviewFiles
      .filter(file => {
        const fid = file.suggestedFolder?.id || file.folderId;
        return fid === folder.id || fid?.startsWith(folder.id + '.');
      })
      .map(f => f.id || f.fileName);

    const confirmRemove = (ids, message) => {
      if (ids.length === 0) return;
      if (window.confirm(message)) removeFilesFromReview?.(ids);
    };

    const folderMenuItems = [];
    if (idsHere.length > 0) {
      folderMenuItems.push({
        label: `Izbriši datoteke (${idsHere.length})`,
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => confirmRemove(
          idsHere,
          `Izbrišem ${idsHere.length} dokumentov iz mape "${folder.name}"?`
        ),
      });
    }
    if (idsWithSubfolders.length > idsHere.length) {
      folderMenuItems.push({
        label: `Izbriši s podmapami (${idsWithSubfolders.length})`,
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => confirmRemove(
          idsWithSubfolders,
          `Izbrišem ${idsWithSubfolders.length} dokumentov iz mape "${folder.name}" in vseh njenih podmap?`
        ),
      });
    }

    return (
      <div key={folder.id} style={{ marginLeft: `${folder.level * 24}px` }}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-indigo-50 rounded transition-colors group">
          <button onClick={() => toggleFolder(folder.id)} className="p-1 hover:bg-indigo-100 rounded">
            {hasChildren || folderFiles.length > 0
              ? (folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)
              : <div className="w-4" />}
          </button>

          <span className="text-indigo-600">📁</span>
          <span className="text-sm font-medium text-gray-700">{folder.name}</span>
          {totalFileCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {totalFileCount}
            </span>
          )}
          <div className="ml-auto">
            {folderMenuItems.length > 0 && <ContextMenu items={folderMenuItems} />}
          </div>
        </div>
        
        {folder.expanded && folderFiles.length > 0 && (
          <div className="ml-6 mt-1 space-y-1">
            {folderFiles.map((file) => {
              const fileId = file.id || file.fileName;
              const isAIClassified = Boolean(file.suggestedFolder) && !file.isDirectUpload;
              return (
                <div key={fileId} className="space-y-0">
                <div
                  className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors group"
                >
                  <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {showAITitles && file.documentTitle ? file.documentTitle : file.fileName}
                      </p>
                      {isAIClassified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold flex-shrink-0">
                          <Brain size={12} />
                          AI Klasificiran
                        </span>
                      )}
                      {file.language && file.language !== 'sl' && !file.translatedFileName && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold uppercase flex-shrink-0">
                          {file.language}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {file.issuer && (
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          {file.issuer}
                        </span>
                      )}
                      {file.date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          {file.date}
                        </span>
                      )}
                      {file.documentNumber && (
                        <span className="flex items-center gap-1">
                          <Hash size={12} className="text-gray-400" />
                          {file.documentNumber}
                        </span>
                      )}
                      {file.docCode && <span className="font-mono font-bold text-red-600">{file.docCode}</span>}
                    </div>
                  </div>
                  <ContextMenu
                    items={[
                      { label: 'Uredi', icon: <Edit2 size={14} />, onClick: () => startFileEdit(fileId, file) },
                      { label: 'Odstrani', icon: <Trash2 size={14} />, danger: true, onClick: () => removeFileFromReview(fileId) },
                    ]}
                  />
                </div>

                {/* Foreign-language document without a translation yet: let the user
                    either upload their own translated PDF or run the AI translation. */}
                {file.language && file.language !== 'sl' && !file.translatedFileName && (
                  <div className="ml-8 flex items-center gap-2 w-[calc(100%-2rem)] p-2 bg-amber-50 border border-amber-200 border-t-0 rounded-b">
                    <Languages size={15} className="text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800 flex-1 min-w-0 truncate">
                      Tuj jezik ({file.language.toUpperCase()}) — dodaj slovenski prevod:
                    </span>
                    <label className="flex items-center gap-1 px-2 py-1 bg-white border border-amber-300 text-amber-800 rounded text-xs font-semibold flex-shrink-0 cursor-pointer hover:bg-amber-100 transition-colors">
                      <Upload size={13} />
                      Naloži prevod
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const pdf = e.target.files?.[0];
                          e.target.value = '';
                          if (pdf) onAttachTranslation?.(fileId, pdf);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => onAiTranslate?.([file])}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs font-semibold flex-shrink-0 hover:bg-indigo-700 transition-colors"
                      title="Samodejni AI prevod"
                    >
                      <Brain size={13} />
                      AI prevod
                    </button>
                  </div>
                )}

                {file.translatedFileName && (
                  <div className="ml-8 flex items-center gap-2 w-[calc(100%-2rem)] p-2 bg-green-50 border border-green-200 border-t-0 rounded-b">
                    <button
                      onClick={() => onPreviewTranslation?.(file.translatedFileName)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left group"
                      title="Predogled prevoda"
                    >
                      <Languages size={15} className="text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">
                          Slovenski prevod {file.manualTranslation ? '(naložen)' : '(AI)'}
                        </p>
                        {file.translationTruncated && (
                          <p className="text-xs text-amber-700">
                            ⚠ Skrajšano na {file.translationTruncated.translatedPages} od {file.translationTruncated.originalPages} strani
                          </p>
                        )}
                      </div>
                      {file.docCode && (
                        <span className="font-mono font-bold text-green-700 text-sm flex-shrink-0">
                          {file.docCode}-P
                        </span>
                      )}
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold flex-shrink-0 group-hover:bg-green-700 transition-colors">
                        <Eye size={13} />
                        Predogled
                      </span>
                    </button>
                    <button
                      onClick={() => onRemoveTranslation?.(fileId)}
                      className="p-1 text-green-700 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                      title="Odstrani prevod"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
};

export const UploadModal = ({ 
  isOpen, 
  folderId, 
  folders, 
  uploading, 
  onClose, 
  onUpload 
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (uploading) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) onUpload({ target: { files } });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Naloži datoteke</h3>
          <p className="text-gray-600 mt-2">
            Mapa: {folders.find(f => f.id === folderId)?.name}
          </p>
        </div>
        <div className="p-6">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={onUpload}
            className="hidden"
            id="folder-upload"
            disabled={uploading}
          />
          <label 
            htmlFor="folder-upload" 
            className={`block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
              uploading ? 'opacity-50 pointer-events-none border-gray-300' : 
              isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <span className="text-gray-600">Nalaganje...</span>
              </div>
            ) : (
              <>
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <span className="text-indigo-600 font-semibold">Kliknite za nalaganje</span>
                <p className="text-sm text-gray-500 mt-2">ali povlecite datoteke na mape</p>
              </>
            )}
          </label>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
};