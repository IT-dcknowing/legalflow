<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_obligations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('rule_code');
            $table->string('titre');
            $table->text('description')->nullable();
            $table->string('domaine'); // 'fiscal', 'social', 'douanes', 'commerce', 'administratif'
            $table->string('statut')->default('a_venir'); // 'en_retard', 'imminente', 'a_venir', 'accomplie'
            $table->date('date_echeance');
            $table->string('mois_groupe')->default('Août 2026');
            $table->decimal('montant_principal', 15, 2)->default(0);
            $table->decimal('majoration_estimee', 15, 2)->default(0);
            $table->string('responsable')->nullable();
            $table->string('severite')->default('majeure'); // 'bloquante', 'majeure', 'mineure'
            $table->string('fiche_instruction_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_obligations');
    }
};
