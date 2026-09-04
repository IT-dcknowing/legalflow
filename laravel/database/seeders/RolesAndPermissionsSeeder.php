<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permissions de conformité ivoirienne
        $permissions = [
            'view-obligations',
            'declare-taxes',
            'validate-declarations',
            'manage-company-profile',
            'view-payroll-simulations',
            'run-compliance-scoring',
            'manage-legal-watch',
            'access-audit-reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Rôle : Super Administrateur / Juriste Fiscaliste
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $superAdmin->givePermissionTo(Permission::all());

        // Rôle : Gestionnaire CGA / Cabinet d'expertise comptable
        $gestionnaireCga = Role::firstOrCreate(['name' => 'gestionnaire-cga', 'guard_name' => 'web']);
        $gestionnaireCga->givePermissionTo([
            'view-obligations',
            'declare-taxes',
            'validate-declarations',
            'view-payroll-simulations',
            'run-compliance-scoring',
            'access-audit-reports',
            'manage-legal-watch',
        ]);

        // Rôle : Dirigeant PME (ex: Alex Koffi)
        $dirigeant = Role::firstOrCreate(['name' => 'dirigeant-pme', 'guard_name' => 'web']);
        $dirigeant->givePermissionTo([
            'view-obligations',
            'declare-taxes',
            'manage-company-profile',
            'view-payroll-simulations',
            'run-compliance-scoring',
            'access-audit-reports',
        ]);

        // Rôle : Comptable d'entreprise
        $comptable = Role::firstOrCreate(['name' => 'comptable', 'guard_name' => 'web']);
        $comptable->givePermissionTo([
            'view-obligations',
            'declare-taxes',
            'view-payroll-simulations',
        ]);
    }
}
