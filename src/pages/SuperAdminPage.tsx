import React, { useState } from 'react';
import {
  CompanyEntity,
  AuditItem,
  GlobalNotification,
  RegulatoryPipelineItem,
  PageId,
} from '../types';
import {
  mockRegulatoryPipeline,
  mockGlobalNotifications,
  mockAudits,
  mockEmailReminderTemplates,
} from '../data/rolesData';
import {
  ShieldAlert,
  Building2,
  Users,
  Send,
  Radio,
  FileCheck2,
  Database,
  Mail,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Newspaper,
} from 'lucide-react';
import { VeilleAdminPanel } from '../components/VeilleAdminPanel';
import { publishNotification } from '../services/notifications';

interface SuperAdminPageProps {
  companies: CompanyEntity[];
  onSelectCompanyAsAdmin: (companyId: string) => void;
  onNavigate: (page: PageId) => void;
  initialTab?: 'stats' | 'entreprises' | 'pipeline' | 'veille' | 'notifications' | 'audits' | 'emails' | 'schema';
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({
  companies,
  onSelectCompanyAsAdmin,
  onNavigate,
  initialTab = 'stats',
}) => {
  const [activeTab, setActiveTab] = useState<
    'stats' | 'entreprises' | 'pipeline' | 'veille' | 'notifications' | 'audits' | 'emails' | 'schema'
  >(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [companySearch, setCompanySearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'complet' | 'incomplet'>('all');

  // Pipeline state
  const [pipeline, setPipeline] = useState<RegulatoryPipelineItem[]>(mockRegulatoryPipeline);

  // Notifications state
  const [notifications, setNotifications] = useState<GlobalNotification[]>(mockGlobalNotifications);
  const [newNotifTitre, setNewNotifTitre] = useState('');
  const [newNotifContenu, setNewNotifContenu] = useState('');
  const [newNotifType, setNewNotifType] = useState<GlobalNotification['type']>('alerte');
  const [newNotifCible, setNewNotifCible] = useState<GlobalNotification['cible']>('tous');
  const [newNotifSecteur, setNewNotifSecteur] = useState('BTP');
  const [newNotifRegime, setNewNotifRegime] = useState('RSI');
  const [newNotifEntrepriseId, setNewNotifEntrepriseId] = useState('');
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Audits state
  const [audits] = useState<AuditItem[]>(mockAudits);

  const filteredCompanies = companies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.secteurActivite.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.regimeFiscal.toLowerCase().includes(companySearch.toLowerCase());

    if (!matchSearch) return false;
    if (companyFilter === 'complet') return c.profilComplet;
    if (companyFilter === 'incomplet') return !c.profilComplet;
    return true;
  });

  const totalCompaniesCount = 142; // Plateforme globale
  const averageCompliance = 87; // %
  const totalObligationsCount = 1240;
  const penalitesEviteesFcfa = 340_000_000;

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitre.trim() || !newNotifContenu.trim()) return;

    const newNotif: GlobalNotification = {
      id: `notif-${Date.now()}`,
      titre: newNotifTitre.trim(),
      contenu: newNotifContenu.trim(),
      type: newNotifType,
      cible: newNotifCible,
      secteurCible: newNotifCible === 'par_secteur' ? newNotifSecteur : undefined,
      regimeCible: newNotifCible === 'par_regime' ? newNotifRegime : undefined,
      entrepriseCible: newNotifCible === 'individuelle' ? newNotifEntrepriseId : undefined,
      envoyeParNom: 'Me. Aminata Diallo (Super Admin)',
      dateEnvoi: new Date().toISOString().replace('T', ' ').slice(0, 16),
      lu: false,
    };

