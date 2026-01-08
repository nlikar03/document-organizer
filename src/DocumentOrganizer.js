import React, { useState } from 'react';
import { Upload, FolderTree, FileText, CheckCircle, Plus, Trash2, ChevronRight, ChevronDown, Loader2, Edit2, Scan, Brain, Download } from 'lucide-react';

const defaultStructure = [
  { id: '0', name: '0 PODATKI O POGODBI', level: 0, expanded: false },
  { id: '1', name: 'I. GRADBENA DELA', level: 0, expanded: false },
  { id: '1.1', name: '01 BETONSKA DELA', level: 1, expanded: false },
  { id: '1.2', name: '02 ZIDARSKA DELA', level: 1, expanded: false },
  { id: '2', name: 'II. PRIPRAVLJALNA DELA', level: 0, expanded: false },
  { id: '3', name: 'III. INŠTALACIJE', level: 0, expanded: false },
  { id: '3.1', name: '01 STROJNE INSTALACIJE', level: 1, expanded: false },
  { id: '3.1.1', name: '01 OGREVANJE IN HLAJENJE', level: 2, expanded: false },
  { id: '3.1.2', name: '02 ŠPRINKLER INŠTALACIJA', level: 2, expanded: false },
  { id: '3.1.3', name: '03 VODOVOD', level: 2, expanded: false },
  { id: '3.1.4', name: '04 PREZRAČEVANJE', level: 2, expanded: false },
  { id: '3.1.5', name: '05 PLINI', level: 2, expanded: false },
  { id: '3.1.6', name: '06 CEVNA POŠTA', level: 2, expanded: false },
  { id: '3.2', name: '02 ELEKTRO INSTALACIJE', level: 1, expanded: false },
  { id: '3.2.1', name: '01 INŠTALACIJSKI MATERIAL', level: 2, expanded: false },
  { id: '3.2.2', name: '02 SVETILKE SPLOŠNE RAZSVETLJAVE', level: 2, expanded: false },
  { id: '3.2.3', name: '03 SVETILKE VARNOSTNE RAZSVETLJAVE', level: 2, expanded: false },
  { id: '3.2.4', name: '04 RAZDELILNIKI', level: 2, expanded: false },
  { id: '4', name: 'IV. ZAKLJUČNA GRADBENA DELA', level: 0, expanded: false },
  { id: '4.1', name: '01 OKNA', level: 1, expanded: false },
  { id: '4.2', name: '02 OPREMA', level: 1, expanded: false },
  { id: '4.2.1', name: '01 MEDICINSKA OPREMA', level: 2, expanded: false },
  { id: '4.2.2', name: '02 POHIŠTVENA OPREMA', level: 2, expanded: false },
  { id: '4.2.3', name: '03 TIPSKA OPREMA', level: 2, expanded: false },
  { id: '4.3', name: '03 SLIKOPLESKARSKA DELA', level: 1, expanded: false },
  { id: '4.4', name: '04 SUHOMONTAŽNA DELA', level: 1, expanded: false },
  { id: '4.5', name: '05 TLAKARSKA DELA', level: 1, expanded: false },
  { id: '4.6', name: '06 VRATA', level: 1, expanded: false },
  { id: '4.7', name: '07 KLJUČAVNIČARSKA DELA', level: 1, expanded: false },
  { id: '5', name: 'V. KROVSTVO IN DRUGA SPEC. GRADBENA DELA', level: 0, expanded: false },
  { id: '6', name: 'VI. IZKAZI IN POROČILA', level: 0, expanded: false },
  { id: '6.1', name: '01 GRADBENIŠTVO', level: 1, expanded: false },
  { id: '6.2', name: '02 ELEKTRO INŠTALACIJE', level: 1, expanded: false },
  { id: '6.3', name: '03 STROJNE INŠTALACIJE', level: 1, expanded: false },
  { id: '6.4', name: '04 MEDICINSKA OPREMA', level: 1, expanded: false },
  { id: '6.5', name: '05 ČISTI PROSTORI', level: 1, expanded: false },
  { id: '7', name: 'VII. NAVODILA ZA UPORABO', level: 0, expanded: false },
  { id: '7.1', name: '01 GRADBENIŠTVO', level: 1, expanded: false },
  { id: '7.2', name: '02 ELEKTRO INŠTALACIJE', level: 1, expanded: false },
  { id: '7.3', name: '03 STROJNE INŠTALACIJE', level: 1, expanded: false },
  { id: '7.4', name: '04 OPREMA', level: 1, expanded: false },
  { id: '7.4.1', name: '01 MEDICINSKA OPREMA', level: 2, expanded: false },
  { id: '7.4.2', name: '02 POHIŠTVENA OPREMA', level: 2, expanded: false },
  { id: '7.4.3', name: '03 TIPSKA OPREMA', level: 2, expanded: false },
];

