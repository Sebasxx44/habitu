<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'barbershops' => [
                ['name' => 'Ver barberías', 'slug' => 'barbershops.view', 'description' => 'Ver lista de barberías'],
                ['name' => 'Crear barbería', 'slug' => 'barbershops.create', 'description' => 'Crear nueva barbería'],
                ['name' => 'Editar barbería', 'slug' => 'barbershops.edit', 'description' => 'Editar barbería'],
                ['name' => 'Eliminar barbería', 'slug' => 'barbershops.delete', 'description' => 'Eliminar barbería'],
            ],
            'barbers' => [
                ['name' => 'Ver barberos', 'slug' => 'barbers.view', 'description' => 'Ver barberos'],
                ['name' => 'Crear barbero', 'slug' => 'barbers.create', 'description' => 'Crear barbero'],
                ['name' => 'Editar barbero', 'slug' => 'barbers.edit', 'description' => 'Editar barbero'],
                ['name' => 'Eliminar barbero', 'slug' => 'barbers.delete', 'description' => 'Eliminar barbero'],
            ],
            'clients' => [
                ['name' => 'Ver clientes', 'slug' => 'clients.view', 'description' => 'Ver clientes'],
                ['name' => 'Crear cliente', 'slug' => 'clients.create', 'description' => 'Crear cliente'],
                ['name' => 'Editar cliente', 'slug' => 'clients.edit', 'description' => 'Editar cliente'],
                ['name' => 'Eliminar cliente', 'slug' => 'clients.delete', 'description' => 'Eliminar cliente'],
            ],
            'appointments' => [
                ['name' => 'Ver citas', 'slug' => 'appointments.view', 'description' => 'Ver citas'],
                ['name' => 'Crear cita', 'slug' => 'appointments.create', 'description' => 'Crear cita'],
                ['name' => 'Editar cita', 'slug' => 'appointments.edit', 'description' => 'Editar cita'],
                ['name' => 'Cancelar cita', 'slug' => 'appointments.cancel', 'description' => 'Cancelar cita'],
            ],
            'services' => [
                ['name' => 'Ver servicios', 'slug' => 'services.view', 'description' => 'Ver servicios'],
                ['name' => 'Gestionar servicios', 'slug' => 'services.manage', 'description' => 'Crear/editar servicios'],
            ],
            'users' => [
                ['name' => 'Ver usuarios', 'slug' => 'users.view', 'description' => 'Ver usuarios'],
                ['name' => 'Crear usuario', 'slug' => 'users.create', 'description' => 'Crear usuario'],
                ['name' => 'Editar usuario', 'slug' => 'users.edit', 'description' => 'Editar usuario'],
                ['name' => 'Eliminar usuario', 'slug' => 'users.delete', 'description' => 'Eliminar usuario'],
            ],
            'roles' => [
                ['name' => 'Ver roles', 'slug' => 'roles.view', 'description' => 'Ver roles y permisos'],
                ['name' => 'Gestionar roles', 'slug' => 'roles.manage', 'description' => 'Crear/editar roles'],
            ],
            'reports' => [
                ['name' => 'Ver reportes', 'slug' => 'reports.view', 'description' => 'Ver reportes'],
                ['name' => 'Exportar reportes', 'slug' => 'reports.export', 'description' => 'Exportar reportes'],
            ],
            'settings' => [
                ['name' => 'Configurar perfil', 'slug' => 'settings.profile', 'description' => 'Configurar perfil personal'],
                ['name' => 'Configuración global', 'slug' => 'settings.manage', 'description' => 'Gestionar configuración'],
            ],
        ];

        foreach ($permissions as $group => $perms) {
            foreach ($perms as $perm) {
                Permission::updateOrCreate(['slug' => $perm['slug']], [
                    'name' => $perm['name'],
                    'group' => $group,
                    'description' => $perm['description'],
                ]);
            }
        }

        $roles = [
            ['name' => 'Superadministrador', 'slug' => 'superadmin', 'type' => 'system', 'description' => 'Acceso total al sistema'],
            ['name' => 'Administrador', 'slug' => 'admin', 'type' => 'system', 'description' => 'Administrador de barbería'],
            ['name' => 'Profesional', 'slug' => 'professional', 'type' => 'system', 'description' => 'Profesional empleado'],
            ['name' => 'Cliente', 'slug' => 'client', 'type' => 'system', 'description' => 'Cliente de barbería'],
        ];

        $allPerms = Permission::pluck('id')->toArray();
        $adminPerms = Permission::whereIn('group', ['barbers', 'clients', 'appointments', 'services', 'settings'])->pluck('id')->toArray();
        $professionalPerms = Permission::whereIn('group', ['appointments'])->pluck('id')->toArray();
        $clientPerms = Permission::whereIn('group', ['appointments', 'services'])->pluck('id')->toArray();

        foreach ($roles as $roleData) {
            $role = Role::updateOrCreate(['slug' => $roleData['slug']], $roleData);

            if ($roleData['slug'] === 'superadmin') {
                $role->permissions()->sync($allPerms);
            } elseif ($roleData['slug'] === 'admin') {
                $role->permissions()->sync($adminPerms);
            } elseif ($roleData['slug'] === 'professional') {
                $role->permissions()->sync($professionalPerms);
            } elseif ($roleData['slug'] === 'client') {
                $role->permissions()->sync($clientPerms);
            }
        }

        $this->command->info('Seeded: ' . Role::count() . ' roles, ' . Permission::count() . ' permisos');
    }
}
