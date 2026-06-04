import { useState } from 'react';
import { defaultStructure } from './documentUtils';

// Persists a value to localStorage whenever it changes.
const makeSaver = (key, getter, setter) => (value) => {
  const updated = typeof value === 'function' ? value(getter()) : value;
  setter(updated);
  localStorage.setItem(key, JSON.stringify(updated));
};

export const useFolderState = () => {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('folders');
    return saved ? JSON.parse(saved) : defaultStructure;
  });

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const setFoldersWithSave = makeSaver('folders', () => folders, setFolders);

  // ── Folder CRUD ────────────────────────────────────────────────────────────

  const toggleFolder = (id) => {
    setFoldersWithSave(folders.map(f => {
      if (f.id === id) return { ...f, expanded: !f.expanded };
      if (f.id.startsWith(id + '.')) return { ...f, expanded: false };
      return f;
    }));
  };

  const addFolder = (parentId, level) => {
    const newId = parentId === 'root' ? Date.now().toString() : `${parentId}.${Date.now()}`;
    const newFolder = { id: newId, name: 'Nova Mapa', level, expanded: false };

    if (parentId === 'root') {
      setFoldersWithSave([...folders, newFolder]);
    } else {
      const parentIndex = folders.findIndex(f => f.id === parentId);
      const newFolders = [...folders];
      let insertIndex = parentIndex + 1;
      while (insertIndex < newFolders.length && newFolders[insertIndex].id.startsWith(parentId + '.')) {
        insertIndex++;
      }
      newFolders.splice(insertIndex, 0, newFolder);
      setFoldersWithSave(newFolders);
    }

    setEditingId(newId);
    setEditingName('Nova Mapa');
  };

  const deleteFolder = (id, directUploads, setDirectUploadsWithSave) => {
    setFoldersWithSave(folders.filter(f => f.id !== id && !f.id.startsWith(id + '.')));
    setDirectUploadsWithSave(directUploads.filter(f => f.folderId !== id && !f.folderId?.startsWith(id + '.')));
  };

  const deleteAllFolders = (setDirectUploadsWithSave) => {
    setFoldersWithSave([]);
    setDirectUploadsWithSave([]);
  };

  // ── Move up/down ───────────────────────────────────────────────────────────

  const moveFolderUp = (id) => {
    const index = folders.findIndex(f => f.id === id);
    if (index <= 0) return;

    const folder = folders[index];
    const folderLevel = folder.level;
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    let prevSiblingIndex = -1;

    for (let i = index - 1; i >= 0; i--) {
      const s = folders[i];
      if (s.level === folderLevel && s.id.split('.').slice(0, -1).join('.') === parentId) {
        prevSiblingIndex = i;
        break;
      }
      if (s.level < folderLevel) break;
    }

    if (prevSiblingIndex === -1) return;

    const folderAndDesc = folders.filter(f => f.id === id || f.id.startsWith(id + '.'));
    const prevSibling = folders[prevSiblingIndex];
    const prevAndDesc = folders.filter(f => f.id === prevSibling.id || f.id.startsWith(prevSibling.id + '.'));
    const rest = folders.filter(f => !folderAndDesc.includes(f) && !prevAndDesc.includes(f));

    setFoldersWithSave([
      ...rest.slice(0, prevSiblingIndex),
      ...folderAndDesc,
      ...prevAndDesc,
      ...rest.slice(prevSiblingIndex),
    ]);
  };

  const moveFolderDown = (id) => {
    const index = folders.findIndex(f => f.id === id);
    if (index === -1) return;

    const folder = folders[index];
    const folderLevel = folder.level;
    const folderAndDesc = folders.filter(f => f.id === id || f.id.startsWith(id + '.'));
    const lastDescIdx = folders.findIndex(f => f.id === folderAndDesc[folderAndDesc.length - 1].id);
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    let nextSiblingIndex = -1;

    for (let i = lastDescIdx + 1; i < folders.length; i++) {
      const s = folders[i];
      if (s.level === folderLevel && s.id.split('.').slice(0, -1).join('.') === parentId) {
        nextSiblingIndex = i;
        break;
      }
      if (s.level < folderLevel) break;
    }

    if (nextSiblingIndex === -1) return;

    const nextSibling = folders[nextSiblingIndex];
    const nextAndDesc = folders.filter(f => f.id === nextSibling.id || f.id.startsWith(nextSibling.id + '.'));
    const rest = folders.filter(f => !folderAndDesc.includes(f) && !nextAndDesc.includes(f));

    setFoldersWithSave([
      ...rest.slice(0, index),
      ...nextAndDesc,
      ...folderAndDesc,
      ...rest.slice(index),
    ]);
  };

  // ── Sort ───────────────────────────────────────────────────────────────────

  const sortFoldersByNumber = () => {
    const getNumericKey = (name) => {
      const match = name.match(/^(\d+(?:\.\d+)*)/);
      return match ? match[1].split('.').map(Number) : [Infinity];
    };

    const compareByName = (a, b) => {
      const aParts = getNumericKey(a.name);
      const bParts = getNumericKey(b.name);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (aParts[i] ?? -1) - (bParts[i] ?? -1);
        if (diff !== 0) return diff;
      }
      return 0;
    };

    const sortGroup = (parentId, level) => {
      const siblings = folders
        .filter(f => f.level === level && f.id.split('.').slice(0, -1).join('.') === parentId)
        .sort(compareByName);
      return siblings.flatMap(s => [s, ...sortGroup(s.id, level + 1)]);
    };

    setFoldersWithSave(sortGroup('', 0));
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const startEdit = (id, name) => { setEditingId(id); setEditingName(name); };

  const saveEdit = (id) => {
    setFoldersWithSave(folders.map(f => f.id === id ? { ...f, name: editingName } : f));
    setEditingId(null);
    setEditingName('');
  };

  // ── Import / Export ────────────────────────────────────────────────────────

  const exportFolderStructure = () => {
    const blob = new Blob([JSON.stringify(folders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `folder-structure-${new Date().toISOString().split('T')[0]}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importFolderStructure = (structure) => {
    if (!Array.isArray(structure)) {
      alert('Neveljavna struktura: mora biti seznam map');
      return;
    }
    const isValid = structure.every(f =>
      f.id && f.name && typeof f.level === 'number' && typeof f.expanded === 'boolean'
    );
    if (!isValid) {
      alert('Neveljavna struktura: manjkajo obvezna polja');
      return;
    }
    setFoldersWithSave(structure);
  };

  return {
    folders,
    editingId,
    editingName,
    setEditingName,
    setFoldersWithSave,
    toggleFolder,
    addFolder,
    deleteFolder,
    deleteAllFolders,
    moveFolderUp,
    moveFolderDown,
    sortFoldersByNumber,
    startEdit,
    saveEdit,
    exportFolderStructure,
    importFolderStructure,
  };
};
