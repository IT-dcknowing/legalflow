<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compliance_obligation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('reference_quittance')->nullable();
            $table->date('date_declaration');
            $table->decimal('montant_paye', 15, 2)->default(0);
            $table->string('piece_justificative_path')->nullable();
            $table->string('mode_paiement')->default('virement'); // 'virement', 'mobile_money_pro', 'cheque', 'especes'
            $table->boolean('validee')->default(true);
            $table->text('commentaires')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declarations');
    }
};
