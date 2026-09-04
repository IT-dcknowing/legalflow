<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComplianceObligation extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'rule_code',
        'titre',
        'description',
        'domaine',
        'statut',
        'date_echeance',
        'mois_groupe',
        'montant_principal',
        'majoration_estimee',
        'responsable',
        'severite',
        'fiche_instruction_id',
    ];

    protected $casts = [
        'date_echeance' => 'date',
        'montant_principal' => 'decimal:2',
        'majoration_estimee' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function declarations(): HasMany
    {
        return $this->hasMany(Declaration::class);
    }

    public function markAsAccomplished(string $quittanceRef, ?string $piecePath = null): Declaration
    {
        $this->update(['statut' => 'accomplie', 'majoration_estimee' => 0]);

        return $this->declarations()->create([
            'company_id' => $this->company_id,
            'reference_quittance' => $quittanceRef,
            'date_declaration' => now()->toDateString(),
            'montant_paye' => $this->montant_principal,
            'piece_justificative_path' => $piecePath,
            'validee' => true,
        ]);
    }
}