export default function DocumentOrganizer() {
  const [folders, setFolders] = useState(defaultStructure);
  const [files, setFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);
  const [finalResults, setFinalResults] = useState([]);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const toggleFolder = (id) => {
    setFolders(folders.map(f => {
      if (f.id === id) return { ...f, expanded: !f.expanded };
      if (f.id.startsWith(id + '.')) return { ...f, expanded: false };
      return f;
    }));
  };

  const addFolder = (parentId, level) => {
    const newId = parentId === 'root' ? Date.now().toString() : `${parentId}.${Date.now()}`;
    const newFolder = { id: newId, name: 'Nova Mapa', level: level, expanded: false };
    
    if (parentId === 'root') {
      setFolders([...folders, newFolder]);
    } else {
      const parentIndex = folders.findIndex(f => f.id === parentId);
      const newFolders = [...folders];
      let insertIndex = parentIndex + 1;
      while (insertIndex < newFolders.length && newFolders[insertIndex].id.startsWith(parentId + '.')) {
        insertIndex++;
      }
      newFolders.splice(insertIndex, 0, newFolder);
      setFolders(newFolders);
    }
    
    setEditingId(newId);
    setEditingName('Nova Mapa');
  };

  const deleteFolder = (id) => {
    setFolders(folders.filter(f => f.id !== id && !f.id.startsWith(id + '.')));
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id) => {
    setFolders(folders.map(f => f.id === id ? { ...f, name: editingName } : f));
    setEditingId(null);
    setEditingName('');
  };

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    const allFiles = [...files, ...newFiles];
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (allFiles.length > 150) {
      alert('Maksimalno število datotek je 150 na enkrat.');
      return;
    }
    
    if (totalSize > 150 * 1024 * 1024) {
      alert('Skupna velikost datotek presega 150MB.');
      return;
    }
    
    setFiles(allFiles);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };
  
  const getFullPath = (id) => {
    const parts = id.split(".");
    let path = [];
    for (let i = 0; i < parts.length; i++) {
      const partialId = parts.slice(0, i + 1).join(".");
      const folder = folders.find(f => f.id === partialId);
      if (folder) path.push(folder.name);
    }
    return path.join(" → ");
  };
  
  // Generate document code like III.01.04.027
  const generateDocCode = (folderId) => {
    const parts = folderId.split('.');
    const codes = parts.map((_, idx) => {
      const currentId = parts.slice(0, idx + 1).join('.');
      const f = folders.find(x => x.id === currentId);
      if (!f) return '';
      
      // For level 0, extract Roman numerals (I, II, III, IV, etc.)
      if (idx === 0) {
        const romanMatch = f.name.match(/^([IVXLCDM]+)\./);
        if (romanMatch) return romanMatch[1];
      }
      
      // For other levels, extract the leading number (01, 02, 03, etc.)
      const match = f.name.match(/^(\d+)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    return codes.join('.');
  };

  const isChildVisible = (folder) => {
    if (folder.level === 0) return true;
    const parentId = folder.id.split('.').slice(0, -1).join('.');
    const parent = folders.find(f => f.id === parentId);
    if (!parent) return true;
    if (!parent.expanded) return false;
    return isChildVisible(parent);
  };

  const startOCRProcessing = async () => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrResults([]);
    setCurrentStep(3);

    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      //http://localhost:8000 ce ces dat nzaj
      try {
        const response = await fetch('https://document-organizer-backend-0aje.onrender.com/api/ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('OCR Failed');

        const data = await response.json();
        results.push({
          fileName: data.fileName,
          extractedText: data.text || "No text found.",
          originalFile: file
        });
      } catch (error) {
        console.error(error);
        results.push({
          fileName: file.name,
          extractedText: "Error during OCR processing.",
          originalFile: file
        });
      }
      
      setOcrResults([...results]);
      setOcrProgress(((i + 1) / files.length) * 100);
    }

    setOcrProcessing(false);
  };

  const startAIProcessing = async () => {
    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);
    setFinalResults([]);
    setCurrentStep(4);

    const results = [];
    const logs = [];
    const folderCounts = {};

    logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: 'AI proces začet (GPT-5-mini)...' });
    setAiLogs([...logs]);

    for (let i = 0; i < ocrResults.length; i++) {
      const result = ocrResults[i];
      
      logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: `Analiziram: ${result.fileName}` });
      setAiLogs([...logs]);
      
      try {
        const response = await fetch('https://document-organizer-backend-0aje.onrender.com/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: result.extractedText,
            structure: folders
          }),
        });

        if (!response.ok) throw new Error('AI Failed');

        const aiResponse = await response.json();
        const folderId = aiResponse.suggestedFolder.id;
        
        // Increment file count for this folder
        folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
        const fileNumber = folderCounts[folderId];
        
        // Generate document code (e.g., III.2.01.027)
        const docCode = generateDocCode(folderId) + '.' + String(fileNumber).padStart(3, '0');
        
        logs.push({ 
          time: new Date().toLocaleTimeString('sl-SI'), 
          message: `✓ ${result.fileName} → ${docCode}`,
          success: true 
        });

        results.push({
        ...result,
        suggestedFolder: aiResponse.suggestedFolder,
        fileNumber: fileNumber,
        docCode: docCode,
        documentTitle: aiResponse.documentTitle || "",
        issuer: aiResponse.issuer || "",
        documentNumber: aiResponse.documentNumber || "",
        date: aiResponse.date || ""
      });
      } catch (error) {
        logs.push({ 
          time: new Date().toLocaleTimeString('sl-SI'), 
          message: `❌ Napaka pri ${result.fileName}`,
          success: false 
        });
        
        results.push({
          ...result,
          suggestedFolder: { id: folders[0].id, name: folders[0].name, fullPath: folders[0].name },
          fileNumber: 1,
          docCode: '0.001'
        });
      }

      setAiLogs([...logs]);
      setFinalResults([...results]);
      setAiProgress(((i + 1) / ocrResults.length) * 100);
    }

    logs.push({ time: new Date().toLocaleTimeString('sl-SI'), message: '✓ AI proces zaključen!', success: true });
    setAiLogs([...logs]);
    setAiProcessing(false);
  };

  const downloadZip = async () => {
    setIsDownloading(true);
    
    try {
      const formData = new FormData();
      
      // Add all original files
      finalResults.forEach(result => {
        formData.append('files', result.originalFile);
      });
      
      // Add metadata as a JSON blob/file
      const fileMapping = {};
      finalResults.forEach(result => {
        fileMapping[result.fileName] = {
          folderId: result.suggestedFolder.id,
          fileNumber: result.fileNumber,
          docCode: result.docCode
        };
      });
      
      const metadataObj = {
        structure: folders,
        fileMapping: fileMapping
      };
      
      const metadataBlob = new Blob([JSON.stringify(metadataObj)], { type: 'application/json' });
      formData.append('metadata', metadataBlob, 'metadata.json');
      
      const response = await fetch('https://document-organizer-backend-0aje.onrender.com/api/generate-zip', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ZIP generation failed: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DZO_Dokumenti.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Prenos ZIP datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadExcel = async () => {
    setIsDownloadingExcel(true);
    
    try {
      const response = await fetch('https://document-organizer-backend-0aje.onrender.com/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: finalResults,
          structure: folders
        }),
      });
      
      if (!response.ok) throw new Error('Excel generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DZO_Dokumenti_Seznam.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Excel download failed:', error);
      alert(`Prenos Excel datoteke ni uspel: ${error.message}`);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setOcrResults([]);
    setFinalResults([]);
    setAiLogs([]);
    setOcrProgress(0);
    setAiProgress(0);
    setCurrentStep(1);
  };

  const renderFolder = (folder) => {
    if (!isChildVisible(folder)) return null;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FolderTree className="text-indigo-600" size={40} />
            Organizator Dokumentov DZO
          </h1>
          <p className="text-gray-600 mb-8">AI klasifikacija dokumentov z OCR tehnologijo</p>

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
                <p className="text-sm text-gray-500 mt-3">PDF, PNG, JPG, JPEG do 10MB</p>
              </div>

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
                      <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono font-bold">{result.docCode}</span>
                        <CheckCircle size={20} className="text-green-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg">
                      <span className="text-purple-600 text-2xl">📁</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-semibold">Predlagana kategorija:</p>
                        <p className="text-sm font-bold text-purple-700">{getFullPath(result.suggestedFolder.id)}</p>
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
                          const folderPath = getFullPath(r.suggestedFolder.id);
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
                    onClick={downloadZip}
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
                        Prenesi ZIP z Organiziranimi Dokumenti
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadExcel}
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
                    🔄 Začni Znova
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>💡 Sistem uporablja OCR tehnologijo in AI za avtomatsko kategorizacijo dokumentov</p>
        </div>
      </div>
    </div>
  );
}