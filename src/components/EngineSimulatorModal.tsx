import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, Users, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PayrollTaxEngine } from '../services/payrollTaxEngine';
import { ComplianceScoreEngine } from '../services/complianceScoreEngine';
import { Obligation } from '../types';

interface EngineSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentObligations: Obligation[];
}

export const EngineSimulatorModal: React.FC<EngineSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentObligations,
}) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'compliance'>('payroll');

  // Payroll simulator state
  const [mode, setMode] = useState<'employee' | 'company'>('company');
  const [salaireBrut, setSalaireBrut] = useState(350_000);
  const [secteur, setSecteur] = useState<'btp' | 'commerce' | 'industrie' | 'services'>('btp');
  const [parts, setParts] = useState(2.0);
  const [masseSalariale, setMasseSalariale] = useState(4_000_000);
  const [effectif, setEffectif] = useState(14);
  const [cmuAffilies, setCmuAffilies] = useState(12);

  if (!isOpen) return null;

  const empResult = PayrollTaxEngine.calculateEmployee(salaireBrut, secteur, parts, true);
  const compResult = PayrollTaxEngine.calculateCompany(masseSalariale, effectif, secteur, cmuAffilies);
  const scoreReport = ComplianceScoreEngine.compute(currentObligations);

  return (
    <div
      id="engineSimulatorOverlay"
      className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[800px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-[20px_24px] border-b border-[#E5E5F0] bg-[#FAF9FD] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#EDEBF9] text-[#4F46A0] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="m-0 text-[17px] font-extrabold text-[#171A2E]">
                Moteurs Métiers Ivoiriens (PHP 8.3 & React)
              </h3>
              <p className="m-0 text-[12px] text-[#6B6F85]">
                Simulateurs officiels : PayrollTaxEngine & ComplianceScoreEngine (DGI/CNPS/CMU)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E5F0] flex items-center justify-center hover:bg-white text-[#6B6F85]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#E5E5F0] px-6 bg-white gap-4">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`py-3 text-[13.5px] font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'border-[#4F46A0] text-[#4F46A0]'
                : 'border-transparent text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            <Users className="w-4 h-4" />
            Moteur Fiscal & Social (PayrollTaxEngine)
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-3 text-[13.5px] font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'border-[#4F46A0] text-[#4F46A0]'
                : 'border-transparent text-[#6B6F85] hover:text-[#171A2E]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Moteur de Scoring (ComplianceScoreEngine)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'payroll' ? (
            <div className="space-y-5">
              {/* Mode switch */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('company')}
                  className={`px-3 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-colors ${
                    mode === 'company'
                      ? 'bg-[#4F46A0] text-white'
                      : 'border border-[#E5E5F0] text-[#20263A] hover:bg-[#F6F6FB]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />
                  Masse Salariale Entreprise (Koffi BTP)
                </button>
                <button
                  onClick={() => setMode('employee')}
                  className={`px-3 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-colors ${
                    mode === 'employee'
                      ? 'bg-[#4F46A0] text-white'
                      : 'border border-[#E5E5F0] text-[#20263A] hover:bg-[#F6F6FB]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Bulletin Salarié Individuel
                </button>
              </div>

              {mode === 'company' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Inputs */}
                  <div className="bg-[#F6F6FB] p-4 rounded-[12px] border border-[#E5E5F0] space-y-3">
                    <h4 className="m-0 text-[13.5px] font-extrabold text-[#171A2E]">
                      Paramètres de l'entreprise
                    </h4>
                    <div>
                      <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                        Masse salariale brute mensuelle (FCFA)
                      </label>
                      <input
                        type="number"
                        value={masseSalariale}
                        onChange={(e) => setMasseSalariale(Number(e.target.value))}
                        className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                          Effectif total
                        </label>
                        <input
                          type="number"
                          value={effectif}
                          onChange={(e) => setEffectif(Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                          Affiliés CMU
                        </label>
                        <input
                          type="number"
                          value={cmuAffilies}
                          onChange={(e) => setCmuAffilies(Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                        Secteur d'activité (Taux AT/MP)
                      </label>
                      <select
                        value={secteur}
                        onChange={(e) => setSecteur(e.target.value as any)}
                        className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                      >
                        <option value="btp">BTP (Taux AT/MP 5%)</option>
                        <option value="industrie">Industrie (Taux AT/MP 4%)</option>
                        <option value="commerce">Commerce (Taux AT/MP 3%)</option>
                        <option value="services">Services (Taux AT/MP 2%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Outputs */}
                  <div className="bg-white p-4 rounded-[12px] border border-[#E5E5F0] space-y-3">
                    <h4 className="m-0 text-[13.5px] font-extrabold text-[#171A2E]">
                      Déclarations & Versements Mensuels
                    </h4>
                    <div className="space-y-2 text-[13px]">
                      <div className="flex justify-between pb-1 border-b border-[#E5E5F0]">
                        <span className="text-[#6B6F85]">Cotisations CNPS (e-CNPS)</span>
                        <strong className="text-[#171A2E]">{compResult.totalCnps.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-[#E5E5F0]">
                        <span className="text-[#6B6F85]">Cotisations CMU ({compResult.salariesAffiliesCmu} déclarés)</span>
                        <strong className="text-[#171A2E]">{compResult.totalCmu.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-[#E5E5F0]">
                        <span className="text-[#6B6F85]">Retenues ITS (DGI e-impôts)</span>
                        <strong className="text-[#171A2E]">{compResult.totalIts.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-[#E5E5F0]">
                        <span className="text-[#6B6F85]">Taxe FDFP (1,6% total)</span>
                        <strong className="text-[#171A2E]">{compResult.totalFdfp.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div className="bg-[#E7F6EE] p-2.5 rounded-[8px] text-[12px] text-[#1F9254] font-bold">
                        Potentiel de formation finançable FDFP : {compResult.fdfpPotentielFormationAnnuel.toLocaleString('fr-FR')} FCFA / an
                      </div>
                      <div className="flex justify-between pt-2 text-[14px] font-extrabold text-[#4F46A0]">
                        <span>Total Décaissement Mensuel</span>
                        <span>{compResult.totalVersementsMensuels.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Employee Inputs */}
                  <div className="bg-[#F6F6FB] p-4 rounded-[12px] border border-[#E5E5F0] space-y-3">
                    <h4 className="m-0 text-[13.5px] font-extrabold text-[#171A2E]">
                      Paramètres du Salarié
                    </h4>
                    <div>
                      <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                        Salaire Brut Mensuel (FCFA)
                      </label>
                      <input
                        type="number"
                        value={salaireBrut}
                        onChange={(e) => setSalaireBrut(Number(e.target.value))}
                        className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11.5px] font-bold text-[#6B6F85] block mb-1">
                        Nombre de parts familiales (IGR)
                      </label>
                      <select
                        value={parts}
                        onChange={(e) => setParts(Number(e.target.value))}
                        className="w-full bg-white border border-[#E5E5F0] rounded-[8px] p-2 text-[13px] font-bold"
                      >
                        <option value={1.0}>1 part (Célibataire)</option>
                        <option value={1.5}>1.5 part (Célibataire + 1 enfant)</option>
                        <option value={2.0}>2 parts (Marié ou + 2 enfants)</option>
                        <option value={2.5}>2.5 parts (Marié + 1 enfant)</option>
                        <option value={3.0}>3 parts (Marié + 2 enfants)</option>
                      </select>
                    </div>
                  </div>

                  {/* Employee Output */}
                  <div className="bg-white p-4 rounded-[12px] border border-[#E5E5F0] space-y-3">
                    <h4 className="m-0 text-[13.5px] font-extrabold text-[#171A2E]">
                      Décompte du Bulletin
                    </h4>
                    <div className="space-y-1.5 text-[12.5px]">
                      <div className="flex justify-between">
                        <span className="text-[#6B6F85]">CNPS Retraite Salariale (6,3%)</span>
                        <strong>{empResult.chargesSalariales.cnpsRetraite.toLocaleString('fr-FR')} F</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B6F85]">Cotisation CMU Salariale</span>
                        <strong>{empResult.chargesSalariales.cmu.toLocaleString('fr-FR')} F</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B6F85]">IS (1,2%) + CN + IGR</span>
                        <strong>
                          {(empResult.chargesSalariales.is + empResult.chargesSalariales.cn + empResult.chargesSalariales.igr).toLocaleString('fr-FR')} F
                        </strong>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E5E5F0] font-extrabold text-[#1F9254] text-[13.5px]">
                        <span>Salaire Net à Payer</span>
                        <span>{empResult.salaireNetAPayer.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between pt-1 text-[#6B6F85] text-[12px]">
                        <span>Coût Total Employeur (+ charges)</span>
                        <strong>{empResult.coutTotalEmployeur.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Compliance Score Engine live view */}
              <div className="bg-[#FAF9FD] p-5 rounded-[12px] border border-[#E5E5F0] flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-[#6B6F85] uppercase tracking-wider">
                    Score Global de Conformité (ComplianceScoreEngine)
                  </div>
                  <div className="text-[32px] font-extrabold text-[#4F46A0] leading-none mt-1">
                    {scoreReport.scoreGlobal}%
                  </div>
                  <div className="text-[13px] font-bold text-[#171A2E] mt-1">
                    {scoreReport.qualification}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[12.5px] text-[#C4432B] font-bold">
                    {scoreReport.enRetardCount} obligation(s) en retard
                  </div>
                  <div className="text-[12.5px] text-[#1F9254] font-bold">
                    {scoreReport.aJourCount} obligation(s) à jour
                  </div>
                  <div className="text-[12px] text-[#6B6F85]">
                    Exposition : ~{scoreReport.expositionFinanciereFcfa.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>

              {/* Sub-domain breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-[#E5E5F0] rounded-[10px]">
                  <div className="text-[11px] font-bold text-[#6B6F85]">Fiscalité DGI (40%)</div>
                  <div className="text-[18px] font-extrabold text-[#171A2E]">{scoreReport.domainScores.fiscal}%</div>
                </div>
                <div className="p-3 bg-white border border-[#E5E5F0] rounded-[10px]">
                  <div className="text-[11px] font-bold text-[#6B6F85]">Social CNPS/CMU (35%)</div>
                  <div className="text-[18px] font-extrabold text-[#171A2E]">{scoreReport.domainScores.social}%</div>
                </div>
                <div className="p-3 bg-white border border-[#E5E5F0] rounded-[10px]">
                  <div className="text-[11px] font-bold text-[#6B6F85]">Juridique (15%)</div>
                  <div className="text-[18px] font-extrabold text-[#171A2E]">{scoreReport.domainScores.juridique}%</div>
                </div>
                <div className="p-3 bg-white border border-[#E5E5F0] rounded-[10px]">
                  <div className="text-[11px] font-bold text-[#6B6F85]">Commerce & Prix (10%)</div>
                  <div className="text-[18px] font-extrabold text-[#171A2E]">{scoreReport.domainScores.commerce}%</div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="m-0 text-[13.5px] font-extrabold text-[#171A2E]">
                  Recommandations d'actions prioritaires
                </h4>
                {scoreReport.recommandations.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-[8px] bg-[#FBEAE5] border border-[#C4432B]/20 flex items-start gap-2 text-[12.5px]"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#C4432B] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#C4432B] block">{r.priorite} — {r.action}</strong>
                      <span className="text-[#6B6F85]">{r.impact}</span>
                    </div>
                  </div>
                ))}
                {scoreReport.recommandations.length === 0 && (
                  <div className="p-3 rounded-[8px] bg-[#E7F6EE] text-[#1F9254] flex items-center gap-2 font-bold text-[13px]">
                    <CheckCircle2 className="w-4 h-4" />
                    Félicitations, aucun retard ni écart critique détecté !
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-[14px_24px] border-t border-[#E5E5F0] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#4F46A0] hover:bg-[#3D3680] text-white border-none rounded-[8px] px-5 py-2 font-bold text-[13px] transition-colors"
          >
            Fermer le simulateur
          </button>
        </div>
      </div>
    </div>
  );
};
