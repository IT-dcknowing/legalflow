<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'titre',
        'administration',
        'domaine',
        'base_legale',
        'periodicite',
        'jour_echeance',
        'mois_echeance',
        'regimes_applicables',
        'secteurs_applicables',
        'severite',
        'description',
        'penalite_formule',
        'actif',
    ];

    protected $casts = [
        'regimes_applicables' => 'array',
        'secteurs_applicables' => 'array',
        'actif' => 'boolean',
    ];
}
