<?php

declare(strict_types=1);

use App\Services\Engines\ComplianceScoreEngine;

describe('ComplianceScoreEngine (Moteur de scoring de conformité)', function () {
    test('calcule le score global et pénalise les retards DGI et CNPS', function () {
        $engine = new ComplianceScoreEngine();

        // Cas similaire à la maquette : 2 retards (TVA + CNPS), 3 à venir/accomplies
        $obligations = [
            [
                'id' => '1',
                'domaine' => 'fiscal',
                'titre' => 'Déclaration TVA — Août 2026',
                'statut' => 'en_retard',
                'severite' => 'bloquante',
                'montant_penalite_estime' => 45_000.0,
            ],
            [
                'id' => '2',
                'domaine' => 'social',
                'titre' => 'Cotisation CNPS — Août 2026',
                'statut' => 'en_retard',
                'severite' => 'bloquante',
                'montant_penalite_estime' => 22_000.0,
            ],
            [
                'id' => '3',
                'domaine' => 'fiscal',
                'titre' => 'Déclaration ITS — Septembre 2026',
                'statut' => 'imminente',
                'severite' => 'majeure',
                'montant_penalite_estime' => 0.0,
            ],
            [
                'id' => '4',
                'domaine' => 'social',
                'titre' => 'Déclaration CNPS — Septembre 2026',
                'statut' => 'imminente',
                'severite' => 'bloquante',
                'montant_penalite_estime' => 0.0,
            ],
            [
                'id' => '5',
                'domaine' => 'commerce',
                'titre' => 'Poinçonnage balances',
                'statut' => 'accomplie',
                'severite' => 'mineure',
                'montant_penalite_estime' => 0.0,
            ],
        ];

        $report = $engine->computeScore($obligations);

        expect($report['statistiques']['en_retard'])->toBe(2);
        expect($report['statistiques']['accomplies'])->toBe(1);
        expect($report['statistiques']['exposition_financiere_fcfa'])->toBe(67_000.0);
        expect($report['score_global'])->toBeGreaterThanOrEqual(0)->toBeLessThanOrEqual(100);
        expect($report['conforme_marches_publics'])->toBeFalse();
        expect($report['recommandations_prioritaires'])->toHaveCount(2);
    });

    test('attribue 100% à une entreprise parfaitement à jour sans retard', function () {
        $engine = new ComplianceScoreEngine();

        $obligations = [
            ['id' => '1', 'domaine' => 'fiscal', 'titre' => 'TVA', 'statut' => 'accomplie', 'severite' => 'bloquante'],
            ['id' => '2', 'domaine' => 'social', 'titre' => 'CNPS', 'statut' => 'accomplie', 'severite' => 'bloquante'],
            ['id' => '3', 'domaine' => 'social', 'titre' => 'DISA', 'statut' => 'accomplie', 'severite' => 'bloquante'],
        ];

        $report = $engine->computeScore($obligations);

        expect($report['score_global'])->toBe(100);
        expect($report['conforme_marches_publics'])->toBeTrue();
        expect($report['statistiques']['en_retard'])->toBe(0);
    });
});
