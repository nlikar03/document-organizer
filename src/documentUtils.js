export const defaultStructure = [
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

export const getFullPath = (id, folders) => {
  const parts = id.split(".");
  let path = [];
  for (let i = 0; i < parts.length; i++) {
    const partialId = parts.slice(0, i + 1).join(".");
    const folder = folders.find(f => f.id === partialId);
    if (folder) path.push(folder.name);
  }
  return path.join(" → ");
};

export const generateDocCode = (folderId, folders) => {
  const parts = folderId.split('.');
  const codes = parts.map((_, idx) => {
    const currentId = parts.slice(0, idx + 1).join('.');
    const f = folders.find(x => x.id === currentId);
    if (!f) return '';
    
    if (idx === 0) {
      const romanMatch = f.name.match(/^([IVXLCDM]+)\./);
      if (romanMatch) return romanMatch[1];
    }
    
    const match = f.name.match(/^(\d+)/);
    return match ? match[1] : '';
  }).filter(Boolean);
  
  return codes.join('.');
};

export const isChildVisible = (folder, folders) => {
  if (folder.level === 0) return true;
  const parentId = folder.id.split('.').slice(0, -1).join('.');
  const parent = folders.find(f => f.id === parentId);
  if (!parent) return true;
  if (!parent.expanded) return false;
  return isChildVisible(parent, folders);
};