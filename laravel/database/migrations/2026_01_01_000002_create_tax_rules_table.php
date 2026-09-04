<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rules', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // ex: 'tva_mensuelle', 'cnps_cotisations', 'cmu_mensuelle'
            $table->string('titre');
            $table->string('administration'); // 'DGI', 'CNPS', 'CMU', 'COMMERCE', 'GREFFE'
            $table->string('domaine'); // 'fiscal', 'social', 'commerce', 'juridique'
            $table->string('base_legale');
            $table->string('periodicite'); // 'mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle'
            $table->unsignedSmallInteger('jour_echeance')->nullable(); // ex: 10 pour DGI, 15 pour CNPS, 20 pour RME
            $table->unsignedSmallInteger('mois_echeance')->nullable(); // ex: 3 pour 30 mars (DISA)
            $table->json('regimes_applicables'); // ['RSI', 'RNI', 'all']
            $table->json('secteurs_applicables'); // ['BTP', 'all']
            $table->string('severite')->default('majeure'); // 'bloquante', 'majeure', 'mineure'
            $table->text('description')->nullable();
            $table->string('penalite_formule')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rules');
    }
};
