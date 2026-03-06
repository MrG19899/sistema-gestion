import { useState, useEffect } from 'react';
// import { Plus, Search, Pencil, UserX, UserCheck, Trash2, Shield, ShieldAlert } from 'lucide-react';
const Plus = ({ className }: { className?: string }) => <span className={className}>+</span>;
const Search = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const Pencil = ({ className }: { className?: string }) => <span className={className}>✏️</span>;
const UserX = ({ className }: { className?: string }) => <span className={className}>🚫</span>;
const UserCheck = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Shield = ({ className }: { className?: string }) => <span className={className}>🛡️</span>;
const ShieldAlert = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import type { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Cliente Auxiliar "Estéril" para no pisar la sesión del Admin al registrar otros
const supabaseAdminClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

// Nueva interfaz SQL
export interface SupabaseUser {
    id: string;
    nombre: string;
    email: string;
    rol: UserRole;
    activo: boolean;
    created_at: string;
}

export const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<SupabaseUser[]>([]);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
    const [newUser, setNewUser] = useState<{
        nombre: string;
        email: string;
        rol: UserRole;
        password?: string; // Solo para creación
    }>({
        nombre: '',
        email: '',
        rol: 'worker',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setUsers(data as SupabaseUser[]);
        }
    };

    const filteredUsers = users.filter(user =>
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUser.password || newUser.password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        // 1. Crear en auth.users a través del cliente secundario (sin persistencia local)
        const { data: authData, error: authError } = await supabaseAdminClient.auth.signUp({
            email: newUser.email,
            password: newUser.password,
            options: {
                data: {
                    nombre: newUser.nombre,
                    rol: newUser.rol
                }
            }
        });

        if (authError) {
            alert('Error grabando credenciales (Auth): ' + authError.message);
            return;
        }

        const newUserId = authData.user?.id;

        if (!newUserId) {
            alert('No se pudo obtener el ID del usuario creado');
            return;
        }

        // 2. Insertar en la tabla pública "usuarios"
        const insertData = {
            id: newUserId,
            nombre: newUser.nombre,
            email: newUser.email,
            rol: newUser.rol,
            activo: true
        };

        const { data, error } = await supabase
            .from('usuarios')
            .insert([insertData])
            .select();

        if (error) {
            // Un buen sistema realizaría rollback aquí si falla la tabla pública
            alert('Advertencia: Credencial creada, pero error en tabla pública: ' + error.message);
            return;
        }

        if (data && data.length > 0) {
            setUsers([...users, data[0] as SupabaseUser]);
            setIsAddUserOpen(false);
            setNewUser({ nombre: '', email: '', rol: 'worker', password: '' });
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        const { error } = await supabase
            .from('usuarios')
            .update({ nombre: newUser.nombre, rol: newUser.rol })
            .eq('id', selectedUser.id);

        if (!error) {
            const updatedUsers = users.map(u =>
                u.id === selectedUser.id
                    ? { ...u, nombre: newUser.nombre, rol: newUser.rol }
                    : u
            );
            setUsers(updatedUsers);
            setIsEditUserOpen(false);
            setSelectedUser(null);
        }
    };

    const openEditDialog = (user: SupabaseUser) => {
        setSelectedUser(user);
        setNewUser({
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
        });
        setIsEditUserOpen(true);
    };

    const toggleUserStatus = async (userId: string) => {
        const currentUser = users.find(u => u.id === userId);
        if (!currentUser) return;

        const { error } = await supabase
            .from('usuarios')
            .update({ activo: !currentUser.activo })
            .eq('id', userId);

        if (!error) {
            const updatedUsers = users.map(u =>
                u.id === userId
                    ? { ...u, activo: !u.activo }
                    : u
            );
            setUsers(updatedUsers);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            const { error } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', userId);

            if (!error) {
                setUsers(users.filter(u => u.id !== userId));
            }
        }
    };

    const getRoleBadgeVariant = (role: UserRole) => {
        switch (role) {
            case 'adminsupremo': return 'default';
            case 'admin': return 'secondary';
            case 'worker': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground">
                        Gestiona el acceso y roles de los usuarios del sistema.
                    </p>
                </div>
                <Button onClick={() => setIsAddUserOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Usuarios</CardTitle>
                    <CardDescription>
                        {filteredUsers.length} usuario(s) registrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar usuarios..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.nombre}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.rol)}>
                                                {user.rol === 'adminsupremo' && <ShieldAlert className="w-3 h-3 mr-1 inline text-yellow-500" />}
                                                {user.rol === 'admin' && <ShieldAlert className="w-3 h-3 mr-1 inline" />}
                                                {user.rol === 'worker' && <Shield className="w-3 h-3 mr-1 inline" />}
                                                {user.rol === 'adminsupremo' ? 'ADMIN SUPREMO' : user.rol.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.activo ? 'success' : 'destructive'}>
                                                {user.activo ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleUserStatus(user.id)}
                                                    title={user.activo ? "Desactivar" : "Activar"}
                                                >
                                                    {user.activo ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog Agregar Usuario */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            Crea un nuevo acceso para el personal.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre Completo</Label>
                            <Input id="nombre" name="nombre" value={newUser.nombre} onChange={handleInputChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" value={newUser.email} onChange={handleInputChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña (Mínimo 6 caracteres)</Label>
                            <Input id="password" name="password" type="text" placeholder="******" value={newUser.password || ''} onChange={handleInputChange} required />
                            <p className="text-xs text-muted-foreground">Esta será la contraseña que le entregarás al trabajador para acceder.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rol">Rol</Label>
                            <select
                                id="rol"
                                name="rol"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newUser.rol}
                                onChange={handleInputChange}
                            >
                                <option value="admin">Administrador Regular</option>
                                <option value="worker">Trabajador</option>
                                <option value="adminsupremo">Admin Supremo</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Crear Usuario</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar Usuario */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Modificar permisos y datos del usuario.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditUser} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-nombre">Nombre Completo</Label>
                            <Input id="edit-nombre" name="nombre" value={newUser.nombre} onChange={handleInputChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input id="edit-email" name="email" type="email" value={newUser.email} disabled className="bg-muted" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-rol">Rol</Label>
                            <select
                                id="edit-rol"
                                name="rol"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newUser.rol}
                                onChange={handleInputChange}
                            >
                                <option value="admin">Administrador Regular</option>
                                <option value="worker">Trabajador</option>
                                <option value="adminsupremo">Admin Supremo</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
