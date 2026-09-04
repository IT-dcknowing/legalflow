<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'forme_juridique',
        'rccm',
        'ncc',
        'secteur',
        'regime_fiscal',
        'ca_annuel',
        'ca_cumule_exercice',
        'effectif_salaries',
        'salaries_cmu_affilies',
        'masse_salariale_annuelle',
        'cga_adherent',
        'cga_nom',
        'numero_cnps',
        'assujetti_tva',
        'importateur',
        'code_importateur',
        'nombre_balances',
        'predicats',
    ];

    protected $casts = [
        'ca_annuel' => 'decimal:2',
        'ca_cumule_exercice' => 'decimal:2',
        'masse_salariale_annuelle' => 'decimal:2',
        'cga_adherent' => 'boolean',
        'assujetti_tva' => 'boolean',
        'importateur' => 'boolean',
        'predicats' => 'array',
    ];

    public function obligations(): HasMany
    {
        return $this->hasMany(ComplianceObligation::class);
    }

    public function declarations(): HasMany
    {
        return $this->hasMany(Declaration::class);
    }
}
