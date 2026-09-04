<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Declaration extends Model
{
    use HasFactory;

    protected $fillable = [
        'compliance_obligation_id',
        'company_id',
        'reference_quittance',
        'date_declaration',
        'montant_paye',
        'piece_justificative_path',
        'mode_paiement',
        'validee',
        'commentaires',
    ];

    protected $casts = [
        'date_declaration' => 'date',
        'montant_paye' => 'decimal:2',
        'validee' => 'boolean',
    ];

    public function obligation(): BelongsTo
    {
        return $this->belongsTo(ComplianceObligation::class, 'compliance_obligation_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
