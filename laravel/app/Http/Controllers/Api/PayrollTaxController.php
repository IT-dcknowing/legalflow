<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Engines\PayrollTaxEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollTaxController extends Controller
{
    public function __construct(
        private readonly PayrollTaxEngine $engine
    ) {}

    /**
     * Calcul du bulletin individuel et des charges patronales ivoiriennes
     */
    public function calculateSingle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'salaire_brut' => 'required|numeric|min:0',
            'secteur' => 'sometimes|string|in:btp,commerce,industrie,services',
            'nombre_parts' => 'sometimes|numeric|min:1|max:5',
            'assujetti_cmu' => 'sometimes|boolean',
            'assujetti_fdfp' => 'sometimes|boolean',
        ]);

        $result = $this->engine->calculateEmployeePayroll(
            salaireBrut: (float) $validated['salaire_brut'],
            secteur: $validated['secteur'] ?? 'btp',
            nombreParts: (float) ($validated['nombre_parts'] ?? 1.0),
            assujettiCMU: (bool) ($validated['assujetti_cmu'] ?? true),
            assujettiFDFP: (bool) ($validated['assujetti_fdfp'] ?? true)
        );

        return response()->json([
            'status' => 'success',
            'data' => $result,
            'metadata' => [
                'engine' => 'PayrollTaxEngine (PHP 8.3)',
                'pays' => 'Côte d\'Ivoire',
                'reglementation' => 'CGI 2026, CNPS & CMU',
            ],
        ]);
    }

    /**
     * Calcul de la masse salariale globale d'une entreprise (DGI, CNPS, CMU, FDFP)
     */
    public function calculateCompany(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'masse_salariale_mensuelle' => 'required|numeric|min:0',
            'effectif' => 'required|integer|min:1',
            'secteur' => 'sometimes|string|in:btp,commerce,industrie,services',
            'salaries_affilies_cmu' => 'sometimes|integer|min:0',
        ]);

        $result = $this->engine->calculateCompanyMonthlyPayroll(
            masseSalarialeBruteMensuelle: (float) $validated['masse_salariale_mensuelle'],
            effectif: (int) $validated['effectif'],
            secteur: $validated['secteur'] ?? 'btp',
            salariesAffiliesCMU: (int) ($validated['salaries_affilies_cmu'] ?? $validated['effectif'])
        );

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }
}
