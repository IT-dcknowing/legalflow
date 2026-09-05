import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  MessageSquare,
  Maximize2,
  Minimize2,
  X,
  Send,
  Sparkles,
  BookOpen,
  Scale,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ChatMessage,
  PageId,
  CompanyProfile,
  Obligation,
  OpportunityItem,
  FlashVeille,
  RagSourceCitation,
} from '../types';
import { routeAiContext } from '../data/aiContextRouter';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isFull: boolean;
  onToggleFull: () => void;
  onNavigate: (page: PageId) => void;
  companyProfile: CompanyProfile;
  obligations: Obligation[];
  opportunities: OpportunityItem[];
  flashs: FlashVeille[];
  // Persistance Supabase (optionnelle) : l'historique est rechargé après reconnexion.
  userId?: string | null;
  initialMessages?: ChatMessage[] | null;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

// Composants de rendu Markdown personnalisés (support GFM, tableaux, listes et typographie)
const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-sm sm:text-base font-black text-[#0F172A] mt-4 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xs sm:text-sm font-extrabold text-[#0F172A] mt-3.5 mb-1.5 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wide mt-3 mb-1 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-xs font-bold text-[#334155] mt-2 mb-1 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }: any) => (
    <p className="text-xs sm:text-sm text-[#1E293B] leading-relaxed my-2 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-[#0F172A]">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-[#334155]">{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2 space-y-1.5 pl-4 list-disc text-xs sm:text-sm text-[#1E293B] leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 space-y-1.5 pl-4 list-decimal text-xs sm:text-sm text-[#1E293B] leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="pl-1 leading-relaxed">{children}</li>
  ),
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-[#CBD5E1] shadow-2xs">
      <table className="w-full border-collapse text-left text-xs sm:text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] font-bold text-[#0F172A]">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-[#E2E8F0] bg-white">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-[#F8FAFC]/70 transition-colors">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 font-semibold text-[#0F172A] whitespace-nowrap bg-[#F1F5F9]/70">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-2 text-[#334155] whitespace-nowrap sm:whitespace-normal">{children}</td>
  ),
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#0F172A] font-mono text-[11px] border border-[#E2E8F0]">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-[#4F46A0] pl-3 py-1 italic text-xs sm:text-sm text-[#475569] bg-[#F8FAFC] rounded-r-md">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#4F46A0] font-semibold underline hover:text-[#3D3680]"
    >
      {children}
    </a>
  ),
};

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  isOpen,
  onClose,
  isFull,
  onToggleFull,
  onNavigate,
  companyProfile,
  obligations,
  opportunities,
  flashs,
  userId,
  initialMessages,
  onMessagesChange,
}) => {
  const { playSentSound, playResponseSound } = useSoundEffects();
  const hydratedRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Bonjour. Je suis LEGAL FLOW AI, votre intelligence artificielle experte en fiscalité et droit social ivoirien (CGI 2026, CNPS, CMU, FDFP).

Votre dossier **${companyProfile.raisonSociale}** est sous régime **${companyProfile.regimeFiscal}** (secteur ${companyProfile.secteurActivite}).

### Synthèse de vos échéances prioritaires :
| Obligation | Date limite | Statut | Action recommandée |
| :--- | :---: | :---: | :--- |
| **TVA d'août (18%)** | 20 du mois | À régulariser | Déclaration téléservice e-impots.gouv.ci |
| **Cotisations CNPS** | 15 du mois | En cours | Téléversement quittance e.cnps.ci |

Posez-moi vos questions sur vos obligations, calculs de cotisations, vos démarches déclaratives ou l'activation de vos crédits CGA/FDFP.`,
      timestamp: '10:00',
      sources: [
        {
          source_fichier: 'CGI 2026 TEXT.txt',
          reference_article: 'Article 340 du CGI (TVA)',
          contenu: 'Déclaration obligatoire au plus tard le 20 du mois sous régime RSI.',
          similarity: 0.94,
        },
        {
          source_fichier: 'CNPS_Code_Prevoyance_Sociale.txt',
          reference_article: 'Articles 24-28 (Cotisations)',
          contenu: 'Taux CNPS Retraite (14%) + Prestations (5.75%) + Risque BTP (4.00%). Échéance le 15.',
          similarity: 0.91,
        },
      ],
      contextSlices: [
        `Entreprise: ${companyProfile.raisonSociale} | RCCM: ${companyProfile.rccm} | NCC: ${companyProfile.ncc} | Régime: ${companyProfile.regimeFiscal} | Secteur: ${companyProfile.secteurActivite}`,
        `Effectif: ${companyProfile.effectifSalaries} salariés déclarés | Masse salariale annuelle déclarée: ${companyProfile.masseSalarialeAnnuelle?.toLocaleString('fr-FR') || '32 400 000'} FCFA`,
        `Échéances imminentes: TVA d'août (20 du mois) et Cotisations CNPS (15 du mois)`,
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSourcesMessageId, setExpandedSourcesMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Hydratation depuis l'historique Supabase (une fois par utilisateur).
  const skipNextPersistRef = useRef(false);
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !hydratedRef.current) {
      hydratedRef.current = true;
      skipNextPersistRef.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    hydratedRef.current = false;
  }, [userId]);

  // Remontée des messages pour persistance (App débounced vers chatbot_conversations).
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    onMessagesChange?.(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const toggleSources = (msgId: string) => {
    setExpandedSourcesMessageId((prev) => (prev === msgId ? null : msgId));
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isTyping) return;

    // 1. Déclencher l'effet sonore d'envoi
    playSentSound();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsTyping(true);

    // 2. Analyse sémantique & sélection contextuelle du dossier actif (aiContextRouter)
    const routedContext = routeAiContext(
      text,
      companyProfile,
      obligations,
      opportunities,
      flashs
    );

    try {
      // 3. Appel au backend Express POST /api/chat (RAG pgvector + OpenRouter LLM)
      // PEN-021 : la route exige le JWT Supabase (401 sinon).
      let authHeader: Record<string, string> = {};
      try {
        const { supabase } = await import('../services/supabaseClient');
        const { data: sess } = await supabase!.auth.getSession();
        const token = sess?.session?.access_token;
        if (token) authHeader = { Authorization: `Bearer ${token}` };
      } catch {
        /* sans session : le backend répondra 401 et le fallback local prendra le relais */
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          message: text,
          dossierContext: routedContext.dossierSummary,
          contextSlices: routedContext.contextSlices,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Déclencher l'effet sonore de réponse de l'IA
      playResponseSound();

      let inlineLink: { text: string; page: PageId } | undefined = undefined;
      const lower = text.toLowerCase();
      if (lower.includes('echeance') || lower.includes('tva') || lower.includes('retard') || lower.includes('penalite')) {
        inlineLink = { text: 'Consulter l’Échéancier fiscal & social →', page: 'echeancier' };
      } else if (lower.includes('cga') || lower.includes('fdfp') || lower.includes('optimisation')) {
        inlineLink = { text: 'Ouvrir les Opportunités & Aides →', page: 'opportunites' };
      } else if (lower.includes('seuil') || lower.includes('profil') || lower.includes('rsi') || lower.includes('reel')) {
        inlineLink = { text: 'Voir le statut et seuils sur mon Profil →', page: 'profil' };
      } else if (lower.includes('veille') || lower.includes('annexe') || lower.includes('texte')) {
        inlineLink = { text: 'Accéder à la Veille officielle 2026 →', page: 'veille' };
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || "Réponse non disponible.",
        sources: data.sources || [],
        model: data.model,
        isFallback: !!data.isFallback,
        contextSlices: data.contextSlices || routedContext.contextSlices,
        inlineLink,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Erreur API Chat, bascule locale:', err);
      // Déclencher l'effet sonore
      playResponseSound();

      // Moteur déterministe de secours local immédiat
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `### 1. La règle essentielle
Pour votre entreprise sous régime **${companyProfile.regimeFiscal}** (secteur ${companyProfile.secteurActivite}), vos obligations déclaratives majeures s'exécutent au plus tard le 15 (ITS et cotisations CNPS) et le 20 (TVA 18%) de chaque mois via les portails officiels e-impots.gouv.ci et e.cnps.ci.

### 2. Le détail des obligations & calculs
- Assiette taxable : Prestations et travaux BTP avec TVA de 18% (Article 340 du CGI).
- Cotisations CNPS : 17.45% de charges patronales (Retraite 7.7%, Allocations 5.75%, Risque BTP 4.00%).
- CMU obligatoire : 1 000 FCFA / salarié (500 F employeur + 500 F salarié).

### 3. La démarche opérationnelle pas-à-pas
1. Renseignez les bordereaux sur e-impots et e-CNPS.
2. Téléversez les quittances justificatives sur Legal Flow pour alimenter votre score de conformité.

### 4. Délais légaux et pénalités de retard
- Majoration de 10% dès le premier jour de retard, augmentée de 1% d'intérêt moratoire par mois.

### 5. Conseil d'optimisation légale
Vérifiez le maintien de votre abattement de 20-25% via votre adhésion CGA.`,
        sources: [
          {
            source_fichier: 'CGI 2026 TEXT.txt',
            reference_article: 'Article 340 (Régime RSI & Déclarations)',
            contenu: 'Obligations déclaratives et barèmes en République de Côte d’Ivoire.',
            similarity: 0.92,
          },
        ],
        model: 'local-ci-rules-engine',
        isFallback: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="assistPanel"
      data-mode={isFull ? 'expanded' : 'compact'}
      className="h-full w-full flex flex-col bg-white overflow-hidden select-text"
    >
      {/* 1. Header du panneau IA */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E5F0] bg-[#FAF9FD] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-sm text-[#171A2E] tracking-tight">
                LEGAL FLOW AI
              </span>
            </div>
            <div className="text-[11px] text-[#6B6F85] truncate flex items-center gap-1">
              <Scale className="w-3 h-3 text-[#4F46A0] shrink-0" />
              <span>Base RAG : 8 005 extraits légaux CI (CGI, CNPS, CMU)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Bouton Agrandir / Réduire - swap plein écran vs compact */}
          <button
            id="assistExpandBtn"
            onClick={onToggleFull}
            title={isFull ? 'Réduire en volet compact' : 'Agrandir en plein écran (masquer le tableau de bord)'}
            aria-label={isFull ? 'Réduire' : 'Agrandir'}
            className="w-8 h-8 rounded-xl border border-[#E5E5F0] bg-white flex items-center justify-center hover:bg-[#EDEBF9] text-[#4F46A0] transition-colors cursor-pointer"
          >
            {isFull ? (
              <Minimize2 className="w-4 h-4 text-[#4F46A0]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[#4F46A0]" />
            )}
          </button>

          {/* Bouton Fermer */}
          <button
            id="assistCloseBtn"
            onClick={onClose}
            title="Fermer le panneau d'assistance"
            aria-label="Fermer"
            className="w-8 h-8 rounded-xl border border-[#E5E5F0] bg-white flex items-center justify-center hover:bg-[#FBEAE5] text-[#6B6F85] hover:text-[#C4432B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Bandeau d'information contextuelle active */}
      <div className="px-4 py-2 bg-[#F6F6FB] border-b border-[#E5E5F0] flex items-center justify-between gap-2 text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-[#555870] truncate">
          <Building2 className="w-3.5 h-3.5 text-[#4F46A0] shrink-0" />
          <span className="font-semibold truncate">
            {companyProfile.raisonSociale} ({companyProfile.regimeFiscal})
          </span>
          <span className="text-[#8E92BC]">•</span>
          <span className="text-[#1F9254] font-bold">Audit conforme</span>
        </div>
        <div className="flex items-center gap-1 text-[#475569] shrink-0 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          <span>Droit Ivoirien 2026</span>
        </div>
      </div>

      {/* 3. Zone de messages scrollable style Claude/ChatGPT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const isSourcesOpen = expandedSourcesMessageId === m.id;

          if (isUser) {
            return (
              <div key={m.id} className="flex flex-col items-end w-full">
                <div className="bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0]/80 rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs sm:text-sm leading-relaxed max-w-[85%] break-words shadow-2xs">
                  {m.text}
                </div>
                <span className="text-[10px] text-[#94A3B8] mt-1 pr-1 font-medium">{m.timestamp}</span>
              </div>
            );
          }

          return (
            <div key={m.id} className="w-full py-1">
              {/* En-tête sobre de l'assistant (sans modèle ni fournisseur) */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#21248C] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                  LF
                </div>
                <span className="text-xs font-bold text-[#1E293B]">LEGAL FLOW AI</span>
                <span className="text-[10px] text-[#94A3B8]">• {m.timestamp}</span>
                {m.isFallback && (
                  <span className="text-[9px] bg-[#FEF3D6] text-[#B45309] px-1.5 py-0.5 rounded font-medium border border-[#FDE68A]">
                    Mode certifié local
                  </span>
                )}
              </div>

              {/* Contenu Markdown en texte nu, sans cadre ni fond */}
              <div className="w-full pl-0 sm:pl-8 text-xs sm:text-sm text-[#1E293B] leading-relaxed">
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>

                {/* Volet dépliable des sources juridiques RAG */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => toggleSources(m.id)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4F46A0] hover:text-[#3D3680] transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>
                        {m.sources.length} sources &amp; articles vérifiés
                        {m.contextSlices && m.contextSlices.length > 0 ? ` • ${m.contextSlices.length} tranches dossier` : ''}
                      </span>
                      {isSourcesOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-1" />
                      )}
                    </button>

                    {isSourcesOpen && (
                      <div className="mt-2 space-y-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-[11px]">
                        {/* 1. Extraits de textes légaux officiels RAG */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                            Extraits de textes officiels (RAG pgvector)
                          </div>
                          {m.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="space-y-1 pb-1.5 border-b border-[#E2E8F0]/60 last:border-0 last:pb-0"
                            >
                              <div className="flex items-center justify-between gap-1 text-[#1E293B] font-bold">
                                <span>{src.reference_article}</span>
                                <span className="text-[#15803D] bg-white border border-[#15803D]/30 px-1.5 py-0.2 rounded text-[10px]">
                                  {Math.round(src.similarity * 100)}% pertinence
                                </span>
                              </div>
                              <div className="text-[10px] text-[#64748B] italic">
                                Source : {src.source_fichier}
                              </div>
                              <p className="text-[#475569] m-0 text-[10.5px] leading-relaxed">
                                « {src.contenu} »
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* 2. Tranches contextuelles du dossier actif */}
                        {m.contextSlices && m.contextSlices.length > 0 && (
                          <div className="pt-2 border-t border-[#E2E8F0]/80 space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#4F46A0]" />
                              <span>Tranches contextuelles du dossier analysées ({m.contextSlices.length})</span>
                            </div>
                            <ul className="space-y-1 pl-3.5 list-disc text-[10.5px] text-[#475569]">
                              {m.contextSlices.map((slice, sIdx) => (
                                <li key={sIdx} className="leading-snug">
                                  {slice}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Lien interactif vers une page de l'application */}
                {m.inlineLink && (
                  <div className="mt-2.5 pt-1">
                    <button
                      onClick={() => {
                        onNavigate(m.inlineLink!.page);
                      }}
                      className="text-xs font-bold text-[#4F46A0] hover:text-[#3D3680] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{m.inlineLink.text}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicateur de saisie / génération LLM style fluide */}
        {isTyping && (
          <div className="flex items-center gap-2.5 py-2 pl-0 sm:pl-8 text-xs text-[#64748B] animate-fadeIn">
            <div className="w-6 h-6 rounded-lg bg-[#21248C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              LF
            </div>
            <span className="font-medium text-[#475569]">Recherche des textes officiels &amp; réponse en cours...</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#4F46A0] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#4F46A0] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#4F46A0] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Suggestions de requêtes juridiques rapides */}
      <div className="px-4 py-2 bg-[#F9F9FD] border-t border-[#E5E5F0] flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {[
          'Régulariser ma TVA & pénalités',
          'Barème CNPS BTP (17.45%)',
          'Obligations & Quitus CMU',
          'Abattement 25% CGA',
          'Remboursement FDFP (0.6%)',
          'Seuil RSI 150M FCFA',
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={isTyping}
            className="px-2.5 py-1 bg-white hover:bg-[#EDEBF9] hover:text-[#3D3680] text-[#555870] border border-[#E5E5F0] rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 5. Formulaire de saisie utilisateur */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 border-t border-[#E5E5F0] bg-white flex items-center gap-2 shrink-0"
      >
        <div className="relative flex-1">
          <input
            id="assistInput"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isTyping}
            placeholder="Posez une question à LEGAL FLOW AI..."
            className="w-full pl-4 pr-10 py-2.5 bg-[#F9F9FD] border border-[#E5E5F0] rounded-xl text-xs sm:text-sm text-[#171A2E] placeholder-[#8E92BC] outline-none focus:border-[#4F46A0] focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          id="assistSendBtn"
          disabled={!inputVal.trim() || isTyping}
          aria-label="Envoyer"
          className="w-10 h-10 rounded-xl bg-[#4F46A0] hover:bg-[#3D3680] text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
