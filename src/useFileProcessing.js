import { useState } from 'react';
import { verifyPassword, processOCR, processAI, translatePdf } from './documentApi';
import { saveFileToIndexedDB, getFileFromIndexedDB } from './indexedDBHelper';
import { TRANSLATION_MAX_PAGES } from './documentUtils';

export const useFileProcessing = () => {
  const [files, setFiles] = useState([]);
  // Translations dropped in at upload time, keyed by the ORIGINAL document's file name
  // (e.g. "pogodba.pdf" -> "pogodba-sl.pdf"). Held aside so they don't go through
  // OCR/AI as their own document; auto-attached to their original after classification.
  // Persisted so the pairing survives a reload between step 2 and step 5.
  const [pendingTranslations, setPendingTranslations] = useState(() => {
    const saved = localStorage.getItem('pendingTranslations');
    return saved ? JSON.parse(saved) : {};
  });
  const savePendingTranslations = (next) => {
    setPendingTranslations(next);
    localStorage.setItem('pendingTranslations', JSON.stringify(next));
  };
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState(() => {
    const saved = localStorage.getItem('ocrResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);
  // The backend has no session/token — every request re-sends the password in an
  // X-Password header — so staying logged in means keeping the password around.
  // sessionStorage: survives reloads, dies with the tab.
  const [password, setPassword] = useState(() => sessionStorage.getItem('authPassword') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('authPassword'));
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataProgress, setMetadataProgress] = useState(0);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  const setOcrResultsWithSave = (results) => {
    const updated = typeof results === 'function' ? results(ocrResults) : results;
    setOcrResults(updated);
    localStorage.setItem('ocrResults', JSON.stringify(updated));
  };

  // ── Auth ───────────────────────────────────────────────────────────────────

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setAuthError('Prosim vnesite geslo'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        sessionStorage.setItem('authPassword', password);
        setIsAuthenticated(true);
      } else {
        setAuthError('Napačno geslo');
        setPassword('');
        setAuthLoading(false);
      }
    } catch {
      setAuthError('Napaka pri preverjanju gesla');
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authPassword');
    setPassword('');
    setIsAuthenticated(false);
    setAuthError('');
    setAuthLoading(false);
  };

  // ── File input ─────────────────────────────────────────────────────────────

  // Strip the extension: "pogodba.pdf" -> { base: "pogodba", ext: ".pdf" }.
  const splitExt = (name) => {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? { base: name, ext: '' } : { base: name.slice(0, dot), ext: name.slice(dot) };
  };

  // A file whose base name ends in "-sl" or "-slo" (case-insensitive) is treated as the
  // Slovenian translation of the same-named original. Returns the original's base name
  // (e.g. "pogodba-sl" -> "pogodba") or null if it isn't a translation.
  const translationBaseName = (fileName) => {
    const { base } = splitExt(fileName);
    const m = base.match(/^(.*?)[-_](sl|slo)$/i);
    return m && m[1] ? m[1] : null;
  };

  // alreadyProcessed = names of files finalized in an earlier batch, so re-adding them
  // here would OCR and classify the same document twice.
  const handleFileUpload = (e, alreadyProcessed = []) => {
    // "._name.pdf" (macOS AppleDouble) and friends carry a real extension but no real
    // content, so the backend rejects them with a 400 — drop them before they queue.
    const newFiles = Array.from(e.target.files).filter(
      f => !(f.name.startsWith('._') || f.name === '.DS_Store' || f.name === 'Thumbs.db')
    );

    // Base names of every original that could be a translation's partner: files already
    // queued, plus the non-translation files in this batch.
    const originalBases = new Set(files.map(f => splitExt(f.name).base));
    newFiles.forEach(f => { if (!translationBaseName(f.name)) originalBases.add(splitExt(f.name).base); });

    const queued = new Set(files.map(f => f.name));
    const processed = new Set(alreadyProcessed);

    const duplicates = [];
    const accepted = [];
    const pairedTranslations = [];   // { file, originalBase }
    const orphanTranslations = [];   // translations with no matching original → treat as normal docs

    newFiles.forEach(file => {
      if (queued.has(file.name) || processed.has(file.name)) { duplicates.push(file.name); return; }
      const transBase = translationBaseName(file.name);
      if (transBase && originalBases.has(transBase)) {
        pairedTranslations.push({ file, originalBase: transBase });
      } else if (transBase) {
        orphanTranslations.push(file);   // no partner — classify it like any other document
        accepted.push(file);
      } else {
        accepted.push(file);
      }
    });

    // Hold paired translations aside: store the blob and remember which original they
    // belong to. They do NOT enter the OCR/AI queue.
    if (pairedTranslations.length > 0) {
      const next = { ...pendingTranslations };
      pairedTranslations.forEach(({ file, originalBase }) => {
        saveFileToIndexedDB(file.name, file);       // fire-and-forget; needed later for attach
        next[originalBase] = file.name;
      });
      savePendingTranslations(next);
    }

    if (duplicates.length > 0) {
      alert(
        `Te datoteke so že procesirane ali že v seznamu in bodo preskočene:\n\n${duplicates.join('\n')}`
      );
    }
    if (accepted.length > 0) setFiles([...files, ...accepted]);
  };

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));
  const removeAllFiles = () => { setFiles([]); savePendingTranslations({}); };

  // ── Direct folder uploads ──────────────────────────────────────────────────

  const handleDirectUploadToFolder = async (folderId, uploadedFiles, setDirectUploadsWithSave) => {
    const newUploads = [];
    for (const file of uploadedFiles) {
      await saveFileToIndexedDB(file.name, file);
      newUploads.push({
        id: `direct_${Date.now()}_${Math.random()}`,
        fileName: file.name,
        folderId,
        originalFile: file,
        documentTitle: '',
        issuer: '',
        documentNumber: '',
        date: '',
        isDirectUpload: true,
        processedAt: new Date().toISOString(),
        fileSize: file.size,
      });
    }
    setDirectUploadsWithSave(prev => [...prev, ...newUploads]);
  };

  // ── Folder drag-and-drop ───────────────────────────────────────────────────

  const readEntryRecursive = (entry, parentFolderId, parentLevel) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        // Skip file-manager sidecars ("._name.pdf" etc.) — see handleFileUpload.
        if (entry.name.startsWith('._') || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') {
          resolve({ newFolders: [], files: [] });
          return;
        }
        entry.file(
          (file) => resolve({ newFolders: [], files: [{ file, folderId: parentFolderId }] }),
          () => resolve({ newFolders: [], files: [] })
        );
      } else if (entry.isDirectory) {
        const folderId = parentFolderId === 'root'
          ? `drop_${Date.now()}_${Math.random().toString(36).slice(2)}`
          : `${parentFolderId}.${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const folderEntry = { id: folderId, name: entry.name, level: parentLevel, expanded: true };
        const reader = entry.createReader();

        const readAllEntries = (accumulated) => {
          reader.readEntries(async (batch) => {
            if (batch.length === 0) {
              const childResults = await Promise.all(
                accumulated.map(child => readEntryRecursive(child, folderId, parentLevel + 1))
              );
              const newFolders = [folderEntry];
              const files = [];
              for (const r of childResults) {
                newFolders.push(...r.newFolders);
                files.push(...r.files);
              }
              resolve({ newFolders, files });
            } else {
              readAllEntries([...accumulated, ...batch]);
            }
          }, () => resolve({ newFolders: [folderEntry], files: [] }));
        };
        readAllEntries([]);
      } else {
        resolve({ newFolders: [], files: [] });
      }
    });
  };

  const handleFolderDrop = async (dataTransferItems, dropTargetFolderId, folders, setFoldersWithSave, setDirectUploadsWithSave) => {
    const entries = Array.from(dataTransferItems)
      .map(item => item.webkitGetAsEntry?.())
      .filter(Boolean);

    if (entries.length === 0) return;

    const parentFolderId = dropTargetFolderId || 'root';
    const parentLevel = dropTargetFolderId
      ? (folders.find(f => f.id === dropTargetFolderId)?.level ?? 0) + 1
      : 0;

    const results = await Promise.all(
      entries.map(entry => readEntryRecursive(entry, parentFolderId, parentLevel))
    );

    const newFolders = results.flatMap(r => r.newFolders);
    const newFiles = results.flatMap(r => r.files);

    if (newFolders.length > 0) {
      let updatedFolders;
      if (dropTargetFolderId) {
        const targetIndex = folders.findIndex(f => f.id === dropTargetFolderId);
        let insertAt = targetIndex + 1;
        while (insertAt < folders.length && folders[insertAt].id.startsWith(dropTargetFolderId + '.')) insertAt++;
        updatedFolders = [
          ...folders.slice(0, insertAt),
          ...newFolders,
          ...folders.slice(insertAt),
        ].map(f => f.id === dropTargetFolderId ? { ...f, expanded: true } : f);
      } else {
        updatedFolders = [...folders, ...newFolders];
      }
      setFoldersWithSave(updatedFolders);
    }

    const filteredFiles = newFiles.filter(f => f.folderId !== 'root');
    if (filteredFiles.length > 0) {
      const newUploads = [];
      for (const { file, folderId } of filteredFiles) {
        await saveFileToIndexedDB(file.name, file);
        newUploads.push({
          id: `direct_${Date.now()}_${Math.random()}`,
          fileName: file.name,
          folderId,
          originalFile: file,
          documentTitle: '',
          issuer: '',
          documentNumber: '',
          date: '',
          isDirectUpload: true,
        });
      }
      setDirectUploadsWithSave(prev => [...prev, ...newUploads]);
    }
  };

  // ── OCR ────────────────────────────────────────────────────────────────────

  const startOCRProcessing = async (setCurrentStepWithSave) => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrResultsWithSave([]);
    setCurrentStepWithSave(3);
    const results = await processOCR(files, password, setOcrProgress, setOcrResultsWithSave);
    for (const result of results) {
      await saveFileToIndexedDB(result.fileName, result.originalFile);
    }
    // The uploader queue is consumed by OCR — clear it so returning to step 2 doesn't
    // show already-processed files and offer to run them again.
    setFiles([]);
    setOcrProcessing(false);
  };

  // ── AI ─────────────────────────────────────────────────────────────────────

  const startAIProcessing = async (folders, setFinalResultsWithSave, setCurrentStepWithSave) => {
    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);
    setCurrentStepWithSave(4);
    await processAI(
      ocrResults,
      folders,
      password,
      setAiProgress,
      setAiLogs,
      (newResults) => setFinalResultsWithSave(prev => [...prev, ...newResults])
    );

    // Auto-attach translations that were dropped in at upload time (step 2). Each
    // pending translation is keyed by its original's base name; match it to the freshly
    // classified document and set translatedFileName so it exports with the -P code.
    if (Object.keys(pendingTranslations).length > 0) {
      const attached = new Set();
      const applyPending = (file) => {
        if (file.translatedFileName) return file;
        const base = splitExt(file.fileName).base;
        const translatedName = pendingTranslations[base];
        if (!translatedName) return file;
        attached.add(base);
        return { ...file, translatedFileName: translatedName, translationTruncated: null, manualTranslation: true };
      };
      setFinalResultsWithSave(prev => prev.map(applyPending));
      // Drop the ones we managed to attach; keep any still-unmatched for later.
      if (attached.size > 0) {
        const remaining = { ...pendingTranslations };
        attached.forEach(b => delete remaining[b]);
        savePendingTranslations(remaining);
      }
    }

    setAiProcessing(false);
  };

  // ── Metadata extraction ────────────────────────────────────────────────────

  const openMetadataExtractionModal = () => setShowMetadataModal(true);
  const closeMetadataExtractionModal = () => { if (!isExtractingMetadata) setShowMetadataModal(false); };

  const extractMetadataForSelectedFiles = async (selectedFiles, setDirectUploadsWithSave, setFinalResultsWithSave) => {
    if (selectedFiles.length === 0) return;
    setIsExtractingMetadata(true);
    setMetadataProgress(0);

    try {
      const CHUNK_SIZE = 3;
      const totalChunks = Math.ceil(selectedFiles.length / CHUNK_SIZE);
      const allMetadata = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = selectedFiles.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
        await new Promise(r => setTimeout(r, 0));
        setMetadataProgress((chunkIndex / totalChunks) * 100);
        await new Promise(r => setTimeout(r, 50));

        try {
          const formData = new FormData();
          for (const upload of chunk) {
            const file = await import('./indexedDBHelper').then(m => m.getFileFromIndexedDB(upload.fileName));
            if (file) formData.append('files', file);
          }
          const response = await fetch(
            'https://document-organizer-backend-0aje.onrender.com/api/extract-metadata-batch',
            { method: 'POST', headers: { 'X-Password': password }, body: formData }
          );
          if (!response.ok) throw new Error('Batch failed');
          const data = await response.json();
          allMetadata.push(...data.results);
        } catch (err) {
          console.error(`Chunk ${chunkIndex + 1} failed:`, err);
          chunk.forEach(f => allMetadata.push({ fileName: f.fileName, documentTitle: '', issuer: '', documentNumber: '', date: '' }));
        }

        setMetadataProgress(((chunkIndex + 1) / totalChunks) * 100);
        await new Promise(r => setTimeout(r, 0));
      }

      const metadataById = Object.fromEntries(
        selectedFiles.map((file, i) => [file.id, allMetadata[i] || {}])
      );

      const applyMetadata = (file) => {
        const m = metadataById[file.id];
        if (!m) return file;
        return {
          ...file,
          documentTitle: m.documentTitle || file.documentTitle,
          issuer: m.issuer || file.issuer,
          documentNumber: m.documentNumber || file.documentNumber,
          date: m.date || file.date,
        };
      };

      setDirectUploadsWithSave(prev => prev.map(applyMetadata));
      setFinalResultsWithSave(prev => prev.map(applyMetadata));
      setShowMetadataModal(false);
    } catch (error) {
      console.error('Metadata extraction error:', error);
      alert('Napaka pri izvlačenju metapodatkov');
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  // ── Translation ────────────────────────────────────────────────────────────

  // The translation is stored as a property of the original document, not as a
  // separate entry — a separate entry would consume its own docCode and break the
  // 001, 002, 003 sequence.
  const translateDocuments = async (documents, setDirectUploadsWithSave, setFinalResultsWithSave) => {
    if (documents.length === 0) return;
    setIsTranslating(true);
    setTranslationProgress(0);

    const translated = {};
    const failed = [];

    const truncated = {};        // docId -> { translatedPages, originalPages }
    const truncatedNames = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        const original = await getFileFromIndexedDB(doc.fileName);
        if (!original) throw new Error('Datoteke ni v shrambi');

        const { blob, originalPages, translatedPages, truncated: wasTruncated } =
          await translatePdf(original, doc.language, password);

        const dot = doc.fileName.lastIndexOf('.');
        const translatedName = dot === -1
          ? `${doc.fileName}_PREVOD`
          : `${doc.fileName.slice(0, dot)}_PREVOD${doc.fileName.slice(dot)}`;

        await saveFileToIndexedDB(translatedName, blob);
        translated[doc.id] = translatedName;
        if (wasTruncated) {
          truncated[doc.id] = { translatedPages, originalPages };
          truncatedNames.push(`${doc.fileName} (${translatedPages}/${originalPages} strani)`);
        }
      } catch (error) {
        console.error(`Translation failed for ${doc.fileName}:`, error);
        failed.push(doc.fileName);
      }
      setTranslationProgress(((i + 1) / documents.length) * 100);
    }

    const applyTranslation = (file) =>
      translated[file.id]
        ? {
            ...file,
            translatedFileName: translated[file.id],
            translationTruncated: truncated[file.id] || null,
          }
        : file;

    setFinalResultsWithSave(prev => prev.map(applyTranslation));
    setDirectUploadsWithSave(prev => prev.map(applyTranslation));

    setIsTranslating(false);
    setShowTranslationModal(false);

    if (truncatedNames.length > 0) {
      alert(
        `Prevod je omejen na prvih ${TRANSLATION_MAX_PAGES} strani. Naslednji dokumenti so bili skrajšani:\n\n${truncatedNames.join('\n')}`
      );
    }
    if (failed.length > 0) {
      alert(`Prevod ni uspel za:\n\n${failed.join('\n')}`);
    }
  };

  // Attaches a user-supplied PDF as a document's translation, instead of the AI
  // translation. Stored the same way (translatedFileName → blob in IndexedDB) so
  // preview, ZIP export and the "-P" code all work unchanged. Marked manual so the
  // UI can tell it apart from an AI translation.
  const attachManualTranslation = async (fileId, baseFileName, pdfFile, setDirectUploadsWithSave, setFinalResultsWithSave) => {
    if (!pdfFile) return;
    if (!/\.pdf$/i.test(pdfFile.name) && pdfFile.type !== 'application/pdf') {
      alert('Prevod mora biti PDF datoteka.');
      return;
    }

    // Name the stored translation after the document it belongs to, mirroring the
    // AI path's "_PREVOD" convention so both are recognizable in storage.
    const baseName = baseFileName || pdfFile.name;
    const dot = baseName.lastIndexOf('.');
    const translatedName = dot === -1
      ? `${baseName}_PREVOD.pdf`
      : `${baseName.slice(0, dot)}_PREVOD.pdf`;

    try {
      await saveFileToIndexedDB(translatedName, pdfFile);
    } catch (error) {
      console.error('Saving manual translation failed:', error);
      alert('Prevoda ni bilo mogoče shraniti.');
      return;
    }

    const apply = (file) =>
      (file.id || file.fileName) === fileId
        ? { ...file, translatedFileName: translatedName, translationTruncated: null, manualTranslation: true }
        : file;

    setFinalResultsWithSave(prev => prev.map(apply));
    setDirectUploadsWithSave(prev => prev.map(apply));
  };

  // Removes a document's translation (AI or manual). The blob is left in IndexedDB;
  // only the reference on the document is cleared.
  const removeTranslation = (fileId, setDirectUploadsWithSave, setFinalResultsWithSave) => {
    const clear = (file) =>
      (file.id || file.fileName) === fileId
        ? { ...file, translatedFileName: undefined, translationTruncated: null, manualTranslation: undefined }
        : file;
    setFinalResultsWithSave(prev => prev.map(clear));
    setDirectUploadsWithSave(prev => prev.map(clear));
  };

  // Opens a stored translation (a PDF Blob in IndexedDB) in a new browser tab.
  const previewTranslation = async (translatedFileName) => {
    try {
      const blob = await getFileFromIndexedDB(translatedFileName);
      if (!blob) { alert('Prevoda ni v shrambi.'); return; }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Revoke after the tab has had time to load it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Predogleda ni bilo mogoče odpreti.');
    }
  };

  return {
    files,
    ocrProgress,
    ocrProcessing,
    ocrResults,
    aiProgress,
    aiProcessing,
    aiLogs,
    password,
    isAuthenticated,
    authError,
    authLoading,
    handleLogout,
    isExtractingMetadata,
    metadataProgress,
    showMetadataModal,
    setPassword,
    setOcrResultsWithSave,
    handlePasswordSubmit,
    handleFileUpload,
    removeFile,
    removeAllFiles,
    pendingTranslations,
    handleDirectUploadToFolder,
    handleFolderDrop,
    startOCRProcessing,
    startAIProcessing,
    openMetadataExtractionModal,
    closeMetadataExtractionModal,
    extractMetadataForSelectedFiles,
    isTranslating,
    translationProgress,
    showTranslationModal,
    setShowTranslationModal,
    translateDocuments,
    previewTranslation,
    attachManualTranslation,
    removeTranslation,
  };
};
