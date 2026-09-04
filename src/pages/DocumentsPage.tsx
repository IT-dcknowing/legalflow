import React, { useState, useRef } from 'react';
import { Search, Download, UploadCloud, FileText, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentsPageProps {
  documents: DocumentItem[];
  onUploadDocument: (doc: DocumentItem) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  onUploadDocument,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [isDragging, setIsDragging] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Tous', 'Fiscal', 'Social', 'Juridique', 'Douanes'];

  const handleDownload = (doc: DocumentItem) => {
    const filename = doc.name;
    const content = `LEGAL FLOW - CONFORMITÉ FISCALE ET SOCIALE (CÔTE D'IVOIRE)\n\n` +
      `Document officiel : ${doc.name}\n` +
      `Catégorie : ${doc.category || 'Général'}\n` +
      `Date de mise à jour : ${doc.modifiedDate || doc.date || "Aujourd'hui"}\n` +
      `Taille : ${doc.size || doc.taille || '250 Ko'}\n` +
      `Entreprise : Établissements Koffi BTP SARL\n` +
      `NCC : 2104589 A · RCCM : CI-ABJ-2022-B-11409\n` +
      `Statut : Document certifié et indexé dans le registre de conformité.\n\n` +
      `-------------------------------------------------------------------------\n` +
      `Ce document est généré pour la traçabilité des déclarations DGI / CNPS / CMU.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(doc.id);
    setTimeout(() => setDownloadSuccess(null), 2200);
  };

  const processFile = (file: File) => {
    let cat: 'Fiscal' | 'Social' | 'Juridique' | 'Douanes' = 'Fiscal';
    const lower = file.name.toLowerCase();
    if (lower.includes('cnps') || lower.includes('cmu') || lower.includes('social') || lower.includes('salaire')) {
      cat = 'Social';
    } else if (lower.includes('statut') || lower.includes('rccm') || lower.includes('juridique')) {
      cat = 'Juridique';
    } else if (lower.includes('douane') || lower.includes('voc') || lower.includes('sydonia') || lower.includes('bsc')) {
      cat = 'Douanes';
    }

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
      : `${Math.max(1, Math.round(file.size / 1024))} Ko`;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: file.name,
      category: cat,
      modifiedDate: "Modifié à l'instant",
      size: sizeStr,
      meta: `${cat} · ${sizeStr} · Modifié aujourd'hui`,
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      taille: sizeStr,
      date: "Aujourd'hui",
    };
    onUploadDocument(newDoc);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        processFile(e.target.files[i]);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        processFile(e.dataTransfer.files[i]);
      }
    }
  };

  // Filter documents
  const filtered = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Group by category if "Tous" is selected, or keep single category
  const categoriesToDisplay = selectedCategory === 'Tous'
    ? ['Fiscal', 'Social', 'Juridique', 'Douanes']
    : [selectedCategory];

  return (
    <div id="pageDocuments" className="space-y-6">
      {/* Upload Drag & Drop Area matching Screenshot 4 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all bg-white ${
          isDragging
            ? 'border-[#4F46A0] bg-[#EDEBF9]/40 scale-[1.005]'
            : 'border-[#D9DAF0] hover:border-[#4F46A0]/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#171A2E] mb-1">
            Glissez-déposez vos fichiers ici
          </h3>
          <p className="text-xs sm:text-sm text-[#6B6F85] mb-4">
            PDF, JPG, PNG, XLSX — 10 Mo maximum par fichier
          </p>
          <button
            type="button"
            id="btnBrowseFiles"
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#4F46A0] hover:bg-[#3D3680] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
          >
            Parcourir mes fichiers
          </button>
        </div>
      </div>

      {/* Category Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#3D3680] text-white shadow-xs'
                    : 'bg-white text-[#6B6F85] hover:text-[#171A2E] hover:bg-[#F6F6FB] border border-[#E5E5F0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white border border-[#E5E5F0] rounded-xl px-3 py-1.5 w-full sm:w-64 shadow-xs">
          <Search className="w-4 h-4 text-[#6B6F85] shrink-0" />
          <input
            id="searchDocInput"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="border-none bg-transparent outline-none text-xs sm:text-sm w-full text-[#171A2E] placeholder-[#6B6F85]"
          />
        </div>
      </div>

      {/* Grouped Documents Sections matching Screenshot 4 */}
      <div className="space-y-6">
        {categoriesToDisplay.map((cat) => {
          const docsInCat = filtered.filter((d) => (d.category || 'Fiscal') === cat);
          if (docsInCat.length === 0) return null;

          return (
            <div key={cat} className="space-y-2.5">
              {/* Category Section Title */}
              <h4 className="text-xs font-black uppercase tracking-wider text-[#6B6F85] px-1">
                {cat}
              </h4>

              {/* Document rows */}
              <div className="bg-white border border-[#E5E5F0] rounded-xl divide-y divide-[#E5E5F0] overflow-hidden shadow-xs">
                {docsInCat.map((doc) => {
                  const isExcel = doc.name.endsWith('.xlsx') || doc.name.endsWith('.xls');
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#FDFDFF] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isExcel
                              ? 'bg-[#E6F4EA] text-[#137333]'
                              : 'bg-[#EDEBF9] text-[#4F46A0]'
                          }`}
                        >
                          {isExcel ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-[#171A2E] truncate">
                            {doc.name}
                          </div>
                          <div className="text-[11.5px] text-[#6B6F85] mt-0.5">
                            {doc.modifiedDate || doc.date || "Modifié récemment"} · {doc.size || doc.taille || "250 Ko"}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5F0] bg-white hover:bg-[#F6F6FB] text-xs font-bold text-[#20263A] transition-colors shrink-0 cursor-pointer shadow-2xs"
                      >
                        {downloadSuccess === doc.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#1F9254]" />
                            <span className="text-[#1F9254]">Téléchargé</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-[#6B6F85]" />
                            <span>Télécharger</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white border border-[#E5E5F0] rounded-xl p-8 text-center text-[#6B6F85] text-sm">
            Aucun document trouvé pour cette recherche ou catégorie.
          </div>
        )}
      </div>
    </div>
  );
};
