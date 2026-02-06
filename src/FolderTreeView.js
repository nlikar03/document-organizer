import React from 'react';
import { Upload, Edit2, Plus, Trash2, ChevronRight, ChevronDown, FileText, Loader2, ArrowUp, ArrowDown, Eye, User, Calendar, Hash } from 'lucide-react';
import { getFullPath } from './documentUtils';
import { ContextMenu } from './ContextMenu';

// Helper to count files in a folder and all its children
const countFilesInFolderTree = (folderId, allFiles) => {
  return allFiles.filter(f => {
    const fileFolderId = f.folderId || f.suggestedFolder?.id;
    return fileFolderId === folderId || fileFolderId?.startsWith(folderId + '.');
  }).length;
};

// Render folder for Step 1 (with upload button and files display)
export const FolderTreeStep1 = ({ 
  folders, 
  directUploads, 
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
  removeDirectUpload,
  handleDirectUploadToFolder
}) => {
  const [dragOverFolderId, setDragOverFolderId] = React.useState(null);
  const [uploadingFolderId, setUploadingFolderId] = React.useState(null);

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadingFolderId(folderId);
      await handleDirectUploadToFolder(folderId, Array.from(files));
      setUploadingFolderId(null);
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
    
    // Get files directly in this folder
    const folderFiles = directUploads.filter(f => f.folderId === folder.id);
    
    // Count files in this folder AND all subfolders
    const totalFileCount = countFilesInFolderTree(folder.id, directUploads);

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
          onDragLeave={(e) => handleDragLeave(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <button onClick={() => toggleFolder(folder.id)} className="p-1 hover:bg-indigo-100 rounded">
            {hasChildren || folderFiles.length > 0 ? (folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-4" />}
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
                    Spusti datoteke tukaj
                  </span>
                )}
              </>
            )}
          </div>

          <ContextMenu
            items={[
                {
                label: 'Premakni gor',
                icon: <ArrowUp size={14} />,
                onClick: () => moveFolderUp(folder.id),
                },
                {
                label: 'Premakni dol',
                icon: <ArrowDown size={14} />,
                onClick: () => moveFolderDown(folder.id),
                },
                {
                label: 'Naloži datoteke',
                icon: <Upload size={14} />,
                onClick: () => openUploadModal(folder.id),
                },
                {
                label: 'Preimenuj',
                icon: <Edit2 size={14} />,
                onClick: () => startEdit(folder.id, folder.name),
                },
                {
                label: 'Nova podmapa',
                icon: <Plus size={14} />,
                onClick: () => addFolder(folder.id, folder.level + 1),
                },
                {
                label: 'Izbriši',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => deleteFolder(folder.id),
                },
            ].filter(Boolean)}
            />
        </div>
        
        {/* Files in this folder */}
        {folder.expanded && folderFiles.length > 0 && (
          <div className="ml-6 mt-1 space-y-1">
            {folderFiles.map((file) => {
              const fileId = file.id;
              return (
                <div 
                  key={fileId}
                  className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors group"
                >
                  <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                  </div>
                  <button
                    onClick={() => removeDirectUpload(fileId)}
                    className="p-1 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Odstrani"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
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

// Render folder for Step 5 (review - with files)
export const FolderTreeStep5 = ({ 
  folders, 
  finalResults, 
  directUploads, 
  toggleFolder, 
  startFileEdit, 
  removeFileFromReview 
}) => {
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
    
    // Get direct files in this folder
    const folderFiles = [
      ...finalResults.filter(f => f.suggestedFolder?.id === folder.id),
      ...directUploads.filter(f => f.folderId === folder.id)
    ];
    
    // Count all files in this folder tree (including subfolders)
    const allFiles = [...finalResults, ...directUploads];
    const totalFileCount = countFilesInFolderTree(folder.id, allFiles);

    return (
      <div key={folder.id} style={{ marginLeft: `${folder.level * 24}px` }}>
        {/* Folder row */}
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-indigo-50 rounded transition-colors group">
          <button onClick={() => toggleFolder(folder.id)} className="p-1 hover:bg-indigo-100 rounded">
            {hasChildren || folderFiles.length > 0 ? (folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-4" />}
          </button>
          
          <span className="text-indigo-600">📁</span>
          <span className="text-sm font-medium text-gray-700">{folder.name}</span>
          {totalFileCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {totalFileCount}
            </span>
          )}
        </div>
        
        {/* Files in this folder */}
        {folder.expanded && folderFiles.length > 0 && (
          <div className="ml-6 mt-1 space-y-1">
            {folderFiles.map((file) => {
              const fileId = file.id || `${file.fileName}_${Date.now()}`;
              return (
                <div 
                  key={fileId}
                  className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors group"
                >
                  <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
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
                        {
                        label: 'Uredi',
                        icon: <Edit2 size={14} />,
                        onClick: () => startFileEdit(fileId, file),
                        },
                        {
                        label: 'Odstrani',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onClick: () => removeFileFromReview(fileId),
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

// Upload modal component - now supports drag and drop
export const UploadModal = ({ 
  isOpen, 
  folderId, 
  folders, 
  uploading, 
  onClose, 
  onUpload 
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (uploading) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a fake event object
      const fakeEvent = { target: { files } };
      onUpload(fakeEvent);
    }
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