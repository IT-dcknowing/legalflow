<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('forme_juridique')->default('SARL'); // SARL, SA, SAS, EI
            $table->string('rccm')->nullable();
            $table->string('ncc')->nullable(); // Numéro Compte Contribuable DGI
            $table->string('secteur')->default('BTP'); // BTP, Commerce, Industrie, Services
            $table->string('regime_fiscal')->default('RSI'); // RSI, RNI, RME, TEE
            $table->decimal('ca_annuel', 15, 2)->default(180000000);
            $table->decimal('ca_cumule_exercice', 15, 2)->default(120000000);
            $table->unsignedInteger('effectif_salaries')->default(14);
            $table->unsignedInteger('salaries_cmu_affilies')->default(12);
            $table->decimal('masse_salariale_annuelle', 15, 2)->default(48000000);
            $table->boolean('cga_adherent')->default(true);
            $table->string('cga_nom')->nullable()->default('CGA Adjamé');
            $table->string('numero_cnps')->nullable()->default('118-2024-XXXX');
            $table->boolean('assujetti_tva')->default(true);
            $table->boolean('importateur')->default(false);
            $table->string('code_importateur')->nullable();
            $table->unsignedInteger('nombre_balances')->default(0);
            $table->json('predicats')->nullable(); // ['employeur' => true, 'chantiers_btp' => true]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
