<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ComplianceObligation;
use App\Services\Engines\ComplianceScoreEngine;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ComplianceScoreEngine $scoreEngine
    ) {}

    /**
     * Données du tableau de bord correspondant à la maquette
     */
    public function index(): JsonResponse
    {
        $company = Company::with('obligations')->first();

        if (!$company) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucune entreprise configurée',
            ], 404);
        }

        $obligations = $company->obligations;

        $enRetard = $obligations->where('statut', 'en_retard')->values();
        $aVenir = $obligations->where('statut', 'imminente')->values();
        $accomplies = $obligations->where('statut', 'accomplie')->values();

        $scoreReport = $this->scoreEngine->computeScore(
            $obligations->toArray(),
            $company->toArray()
        );

        return response()->json([
            'status' => 'success',
            'user' => [
                'name' => 'Alex Koffi',
                'company' => $company->nom,
                'role' => 'Dirigeant',
                'initials' => 'AK',
            ],
            'stats' => [
                'en_retard_count' => $enRetard->count(),
                'a_jour_count' => $accomplies->count() + $aVenir->count(),
                'score_conformite' => $scoreReport['score_global'],
                'qualification' => $scoreReport['qualification'],
                'exposition_financiere_fcfa' => $scoreReport['statistiques']['exposition_financiere_fcfa'],
            ],
            'obligations_en_retard' => $enRetard,
            'obligations_imminentes' => $aVenir,
            'opportunite_du_moment' => [
                'titre' => 'Crédit d\'impôt contrat d\'apprentissage',
                'gain_estime' => '180 000 FCFA / an',
                'statut' => 'Éligible',
            ],
        ]);
    }
}