    setNotifications([newNotif, ...notifications]);
    // Persistance Supabase (table notifications) quand une session existe.
    const uuidLike = /^[0-9a-f-]{36}$/i.test(newNotifEntrepriseId);
    publishNotification(
      {
        titre: newNotif.titre,
        contenu: newNotif.contenu,
        type: newNotifType === 'general' ? 'generale' : newNotifType,
        entreprise_id: newNotifCible === 'individuelle' && uuidLike ? newNotifEntrepriseId : null,
      },
      null
    ).catch(() => undefined);
    setNewNotifTitre('');
    setNewNotifContenu('');
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 3000);
  };

  const handleAdvancePipeline = (itemId: string) => {
    setPipeline((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          if (item.etape === 'J0_detection') {
            return { ...item, etape: 'J5_analyse_impact', statut: 'en_cours' };
          }
          if (item.etape === 'J5_analyse_impact') {
            return { ...item, etape: 'publication_officielle', statut: 'publie' };
          }
        }
        return item;
      })
    );
  };

  return (
    <div id="pageSuperAdmin" className="space-y-6">
      {/* Header Bannière Super Admin */}
      <div className="bg-[radial-gradient(120%_180%_at_15%_-20%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_45%),linear-gradient(135deg,#4C1D95_0%,#6D28D9_50%,#7C3AED_100%)] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-[#6D28D9]/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>NIVEAU 1 — SUPER ADMIN LEGAL FLOW</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white m-0">
              Console de Pilotage Plateforme & Veille Nationale
            </h1>
            <p className="text-xs text-white/80 m-0 max-w-2xl">
              Supervision globale de l’écosystème fiscal & social ivoirien, pipeline réglementaire J0→J+5, diffusion ciblée des alertes et gestion multi-tenants.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-center shrink-0">
            <div className="text-xs text-white/70 font-semibold uppercase tracking-wider">
              Entreprises sous surveillance
            </div>
            <div className="text-2xl font-black text-white">{totalCompaniesCount}</div>
            <div className="text-[10px] text-white/80 mt-0.5">Côte d'Ivoire (CGI 2026)</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#E2E8F0] pb-2 text-xs font-bold">
        {[
          { id: 'stats', label: 'Dashboard Global', icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { id: 'entreprises', label: `Entreprises (${companies.length})`, icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'pipeline', label: 'Pipeline Veille (J0→J+5)', icon: <Radio className="w-3.5 h-3.5" /> },
          { id: 'veille', label: 'Notes & Maintenance', icon: <Newspaper className="w-3.5 h-3.5" /> },
          { id: 'notifications', label: 'Diffusion Notifications', icon: <Send className="w-3.5 h-3.5" /> },
          { id: 'audits', label: 'Audits Transversaux', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
          { id: 'emails', label: 'Rappels J+3, J+7, J+15', icon: <Mail className="w-3.5 h-3.5" /> },
          { id: 'schema', label: 'Schéma Supabase & RLS', icon: <Database className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tabSuperAdmin-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: STATS GLOBALES */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Conformité Moyenne CI
              </div>
              <div className="text-2xl font-black text-[#15803D] mt-1">{averageCompliance}%</div>
              <div className="text-xs text-[#64748B] mt-0.5">+4.2 pts vs moyenne nationale</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Total Obligations Actives
              </div>
              <div className="text-2xl font-black text-[#1E293B] mt-1">{totalObligationsCount}</div>
              <div className="text-xs text-[#64748B] mt-0.5">DGI, CNPS, CMU, FDFP</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Pénalités Évitées
              </div>
              <div className="text-2xl font-black text-[#0284C7] mt-1">
                {(penalitesEviteesFcfa / 1_000_000).toFixed(0)}M FCFA
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">Grâce aux alertes précoces</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Dossiers Incomplets (Niv. 3)
              </div>
              <div className="text-2xl font-black text-[#D97706] mt-1">
                {companies.filter((c) => !c.profilComplet).length} entreprises
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">Relances automatiques actives</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Répartition Réglementaire par Régime Fiscal
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>RSI (Régime Simplifié - CA ≤ 150M FCFA)</span>
                    <span className="text-[#4F46A0]">58%</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#4F46A0] h-full rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>Régime du Réel Normal (RRN - CA &gt; 150M FCFA)</span>
                    <span className="text-[#0284C7]">28%</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#0284C7] h-full rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>RME (Régime Microentreprises)</span>
                    <span className="text-[#D97706]">14%</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#D97706] h-full rounded-full" style={{ width: '14%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Activité des Cabinets Partenaires (Niveau 2)
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#1E293B]">Cabinet Audit & Conseils CI</div>
                    <div className="text-[11px] text-[#64748B]">3 entreprises gérées · Abidjan Plateau</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    96% conformité
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#1E293B]">CGA Abidjan Lagunes</div>
                    <div className="text-[11px] text-[#64748B]">24 adhérents certifiés · Cocody</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEBF9] text-[#4F46A0] border border-[#D9DAF0]">
                    Partenaire Agréé
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENTREPRISES MULTI-TENANTS */}
      {activeTab === 'entreprises' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#94A3B8]" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Rechercher par nom, secteur, régime..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value as any)}
                className="text-xs font-semibold p-2 bg-white border border-[#CBD5E1] rounded-lg"
              >
                <option value="all">Toutes les entreprises</option>
                <option value="complet">Profil Complet uniquement</option>
                <option value="incomplet">Profil Incomplet (Niv. 3)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[#64748B] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Entreprise</th>
                  <th className="py-2.5 px-3">Forme & Secteur</th>
                  <th className="py-2.5 px-3">Régime Fiscal</th>
                  <th className="py-2.5 px-3">Statut Profil</th>
                  <th className="py-2.5 px-3">Conformité</th>
                  <th className="py-2.5 px-3 text-right">Action Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredCompanies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#1E293B]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#4F46A0]" />
                        <span>{comp.name}</span>
                      </div>
                      <div className="text-[10.5px] text-[#64748B] font-normal">
                        Gestionnaire : {comp.dossierManagerName || 'Non assigné'}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[#475569]">
                      <span className="font-semibold">{comp.formeJuridique || 'Non renseigné'}</span>
                      <div className="text-[10.5px] text-[#64748B]">{comp.secteurActivite}</div>
                    </td>

                    <td className="py-3 px-3 text-[#475569]">
                      {comp.regimeFiscal || <span className="text-[#DC2626]">Non défini</span>}
                    </td>

                    <td className="py-3 px-3">
                      {comp.profilComplet ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Complet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Incomplet (Mode TOUT)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-black text-[#1E293B]">{comp.scoreConformite || 75}%</span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          onSelectCompanyAsAdmin(comp.id);
                          onNavigate('dashboard');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] hover:underline cursor-pointer"
                      >
                        <span>Inspecter dossier</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PIPELINE DE VEILLE REGLEMENTAIRE (J0 -> J+5) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-4 text-xs text-[#6D28D9]">
            <strong>Pipeline Réglementaire Legal Flow :</strong> Toute modification légale (DGI, CNPS, CMU, OHADA) passe par un cycle rigoureux : <strong>J0 Détection</strong> (scraping & Journal Officiel) → <strong>J+5 Analyse d'impact</strong> (qualification sectorielle) → <strong>Publication officielle</strong> avec calcul des échéances.
          </div>

          <div className="space-y-3">
            {pipeline.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                      Source : {item.source} · Détecté le {item.dateDetection}
                    </span>
                    <h3 className="text-sm font-black text-[#1E293B] m-0">{item.titre}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        item.etape === 'publication_officielle'
                          ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                          : item.etape === 'J5_analyse_impact'
                          ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                          : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                      }`}
                    >
                      {item.etape === 'J0_detection'
                        ? '1. Étape J0 : Détection précoce'
                        : item.etape === 'J5_analyse_impact'
                        ? '2. Étape J+5 : Analyse d’impact'
                        : '3. Publié au Référentiel National'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#475569] m-0 leading-relaxed">{item.resume}</p>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-[#64748B]">
                    Secteurs ciblés : <strong className="text-[#1E293B]">{item.impactSecteur}</strong>
                  </span>

                  {item.etape !== 'publication_officielle' && (
                    <button
                      onClick={() => handleAdvancePipeline(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9] transition-colors cursor-pointer"
                    >
                      <span>
                        {item.etape === 'J0_detection' ? 'Passer en J+5 Analyse' : 'Publier officiellement'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: NOTES DE VEILLE + MAINTENANCE (CDC §3, §6.4) */}
      {activeTab === 'veille' && <VeilleAdminPanel userId={null} />}

      {/* TAB 4: DIFFUSION NOTIFICATIONS CIBLÉES */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Diffuser une Notification Ciblée (Super Admin)
              </h3>
              <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                Envoyez des alertes à tous, par secteur, par régime ou à une entreprise spécifique.
              </p>
            </div>

            {notifSuccess && (
              <div className="p-2.5 rounded-lg bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Notification diffusée avec succès sur la plateforme !
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1E293B] mb-1">Titre de l'alerte</label>
                <input
                  type="text"
                  value={newNotifTitre}
                  onChange={(e) => setNewNotifTitre(e.target.value)}
                  placeholder="Ex: Échéance exceptionnelle DGI reportée"
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1E293B] mb-1">Contenu explicatif</label>
                <textarea
                  rows={3}
                  value={newNotifContenu}
                  onChange={(e) => setNewNotifContenu(e.target.value)}
                  placeholder="Détaillez la prescription légale ou le rappel..."
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1">Type d'avis</label>
                  <select
                    value={newNotifType}
                    onChange={(e) => setNewNotifType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                  >
                    <option value="alerte">Alerte urgente</option>
                    <option value="rappel">Rappel déclaratif</option>
                    <option value="information">Information générale</option>
                    <option value="mise_a_jour">Mise à jour légale</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1E293B] mb-1">Cible</label>
                  <select
                    value={newNotifCible}
                    onChange={(e) => setNewNotifCible(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                  >
                    <option value="tous">Tous les utilisateurs</option>
                    <option value="par_secteur">Par secteur</option>
                    <option value="par_regime">Par régime fiscal</option>
                    <option value="individuelle">Individuelle (Entreprise)</option>
                  </select>
                </div>
              </div>

              {newNotifCible === 'par_secteur' && (
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1">Secteur cible</label>
                  <select
                    value={newNotifSecteur}
                    onChange={(e) => setNewNotifSecteur(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                  >
                    <option value="BTP">BTP & Construction</option>
                    <option value="Commerce">Commerce & Distribution</option>
                    <option value="Industrie">Industrie & Transformation</option>
                    <option value="Services">Services & Tertiaire</option>
                  </select>
                </div>
              )}

              {newNotifCible === 'par_regime' && (
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1">Régime fiscal cible</label>
                  <select
                    value={newNotifRegime}
                    onChange={(e) => setNewNotifRegime(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                  >
                    <option value="RSI">RSI (Régime Simplifié)</option>
                    <option value="Réel Normal">Réel Normal</option>
                    <option value="RME">RME (Microentreprises)</option>
                  </select>
                </div>
              )}

              {newNotifCible === 'individuelle' && (
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1">Sélectionner l'entreprise</label>
                  <select
                    value={newNotifEntrepriseId}
                    onChange={(e) => setNewNotifEntrepriseId(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold"
                    required
                  >
                    <option value="">-- Choisir une entreprise --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer la notification sur la plateforme</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Historique des Notifications Diffusées
              </h3>
            </div>

            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1E293B]">{n.titre}</span>
                    <span className="text-[10px] text-[#64748B]">{n.dateEnvoi}</span>
                  </div>
                  <p className="text-[#475569] m-0">{n.contenu}</p>
                  <div className="text-[10px] font-bold text-[#7C3AED]">
                    Cible : {n.cible} {n.secteurCible ? `(${n.secteurCible})` : ''} · Par {n.envoyeParNom}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDITS TRANSVERSAUX */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
              Rapports d'Audits Transversaux Effectués
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audits.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-[#4F46A0]">{a.dateAudit}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        a.statut === 'termine'
                          ? 'bg-[#ECFDF5] text-[#065F46]'
                          : 'bg-[#FFFBEB] text-[#92400E]'
                      }`}
                    >
                      {a.statut === 'termine' ? 'Certifié' : 'En cours'}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#1E293B] m-0">{a.entrepriseNom}</h4>
                  <div className="text-[11px] text-[#64748B]">Auditeur : {a.auditeurNom}</div>
                  <p className="text-xs text-[#475569] leading-relaxed pt-1">{a.notes}</p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#64748B]">Conformité : </span>
                    <strong className="text-[#15803D]">{a.scoreConformite}%</strong>
                  </div>
                  {a.rapportUrl ? (
                    <span className="text-[11px] font-bold text-[#4F46A0] hover:underline cursor-pointer">
                      Télécharger PDF
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#94A3B8]">Rapport en rédaction</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: RAPPELS EMAIL J+3, J+7, J+15 */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 text-xs text-[#92400E]">
            <strong>Séquence d'Emails Automatiques (Profil Incomplet Niveau 3) :</strong> Dès lors qu’un utilisateur s’inscrit avec l'onboarding minimal (Nom + Secteur uniquement), le cron de relance envoie automatiquement ces 3 rappels pour encourager la complétion des 5 critères obligatoires.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {mockEmailReminderTemplates.map((tpl, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#7C3AED] text-white">
                      Relance {tpl.delai}
                    </span>
                    <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                  </div>
                  <h4 className="text-xs font-black text-[#1E293B] m-0">{tpl.titre}</h4>
                  <div className="text-[11px] text-[#64748B] font-semibold">
                    Objet : <span className="text-[#1E293B]">{tpl.objet}</span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-[11px] text-[#334155] whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                    {tpl.contenu}
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-[#64748B] text-right">
                  Statut : Actif dans le worker de notification
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SCHEMA SUPABASE & RLS */}
      {activeTab === 'schema' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider m-0">
                Spécification Technique Supabase & Politiques RLS (PostgreSQL)
              </h3>
              <p className="text-[11px] text-[#64748B] m-0 mt-0.5">
                Tables, trigger automatique `profil_complet` et règles de sécurité par niveau.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              Prêt pour production Supabase
            </span>
          </div>

          <div className="bg-[#0F172A] text-[#E2E8F0] p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[500px] leading-relaxed">
            <pre>{`-- Architecture 3 Niveaux Legal Flow (Supabase)
-- 1. Table users (auth.users extension)
-- 2. Table entreprises (avec champ profil_complet calculé automatiquement)
-- 3. Table gestion_entreprise (multi-entreprises + switch actif)
-- 4. Table documents (liés à l'entreprise)
-- 5. Table notifications & notifications_lues (cibles par secteur/régime)
-- 6. Table audits (créés par Super Admin)
-- 7. Row Level Security (RLS) activée sur toutes les tables`}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
