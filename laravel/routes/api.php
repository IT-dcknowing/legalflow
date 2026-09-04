<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplianceScoreController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ObligationController;
use App\Http\Controllers\Api\PayrollTaxController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Legal Flow API Routes (Laravel 12 / PHP 8.3)
|--------------------------------------------------------------------------
| Moteurs fiscaux et sociaux ivoiriens, scoring DGI/CNPS/CMU et Sanctum auth.
*/

// Routes publiques / Authentification
Route::post('/auth/login', [AuthController::class, 'login']);

// Tableau de bord & Vue d'ensemble (Maquette)
Route::get('/dashboard', [DashboardController::class, 'index']);

// Obligations & Échéancier DGI/CNPS/CMU
Route::get('/obligations', [ObligationController::class, 'index']);
Route::post('/obligations', [ObligationController::class, 'store']);
Route::post('/obligations/{id}/mark-done', [ObligationController::class, 'markDone']);

// Moteur fiscal et social ivoirien (PayrollTaxEngine)
Route::prefix('/engines/payroll')->group(function () {
    Route::post('/calculate-employee', [PayrollTaxController::class, 'calculateSingle']);
    Route::post('/calculate-company', [PayrollTaxController::class, 'calculateCompany']);
});

// Moteur de scoring de conformité (ComplianceScoreEngine)
Route::prefix('/engines/compliance')->group(function () {
    Route::get('/score/{companyId}', [ComplianceScoreController::class, 'calculate']);
});

// Routes protégées par Laravel Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});
