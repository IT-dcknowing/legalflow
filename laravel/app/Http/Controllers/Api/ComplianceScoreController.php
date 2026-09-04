<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Engines\ComplianceScoreEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplianceScoreController extends Controller
{
    public function __construct(
        private readonly ComplianceScoreEngine $engine
    ) {}

    /**
     * Calcule le score de conformité d'une entreprise donnée
     */
    public function calculate(Request $request, int $companyId): JsonResponse
    {
        $company = Company::with('obligations')->findOrFail($companyId);

        $obligationsArray = $company->obligations->map(fn($o) => [
            'id' => $o->id,
            'domaine' => $o->domaine,
            'titre' => $o->titre,
            'statut' => $o->statut,
            'severite' => $o->severite,
            'montant_principal' => (float) $o->montant_principal,
            'montant_penalite_estime' => (float) $o->majoration_estimee,
        ])->toArray();

        $result = $this->engine->computeScore($obligationsArray, $company->toArray());

        return response()->json([
            'status' => 'success',
            'company' => [
                'id' => $company->id,
                'nom' => $company->nom,
                'regime' => $company->regime_fiscal,
                'secteur' => $company->secteur,
            ],
            'compliance' => $result,
        ]);
    }
}
