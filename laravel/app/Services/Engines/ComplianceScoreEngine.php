<?php

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
    // Coefficients de pondération par domaine légal
    public const float POIDS_FISCAL = 0.40; // 40% DGI (TVA, ITS, Patente, RME/RSI)
    public const float POIDS_SOCIAL = 0.35; // 35% CNPS & CMU (DISA, cotisations, AT/MP)
    public const float POIDS_JURIDIQUE = 0.15; // 15% RCCM, AG, Statuts, Registre
    public const float POIDS_COMMERCE = 0.10; // 10% Métrologie, FNE, Prix réglementés

    /**
     * Calcule le score de conformité global et par domaine.
     *
     * @param array<int, array{
     *     id: string|int,
     *     domaine: string,
     *     titre: string,
     *     statut: string, // 'en_retard', 'imminente', 'a_venir', 'accomplie'
     *     severite: string, // 'bloquante', 'majeure', 'mineure'
     *     jours_retard?: int,
     *     montant_principal?: float,
     *     montant_penalite_estime?: float
     * }> $obligations
     * @param array<string, mixed> $companyData
     * @return array<string, mixed>
     */
    public function computeScore(array $obligations, array $companyData = []): array
    {
        $domaines = [
            'fiscal' => ['total' => 0, 'points' => 0, 'retards' => 0, 'amendes' => 0.0],
            'social' => ['total' => 0, 'points' => 0, 'retards' => 0, 'amendes' => 0.0],
            'juridique' => ['total' => 0, 'points' => 0, 'retards' => 0, 'amendes' => 0.0],
            'commerce' => ['total' => 0, 'points' => 0, 'retards' => 0, 'amendes' => 0.0],
        ];

        $nbTotal = count($obligations);
        $nbEnRetard = 0;
        $nbAccomplies = 0;
        $nbImminentes = 0;
        $expositionFinanciereTotale = 0.0;
        $recommandations = [];

        foreach ($obligations as $ob) {
            $dom = match (strtolower($ob['domaine'])) {
                'fiscal', 'dgi' => 'fiscal',
                'social', 'cnps', 'cmu' => 'social',
                'juridique', 'administratif' => 'juridique',
                default => 'commerce',
            };

            $domaines[$dom]['total']++;

            $statut = strtolower($ob['statut']);
            $severite = strtolower($ob['severite'] ?? 'majeure');
            $penalite = (float) ($ob['montant_penalite_estime'] ?? 0.0);

            // Pondération par gravité
            $poidsItem = match ($severite) {
                'bloquante' => 20,
                'majeure' => 10,
                default => 5,
            };

            if ($statut === 'accomplie' || $statut === 'fait') {
                $domaines[$dom]['points'] += $poidsItem;
                $nbAccomplies++;
            } elseif ($statut === 'en_retard') {
                $nbEnRetard++;
                $domaines[$dom]['retards']++;
                $domaines[$dom]['amendes'] += $penalite;
                $expositionFinanciereTotale += $penalite;

                // Génération de recommandations P1/P2
                $recommandations[] = [
                    'priorite' => $severite === 'bloquante' ? 'P1' : 'P2',
                    'action' => "Régulariser d'urgence : {$ob['titre']}",
                    'domaine' => strtoupper($dom),
                    'penalite' => $penalite,
                    'impact' => "Risque de suspension d'attestation ou de majoration DGI/CNPS",
                ];
            } elseif ($statut === 'imminente') {
                $nbImminentes++;
                $domaines[$dom]['points'] += ($poidsItem * 0.5); // Crédit partiel pour imminente non échue
            } else {
                // À venir
                $domaines[$dom]['points'] += ($poidsItem * 0.8);
            }
        }

        // Calcul des scores par domaine (0 à 100)
        $scoreFiscal = $this->calculateDomainScore($domaines['fiscal']);
        $scoreSocial = $this->calculateDomainScore($domaines['social']);
        $scoreJuridique = $this->calculateDomainScore($domaines['juridique']);
        $scoreCommerce = $this->calculateDomainScore($domaines['commerce']);

        // Score pondéré global
        $scoreGlobal = round(
            ($scoreFiscal * self::POIDS_FISCAL) +
            ($scoreSocial * self::POIDS_SOCIAL) +
            ($scoreJuridique * self::POIDS_JURIDIQUE) +
            ($scoreCommerce * self::POIDS_COMMERCE)
        );

        // Clamping entre 0 et 100
        $scoreGlobal = max(0, min(100, (int) $scoreGlobal));

        // Qualification qualitative
        $qualification = match (true) {
            $scoreGlobal >= 90 => 'Excellent · Risque fiscal nul',
            $scoreGlobal >= 75 => 'Bon · Quelques régularisations à anticiper',
            $scoreGlobal >= 60 => 'Moyen · Exposition active aux majorations',
            default => 'Critique · Vulnérabilité élevée en contrôle',
        };

        return [
            'score_global' => $scoreGlobal,
            'qualification' => $qualification,
            'statistiques' => [
                'total_obligations' => $nbTotal,
                'en_retard' => $nbEnRetard,
                'accomplies' => $nbAccomplies,
                'imminentes' => $nbImminentes,
                'exposition_financiere_fcfa' => round($expositionFinanciereTotale),
            ],
            'scores_domaines' => [
                'fiscal' => $scoreFiscal,
                'social' => $scoreSocial,
                'juridique' => $scoreJuridique,
                'commerce' => $scoreCommerce,
            ],
            'recommandations_prioritaires' => $recommandations,
            'conforme_marches_publics' => $scoreGlobal >= 80 && $nbEnRetard === 0,
        ];
    }

    /**
     * Calcul ratio sous-domaine avec plancher de sécurité.
     *
     * @param array{total: int, points: float, retards: int, amendes: float} $data
     */
    private function calculateDomainScore(array $data): int
    {
        if ($data['total'] === 0) {
            return 100;
        }

        $basePossible = $data['total'] * 10;
        $scoreRaw = ($data['points'] / $basePossible) * 100;

        // Pénalité par retard dans ce domaine (-15 points par retard)
        $scoreAjuste = $scoreRaw - ($data['retards'] * 15);

        return max(15, min(100, (int) round($scoreAjuste)));
    }
}
