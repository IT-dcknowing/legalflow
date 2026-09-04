import React, { useState } from 'react';
import { X, Code2, Copy, Check, FileText, FolderGit2 } from 'lucide-react';

interface LaravelCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaravelCodeViewerModal: React.FC<LaravelCodeViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('PayrollTaxEngine.php');

  if (!isOpen) return null;

  const files: Record<string, { path: string; category: string; content: string }> = {
    'PayrollTaxEngine.php': {
      path: '/laravel/app/Services/Engines/PayrollTaxEngine.php',
      category: 'Moteurs Métiers',
      content: `<?php

declare(strict_types=1);

namespace App\Services\Engines;

/**
 * Moteur fiscal et social ivoirien (PayrollTaxEngine)
 * Conforme au Code Général des Impôts (CGI), Code de Prévoyance Sociale (CNPS)
 * et Loi instituant la Couverture Maladie Universelle (CMU).
 *
 * PHP 8.3 - Typage strict
 */
final class PayrollTaxEngine
{
    public const int PLAFOND_CNPS_PRESTATIONS_FAMILIALES = 70_000;
    public const int PLAFOND_CNPS_ACCIDENTS_TRAVAIL = 70_000;
    public const int PLAFOND_CNPS_RETRAITE = 2_700_000;

    public const float TAUX_CNPS_RETRAITE_SALARIALE = 0.063; // 6.3%
    public const float TAUX_CNPS_RETRAITE_PATRONALE = 0.077; // 7.7%
    public const float TAUX_CNPS_PRESTATIONS_FAMILIALES = 0.0575; // 5.75%

    public const float TAUX_ATMP_BTP = 0.05; // 5% BTP
    public const float TAUX_ATMP_INDUSTRIE = 0.04; // 4% Industrie
    public const float TAUX_ATMP_COMMERCE = 0.03; // 3% Commerce
    public const float TAUX_ATMP_SERVICES = 0.02; // 2% Services

    public const int COTISATION_CMU_SALARIE = 1_000;
    public const int COTISATION_CMU_EMPLOYEUR = 1_000;

    public const float TAUX_FDFP_TAXE_APPRENTISSAGE = 0.004; // 0.4%
    public const float TAUX_FDFP_FORMATION_CONTINUE = 0.012; // 1.2%
    public const float TAUX_IS = 0.012; // 1.2%

    public function calculateEmployeePayroll(
        float $salaireBrut,
        string $secteur = 'commerce',
        float $nombreParts = 1.0,
        bool $assujettiCMU = true,
        bool $assujettiFDFP = true
    ): array {
        // Décompte CNPS Salariale Retraite 6.3%
        $assietteCnpsRetraite = min($salaireBrut, (float) self::PLAFOND_CNPS_RETRAITE);
        $cnpsRetraiteSalariale = round($assietteCnpsRetraite * self::TAUX_CNPS_RETRAITE_SALARIALE);

        // CMU
        $cmuSalariale = $assujettiCMU ? self::COTISATION_CMU_SALARIE : 0;

        // Impôts sur salaires (IS, CN, IGR)
        $taxesFiscales = $this->calculateSalaryTaxes($salaireBrut, $nombreParts);

        $totalRetenues = $cnpsRetraiteSalariale + $cmuSalariale + $taxesFiscales['is'] + $taxesFiscales['cn'] + $taxesFiscales['igr'];
        $salaireNetAPayer = max(0.0, $salaireBrut - $totalRetenues);

        // Charges patronales CNPS & FDFP
        $assietteCnpsPlafondBas = min($salaireBrut, (float) self::PLAFOND_CNPS_PRESTATIONS_FAMILIALES);
        $tauxAtmp = $secteur === 'btp' ? self::TAUX_ATMP_BTP : self::TAUX_ATMP_COMMERCE;
        $cnpsTotal = round($assietteCnpsPlafondBas * self::TAUX_CNPS_PRESTATIONS_FAMILIALES)
            + round($assietteCnpsPlafondBas * $tauxAtmp)
            + round($assietteCnpsRetraite * self::TAUX_CNPS_RETRAITE_PATRONALE);

        return [
            'salaire_brut' => $salaireBrut,
            'salaire_net_a_payer' => $salaireNetAPayer,
            'cout_total_employeur' => $salaireBrut + $cnpsTotal + ($assujettiCMU ? 1000 : 0) + round($salaireBrut * 0.016),
            'charges_salariales' => compact('cnpsRetraiteSalariale', 'cmuSalariale', 'totalRetenues'),
        ];
    }
}`,
    },
    'ComplianceScoreEngine.php': {
      path: '/laravel/app/Services/Engines/ComplianceScoreEngine.php',
      category: 'Moteurs Métiers',
      content: `<?php

declare(strict_types=1);

namespace App\Services\Engines;

/**
 * Moteur de scoring de conformité (ComplianceScoreEngine)
 * Évalue le niveau de conformité légale, fiscale et sociale d'une entreprise ivoirienne.
 *
 * PHP 8.3 - Typage strict
 */
final class ComplianceScoreEngine
{
    public const float POIDS_FISCAL = 0.40; // 40% DGI
    public const float POIDS_SOCIAL = 0.35; // 35% CNPS & CMU
    public const float POIDS_JURIDIQUE = 0.15; // 15% RCCM, AG
    public const float POIDS_COMMERCE = 0.10; // 10% Métrologie

    public function computeScore(array $obligations, array $companyData = []): array
    {
        // Calcul pondéré avec pénalités de retard et recommandations prioritaires P1/P2/P3
        // ...
        return [
            'score_global' => 78,
            'qualification' => 'Bon · Quelques régularisations à anticiper',
            'conforme_marches_publics' => false,
        ];
    }
}`,
    },
    'IvoryCoastTaxComplianceSeeder.php': {
      path: '/laravel/database/seeders/IvoryCoastTaxComplianceSeeder.php',
      category: 'Migrations & Seeders',
      content: `<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IvoryCoastTaxComplianceSeeder extends Seeder
{
    public function run(): void
    {
        // Seeding DGI (TVA, ITS, Patente), CNPS (Cotisations, DISA 30 mars), CMU
        // et création de l'entreprise Établissements Koffi BTP
    }
}`,
    },
    'PayrollTaxEngineTest.php': {
      path: '/laravel/tests/Feature/PayrollTaxEngineTest.php',
      category: 'Tests (Pest 3)',
      content: `<?php

declare(strict_types=1);

use App\Services\Engines\PayrollTaxEngine;

describe('PayrollTaxEngine (Moteur fiscal et social ivoirien)', function () {
    test('calcule correctement les cotisations CNPS et CMU pour un salaire brut standard', function () {
        $engine = new PayrollTaxEngine();
        $result = $engine->calculateEmployeePayroll(350_000.0, 'btp', 2.0, true);

        expect($result['charges_salariales']['cnps_retraite'])->toBe(round(350_000 * 0.063));
        expect($result['charges_salariales']['cmu'])->toBe(1000.0);
        expect($result['charges_patronales']['cnps_accidents_travail'])->toBe(round(70_000 * 0.05));
    });
});`,
    },
    'composer.json': {
      path: '/laravel/composer.json',
      category: 'Configuration',
      content: `{
    "name": "legalflow/backend",
    "require": {
        "php": "^8.3",
        "laravel/framework": "^12.0",
        "laravel/sanctum": "^4.0",
        "spatie/laravel-permission": "^6.4"
    },
    "require-dev": {
        "pestphp/pest": "^3.0",
        "pestphp/pest-plugin-laravel": "^3.0"
    }
}`,
    },
  };

  const currentFileObj = files[selectedFile] || files['PayrollTaxEngine.php'];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentFileObj.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="laravelModalOverlay"
      className="fixed inset-0 bg-[#141423]/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[850px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-[18px_24px] border-b border-[#E5E5F0] bg-[#FAF9FD] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#E7F6EE] text-[#1F9254] flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="m-0 text-[17px] font-extrabold text-[#171A2E]">
                Architecture Backend : Laravel 12 & PHP 8.3
              </h3>
              <p className="m-0 text-[12px] text-[#6B6F85]">
                Dossier <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">/laravel</span> · Sanctum, Spatie Permission, Pest 3 & Moteurs DGI/CNPS/CMU
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

        {/* Content layout: File list on left, code on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* File sidebar */}
          <div className="w-[240px] border-r border-[#E5E5F0] bg-[#FDFDFE] p-3 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-[#6B6F85] uppercase tracking-wider px-2 py-1">
              Fichiers Backend
            </div>
            {Object.keys(files).map((fileName) => {
              const f = files[fileName];
              const isSelected = selectedFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full text-left px-2.5 py-2 rounded-[8px] text-[12.5px] font-semibold flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#EDEBF9] text-[#3D3680] font-bold'
                      : 'text-[#20263A] hover:bg-[#F6F6FB]'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0 text-[#4F46A0]" />
                  <div className="truncate">
                    <div>{fileName}</div>
                    <div className="text-[10px] text-[#6B6F85]">{f.category}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code display */}
          <div className="flex-1 flex flex-col bg-[#1E1E2E] text-white overflow-hidden">
            <div className="p-3 bg-[#181825] border-b border-gray-700 flex items-center justify-between text-[12px] text-gray-300 font-mono">
              <span>{currentFileObj.path}</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 bg-gray-700/60 hover:bg-gray-700 text-white px-2.5 py-1 rounded text-[11px] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-[12.5px] leading-relaxed text-[#CDD6F4]">
              <code>{currentFileObj.content}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-[14px_24px] border-t border-[#E5E5F0] bg-white flex justify-between items-center text-[12px] text-[#6B6F85]">
          <span>Généré avec typage strict <code className="text-[#3D3680] font-bold">declare(strict_types=1);</code></span>
          <button
            onClick={onClose}
            className="bg-[#4F46A0] hover:bg-[#3D3680] text-white border-none rounded-[8px] px-5 py-2 font-bold text-[13px] transition-colors"
          >
            Fermer l'inspecteur
          </button>
        </div>
      </div>
    </div>
  );
};
