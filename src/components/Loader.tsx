import React from 'react';

/** Loader de boot aux couleurs Legal Flow (PEN-031 UI-003). */
export const Loader: React.FC<{ label?: string }> = ({ label = 'Chargement…' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F6F6FB]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#EDEBF9]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#4F46A0] animate-spin" />
      </div>
      <div className="text-sm font-bold text-[#4F46A0] animate-pulse">{label}</div>
    </div>
  );
};
