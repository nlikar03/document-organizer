import React from 'react';
import { X, Save } from 'lucide-react';
import { DZO_SECTIONS, DZO_FIELD_KEYS, DZO_STORAGE_KEY, loadDzoData, emptyDzoData } from './dzoFields';

// Modal for the header data of the DZO forms (5A / 5B / VNOS PODATKOV). Every field
// is optional and may be left blank. The last entered values are remembered in
// localStorage and suggested next time. Field definitions live in dzoFields.js so the
// Excel export and this form stay in sync.
export { DZO_STORAGE_KEY, loadDzoData };

export const DzoDataModal = ({ isOpen, onClose, onSaved }) => {
  const [data, setData] = React.useState(emptyDzoData);

  React.useEffect(() => {
    if (isOpen) setData(loadDzoData());
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const save = () => {
    const clean = Object.fromEntries(DZO_FIELD_KEYS.map(k => [k, data[k] ?? '']));
    localStorage.setItem(DZO_STORAGE_KEY, JSON.stringify(clean));
    onSaved?.(clean);
    onClose();
  };

  const clearAll = () => setData(emptyDzoData());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Podatki za obrazce DZO</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Vsa polja so neobvezna. Zadnji vnos se shrani in samodejno predlaga naslednjič.
              Podatki se prenesejo v liste VNOS PODATKOV, 5A DZO VM in 5B DZO.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">×</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {DZO_SECTIONS.map(section => (
            <div key={section.title}>
              <h4 className="font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-100">{section.title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map(field => (
                  <label key={field.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-600">{field.label}</span>
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={data[field.key] ?? ''}
                      onChange={e => setField(field.key, e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t flex items-center justify-between flex-shrink-0">
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={16} />
            Počisti vsa polja
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Prekliči
            </button>
            <button
              onClick={save}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Save size={16} />
              Shrani
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
