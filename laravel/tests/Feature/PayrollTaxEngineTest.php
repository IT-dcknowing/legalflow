<?php

declare(strict_types=1);

use App\Services\Engines\PayrollTaxEngine;

describe('PayrollTaxEngine (Moteur fiscal et social ivoirien)', function () {
    test('calcule correctement les cotisations CNPS et CMU pour un salaire brut standard', function () {
        $engine = new PayrollTaxEngine();
        $salaireBrut = 350_000.0;

        $result = $engine->calculateEmployeePayroll(
            salaireBrut: $salaireBrut,
            secteur: 'btp',
            nombreParts: 2.0,
            assujettiCMU: true
        );

        // 1. Vérification CNPS Retraite Salariale : 6.3%
        expect($result['charges_salariales']['cnps_retraite'])->toBe(round($salaireBrut * 0.063));

        // 2. Vérification CMU Salariale : 1 000 FCFA
        expect($result['charges_salariales']['cmu'])->toBe(1000.0);

        // 3. Vérification Salaire Net positif et inférieur au brut
        expect($result['salaire_net_a_payer'])
            ->toBeGreaterThan(0.0)
            ->toBeLessThan($salaireBrut);

        // 4. Vérification Charges patronales BTP AT/MP 5% (plafonné à 70 000 FCFA)
        expect($result['charges_patronales']['cnps_accidents_travail'])->toBe(round(70_000 * 0.05));

        // 5. Vérification Prestations Familiales 5.75% (plafonné à 70 000 FCFA)
        expect($result['charges_patronales']['cnps_prestations_familiales'])->toBe(round(70_000 * 0.0575));
    });

    test('applique le plafonnement retraite CNPS à 2 700 000 FCFA mensuel', function () {
        $engine = new PayrollTaxEngine();
        $salaireEleve = 4_500_000.0; // Dépasse le plafond

        $result = $engine->calculateEmployeePayroll(
            salaireBrut: $salaireEleve,
            secteur: 'services'
        );

        $plafondRetraite = 2_700_000.0;
        expect($result['charges_salariales']['cnps_retraite'])->toBe(round($plafondRetraite * 0.063));
        expect($result['charges_patronales']['cnps_retraite'])->toBe(round($plafondRetraite * 0.077));
    });

    test('calcule la masse salariale globale de l\'entreprise avec ventilation DGI/CNPS/CMU/FDFP', function () {
        $engine = new PayrollTaxEngine();

        // Cas Établissements Koffi BTP (14 salariés, 4M FCFA/mois de masse salariale)
        $companyCalc = $engine->calculateCompanyMonthlyPayroll(
            masseSalarialeBruteMensuelle: 4_000_000.0,
            effectif: 14,
            secteur: 'btp',
            salariesAffiliesCMU: 12
        );

        expect($companyCalc['effectif'])->toBe(14);
        expect($companyCalc['salaries_affilies_cmu'])->toBe(12);
        expect($companyCalc['salaries_non_affilies_cmu'])->toBe(2);
        expect($companyCalc['total_cmu'])->toBe(12 * 2000); // 1000 salarié + 1000 employeur
        expect($companyCalc['total_cnps'])->toBeGreaterThan(0.0);
        expect($companyCalc['fdfp_potentiel_formation'])->toBeGreaterThan(0.0);
    });
});
