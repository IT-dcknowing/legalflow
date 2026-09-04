<?php

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
    // Plafonds légaux mensuels en FCFA
    public const int PLAFOND_CNPS_PRESTATIONS_FAMILIALES = 70_000;
    public const int PLAFOND_CNPS_ACCIDENTS_TRAVAIL = 70_000;
    public const int PLAFOND_CNPS_RETRAITE = 2_700_000;

    // Taux CNPS
    public const float TAUX_CNPS_RETRAITE_SALARIALE = 0.063; // 6.3%
    public const float TAUX_CNPS_RETRAITE_PATRONALE = 0.077; // 7.7%
    public const float TAUX_CNPS_PRESTATIONS_FAMILIALES = 0.0575; // 5.75%

    // Taux AT/MP par secteur
    public const float TAUX_ATMP_BTP = 0.05; // 5% BTP
    public const float TAUX_ATMP_INDUSTRIE = 0.04; // 4% Industrie
    public const float TAUX_ATMP_COMMERCE = 0.03; // 3% Commerce
    public const float TAUX_ATMP_SERVICES = 0.02; // 2% Services / Tertiaire

    // Cotisation CMU forfaitaire mensuelle par salarié
    public const int COTISATION_CMU_SALARIE = 1_000;
    public const int COTISATION_CMU_EMPLOYEUR = 1_000;

    // Taux FDFP
    public const float TAUX_FDFP_TAXE_APPRENTISSAGE = 0.004; // 0.4%
    public const float TAUX_FDFP_FORMATION_CONTINUE = 0.012; // 1.2% (dont 0.6% récupérable)

    // Taux Impôt sur le Salaire (IS)
    public const float TAUX_IS = 0.012; // 1.2%

    /**
     * Calcule le bulletin et les charges sociales et fiscales complètes pour un salarié.
     *
     * @param float $salaireBrut Salaire brut mensuel en FCFA
     * @param string $secteur Secteur de l'entreprise ('btp', 'industrie', 'commerce', 'services')
     * @param float $nombreParts Quotient familial pour calcul IGR (ex: 1.0 célibataire, 2.0 marié, +0.5 par enfant)
     * @param bool $assujettiCMU Salarié enrôlé et assujetti à la CMU
     * @param bool $assujettiFDFP Entreprise redevable du FDFP
     * @return array<string, mixed>
     */
    public function calculateEmployeePayroll(
        float $salaireBrut,
        string $secteur = 'commerce',
        float $nombreParts = 1.0,
        bool $assujettiCMU = true,
        bool $assujettiFDFP = true
    ): array {
        $secteurClean = strtolower(trim($secteur));
        $tauxAtmp = match ($secteurClean) {
            'btp', 'construction' => self::TAUX_ATMP_BTP,
            'industrie', 'manufacture' => self::TAUX_ATMP_INDUSTRIE,
            'commerce', 'distribution' => self::TAUX_ATMP_COMMERCE,
            default => self::TAUX_ATMP_SERVICES,
        };

        // 1. Cotisations CNPS Salariales
        $assietteCnpsRetraite = min($salaireBrut, (float) self::PLAFOND_CNPS_RETRAITE);
        $cnpsRetraiteSalariale = round($assietteCnpsRetraite * self::TAUX_CNPS_RETRAITE_SALARIALE);

        // 2. Cotisations CMU Salariale
        $cmuSalariale = $assujettiCMU ? self::COTISATION_CMU_SALARIE : 0;

        // 3. Impôts sur salaires (IS, CN, IGR)
        $taxesFiscales = $this->calculateSalaryTaxes($salaireBrut, $nombreParts);

        $totalRetenuesSalariales = $cnpsRetraiteSalariale 
            + $cmuSalariale 
            + $taxesFiscales['is'] 
            + $taxesFiscales['cn'] 
            + $taxesFiscales['igr'];

        $salaireNetAPayer = max(0.0, $salaireBrut - $totalRetenuesSalariales);

        // 4. Charges Patronales CNPS
        $assietteCnpsPlafondBas = min($salaireBrut, (float) self::PLAFOND_CNPS_PRESTATIONS_FAMILIALES);
        $cnpsPrestationsFamiliales = round($assietteCnpsPlafondBas * self::TAUX_CNPS_PRESTATIONS_FAMILIALES);
        $cnpsAccidentsTravail = round($assietteCnpsPlafondBas * $tauxAtmp);
        $cnpsRetraitePatronale = round($assietteCnpsRetraite * self::TAUX_CNPS_RETRAITE_PATRONALE);
        $totalCnpsPatronal = $cnpsPrestationsFamiliales + $cnpsAccidentsTravail + $cnpsRetraitePatronale;

        // 5. Charges Patronales CMU
        $cmuPatronale = $assujettiCMU ? self::COTISATION_CMU_EMPLOYEUR : 0;

        // 6. Charges Patronales FDFP
        $fdfpApprentissage = $assujettiFDFP ? round($salaireBrut * self::TAUX_FDFP_TAXE_APPRENTISSAGE) : 0;
        $fdfpFormationContinue = $assujettiFDFP ? round($salaireBrut * self::TAUX_FDFP_FORMATION_CONTINUE) : 0;
        $fdfpRecuperablePlan = $assujettiFDFP ? round($salaireBrut * 0.006) : 0;
        $totalFdfp = $fdfpApprentissage + $fdfpFormationContinue;

        $totalChargesPatronales = $totalCnpsPatronal + $cmuPatronale + $totalFdfp;
        $coutTotalEmployeur = $salaireBrut + $totalChargesPatronales;

        return [
            'salaire_brut' => $salaireBrut,
            'salaire_net_a_payer' => $salaireNetAPayer,
            'cout_total_employeur' => $coutTotalEmployeur,
            'charges_salariales' => [
                'cnps_retraite' => $cnpsRetraiteSalariale,
                'cmu' => $cmuSalariale,
                'is' => $taxesFiscales['is'],
                'cn' => $taxesFiscales['cn'],
                'igr' => $taxesFiscales['igr'],
                'total' => $totalRetenuesSalariales,
            ],
            'charges_patronales' => [
                'cnps_prestations_familiales' => $cnpsPrestationsFamiliales,
                'cnps_accidents_travail' => $cnpsAccidentsTravail,
                'cnps_retraite' => $cnpsRetraitePatronale,
                'cnps_total' => $totalCnpsPatronal,
                'cmu' => $cmuPatronale,
                'fdfp_apprentissage' => $fdfpApprentissage,
                'fdfp_formation_continue' => $fdfpFormationContinue,
                'fdfp_total' => $totalFdfp,
                'fdfp_part_recuperable' => $fdfpRecuperablePlan,
                'total' => $totalChargesPatronales,
            ],
            'versements_organismes' => [
                'dgi_total' => $taxesFiscales['is'] + $taxesFiscales['cn'] + $taxesFiscales['igr'] + $totalFdfp,
                'cnps_total' => $cnpsRetraiteSalariale + $totalCnpsPatronal,
                'cmu_total' => $cmuSalariale + $cmuPatronale,
            ],
        ];
    }

    /**
     * Calcule la déclaration globale pour la masse salariale mensuelle de l'entreprise.
     *
     * @param float $masseSalarialeBruteMensuelle
     * @param int $effectif
     * @param string $secteur
     * @param int $salariesAffiliesCMU
     * @return array<string, mixed>
     */
    public function calculateCompanyMonthlyPayroll(
        float $masseSalarialeBruteMensuelle,
        int $effectif,
        string $secteur = 'btp',
        int $salariesAffiliesCMU = 0
    ): array {
        if ($effectif <= 0 || $masseSalarialeBruteMensuelle <= 0) {
            return [
                'effectif' => $effectif,
                'masse_salariale' => $masseSalarialeBruteMensuelle,
                'total_cnps' => 0,
                'total_cmu' => 0,
                'total_its' => 0,
                'total_fdfp' => 0,
                'fdfp_recuperable' => 0,
                'cout_total' => 0,
            ];
        }

        $salaireMoyen = $masseSalarialeBruteMensuelle / $effectif;
        $simulatedOne = $this->calculateEmployeePayroll($salaireMoyen, $secteur, 1.5, true, true);

        $totalCnps = $simulatedOne['versements_organismes']['cnps_total'] * $effectif;
        $totalIts = ($simulatedOne['charges_salariales']['is'] + $simulatedOne['charges_salariales']['cn'] + $simulatedOne['charges_salariales']['igr']) * $effectif;
        $totalFdfp = $simulatedOne['charges_patronales']['fdfp_total'] * $effectif;
        $fdfpRecuperable = $simulatedOne['charges_patronales']['fdfp_part_recuperable'] * $effectif;

        $cmuSalariesReel = min($effectif, max(0, $salariesAffiliesCMU));
        $totalCmu = $cmuSalariesReel * (self::COTISATION_CMU_SALARIE + self::COTISATION_CMU_EMPLOYEUR);

        return [
            'effectif' => $effectif,
            'salaries_affilies_cmu' => $cmuSalariesReel,
            'salaries_non_affilies_cmu' => max(0, $effectif - $cmuSalariesReel),
            'masse_salariale_mensuelle' => $masseSalarialeBruteMensuelle,
            'total_cnps' => round($totalCnps),
            'total_cmu' => round($totalCmu),
            'total_its' => round($totalIts),
            'total_fdfp' => round($totalFdfp),
            'fdfp_potentiel_formation' => round($fdfpRecuperable * 12),
            'cout_total_charges' => round($totalCnps + $totalCmu + $totalFdfp),
            'total_versements_mensuels' => round($totalCnps + $totalCmu + $totalIts + $totalFdfp),
        ];
    }

    /**
     * Calcul détaillé des retenues fiscales Ivoiriennes (IS, CN, IGR).
     *
     * @return array{is: float, cn: float, igr: float}
     */
    private function calculateSalaryTaxes(float $salaireBrut, float $nombreParts): array
    {
        // Base imposable IS et CN = 80% du salaire brut
        $baseImposable = $salaireBrut * 0.80;

        // 1. IS (Impôt sur le Salaire) = 1.2%
        $is = round($baseImposable * self::TAUX_IS);

        // 2. CN (Contribution Nationale) - Barème officiel progressif
        $cn = 0.0;
        if ($baseImposable > 50_000 && $baseImposable <= 130_000) {
            $cn = ($baseImposable - 50_000) * 0.015;
        } elseif ($baseImposable > 130_000 && $baseImposable <= 200_000) {
            $cn = (80_000 * 0.015) + (($baseImposable - 130_000) * 0.05);
        } elseif ($baseImposable > 200_000) {
            $cn = (80_000 * 0.015) + (70_000 * 0.05) + (($baseImposable - 200_000) * 0.10);
        }
        $cn = round($cn);

        // 3. IGR (Impôt Général sur le Revenu)
        // Base IGR = (Base imposable - IS - CN) * 0.85
        $baseIgr = max(0.0, ($baseImposable - $is - $cn) * 0.85);
        $quotient = $nombreParts > 0 ? ($baseIgr / $nombreParts) : $baseIgr;

        $igrBrut = 0.0;
        if ($quotient > 25_000 && $quotient <= 45_000) {
            $igrBrut = ($quotient - 25_000) * 0.10;
        } elseif ($quotient > 45_000 && $quotient <= 85_000) {
            $igrBrut = (20_000 * 0.10) + (($quotient - 45_000) * 0.15);
        } elseif ($quotient > 85_000 && $quotient <= 135_000) {
            $igrBrut = (20_000 * 0.10) + (40_000 * 0.15) + (($quotient - 85_000) * 0.20);
        } elseif ($quotient > 135_000) {
            $igrBrut = (20_000 * 0.10) + (40_000 * 0.15) + (50_000 * 0.20) + (($quotient - 135_000) * 0.25);
        }

        $igr = round($igrBrut * $nombreParts);

        return [
            'is' => $is,
            'cn' => $cn,
            'igr' => $igr,
        ];
    }
}
