<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplianceObligation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObligationController extends Controller
{
    /**
     * Liste des obligations filtrées
     */
    public function index(Request $request): JsonResponse
    {
        $query = ComplianceObligation::query();

        if ($request->has('company_id')) {
            $query->where('company_id', $request->input('company_id'));
        }

        if ($request->has('domaine') && $request->input('domaine') !== 'tout') {
            $query->where('domaine', $request->input('domaine'));
        }

        if ($request->has('statut')) {
            $query->where('statut', $request->input('statut'));
        }

        $obligations = $query->orderBy('date_echeance', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'count' => $obligations->count(),
            'data' => $obligations,
        ]);
    }

    /**
     * Marquer une obligation comme accomplie avec numéro de quittance DGI/CNPS
     */
    public function markDone(Request $request, int $id): JsonResponse
    {
        $obligation = ComplianceObligation::findOrFail($id);

        $validated = $request->validate([
            'reference_quittance' => 'nullable|string|max:100',
            'date_declaration' => 'nullable|date',
            'piece_justificative' => 'nullable|string',
        ]);

        $declaration = $obligation->markAsAccomplished(
            quittanceRef: $validated['reference_quittance'] ?? 'AUTO-' . date('YmdHis'),
            piecePath: $validated['piece_justificative'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Obligation marquée comme effectuée avec succès',
            'obligation' => $obligation->fresh(),
            'declaration' => $declaration,
        ]);
    }

    /**
     * Créer une obligation personnalisée
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'domaine' => 'required|string|in:fiscal,social,douanes,commerce,administratif',
            'date_echeance' => 'required|date',
            'mois_groupe' => 'required|string',
            'montant_principal' => 'nullable|numeric|min:0',
        ]);

        $obligation = ComplianceObligation::create([
            'company_id' => $validated['company_id'],
            'rule_code' => 'custom_' . uniqid(),
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'domaine' => $validated['domaine'],
            'statut' => 'a_venir',
            'date_echeance' => $validated['date_echeance'],
            'mois_groupe' => $validated['mois_groupe'],
            'montant_principal' => $validated['montant_principal'] ?? 0,
            'majoration_estimee' => 0,
            'severite' => 'mineure',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Échéance personnalisée créée',
            'data' => $obligation,
        ], 201);
    }
}
