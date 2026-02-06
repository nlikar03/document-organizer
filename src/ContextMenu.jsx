import React, { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

export const ContextMenu = ({ items }) => {
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded hover:bg-gray-100
             opacity-0 group-hover:opacity-100
             transition-opacity"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-6 w-44 bg-white border rounded-md shadow-lg z-50">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
