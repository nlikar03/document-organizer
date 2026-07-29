// Maps DZO modal fields to rows in the "VNOS PODATKOV" sheet (column D = the value).
// The 5A / 5B sheets reference those same cells via Excel formulas, so filling column
// D here flows through to every sheet exactly like the original workbook.
//
// Row numbers come from the "VNOS PODATKOV" sheet in DZO_i_obrazci.xlsm.
export const DZO_STORAGE_KEY = 'dzoFormData';

// Grouped for the modal UI. `row` is the target row in VNOS PODATKOV (col D).
export const DZO_SECTIONS = [
  {
    title: 'Investitor',
    fields: [
      { key: 'investitor1Naziv', row: 17, label: 'Investitor 1 – ime / naziv družbe' },
      { key: 'investitor1Naslov', row: 18, label: 'Investitor 1 – naslov / sedež' },
      { key: 'investitor2Naziv', row: 20, label: 'Investitor 2 – ime / naziv družbe' },
      { key: 'investitor2Naslov', row: 21, label: 'Investitor 2 – naslov / sedež' },
    ],
  },
  {
    title: 'Projektant',
    fields: [
      { key: 'projektantNaziv', row: 28, label: 'Projektant (naziv družbe)' },
      { key: 'projektantNaslov', row: 29, label: 'Poslovni naslov družbe' },
      { key: 'projektantOdgovorna', row: 30, label: 'Odgovorna oseba projektanta' },
      { key: 'izdelovalecVMNaziv', row: 32, label: 'Izdelovalec vodilne mape – ime / naziv' },
      { key: 'izdelovalecVMNaslov', row: 33, label: 'Izdelovalec vodilne mape – naslov' },
    ],
  },
  {
    title: 'Nadzornik',
    fields: [
      { key: 'nadzornikNaziv', row: 39, label: 'Naziv družbe (nadzornik)' },
      { key: 'nadzornikNaslov', row: 40, label: 'Poslovni naslov družbe' },
      { key: 'nadzornikDavcna', row: 41, label: 'Davčna številka' },
      { key: 'nadzornikOdgovorna', row: 42, label: 'Odgovorna oseba nadzornika' },
      { key: 'vodjaNadzora', row: 44, label: 'Vodja nadzora' },
      { key: 'vodjaNadzoraIzobrazba', row: 45, label: 'Strokovna izobrazba' },
      { key: 'vodjaNadzoraId', row: 46, label: 'Identifikacijska številka' },
    ],
  },
  {
    title: 'Izvajalec in vodja gradnje',
    fields: [
      { key: 'izvajalecStoritev', row: 58, label: 'Prevzeta storitev (po pogodbi)' },
      { key: 'izvajalecNaziv', row: 60, label: 'Naziv družbe (izvajalec)' },
      { key: 'izvajalecNaslov', row: 61, label: 'Poslovni naslov družbe' },
      { key: 'izvajalecDavcna', row: 62, label: 'Davčna številka' },
      { key: 'izvajalecOdgovorna', row: 63, label: 'Odgovorna oseba izvajalca' },
      { key: 'vodjaGradnje', row: 65, label: 'Vodja gradnje' },
      { key: 'vodjaGradnjeIzobrazba', row: 66, label: 'Strokovna izobrazba' },
      { key: 'vodjaGradnjeId', row: 67, label: 'Identifikacijska številka' },
      { key: 'vodjaDel', row: 69, label: 'Vodja del pri gradnji' },
    ],
  },
  {
    title: 'Projektna dokumentacija',
    fields: [
      { key: 'vrstaProjektne', row: 73, label: 'Vrsta projektne dokumentacije' },
      { key: 'stevilkaProjekta', row: 74, label: 'Številka projekta' },
      { key: 'datumProjekta', row: 75, label: 'Datum izdelave', type: 'date' },
    ],
  },
  {
    title: 'Gradnja',
    fields: [
      { key: 'nazivGradnje', row: 79, label: 'Naziv gradnje' },
    ],
  },
  {
    title: 'Gradbeno dovoljenje',
    fields: [
      { key: 'gdOrgan', row: 90, label: 'Navedba organa' },
      { key: 'gdStevilka', row: 91, label: 'Številka dovoljenja' },
      { key: 'gdDatum', row: 92, label: 'Datum dovoljenja', type: 'date' },
      { key: 'gdDokoncnost', row: 93, label: 'Dokončnost' },
      { key: 'gdPravnomocnost', row: 94, label: 'Pravnomočnost' },
    ],
  },
  {
    title: 'Dokazilo o zanesljivosti',
    fields: [
      { key: 'stevilkaDokazila', row: 105, label: 'Številka dokazila o zanesljivosti' },
      { key: 'datumDokazila', row: 106, label: 'Datum izdelave', type: 'date' },
      { key: 'izdelovalecDokazila', row: 107, label: 'Izdelovalec dokazila' },
    ],
  },
];

export const DZO_FIELDS = DZO_SECTIONS.flatMap(s => s.fields);
export const DZO_FIELD_KEYS = DZO_FIELDS.map(f => f.key);

// { rowNumber: value } for every filled field — used to inject into VNOS PODATKOV col D.
export const dzoValuesByRow = (data) => {
  const out = {};
  for (const f of DZO_FIELDS) {
    const v = data?.[f.key];
    if (v !== undefined && v !== '') out[f.row] = v;
  }
  return out;
};

const emptyData = () => Object.fromEntries(DZO_FIELD_KEYS.map(k => [k, '']));

export const loadDzoData = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DZO_STORAGE_KEY) || '{}');
    return { ...emptyData(), ...saved };
  } catch {
    return emptyData();
  }
};

export const emptyDzoData = emptyData;
