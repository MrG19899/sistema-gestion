import { useState, useEffect } from 'react';
// import { Save, Bell, Settings, Database, Server, UploadCloud } from 'lucide-react';
// import { Save, Bell, Settings, Database, Server, UploadCloud } from 'lucide-react';
import { Save } from 'lucide-react';
const Server = ({ className }: { className?: string }) => <span className={className}>🖥️</span>;
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../components/ui/tabs';

export const ConfigurationPage = () => {
    const [isLoading, setIsLoading] = useState(false);

    // Estado simulado de configuración
    const [config, setConfig] = useState({
        empresa: {
            nombre: 'Te Lo Limpio',
            rut: '76.123.456-7',
            direccion: 'Av. Providencia 1234, Santiago',
            email: 'contacto@telolimpio.cl',
            telefono: '+56 9 1234 5678'
        },
        notificaciones: {
            emailAlertas: true,
            emailDestinoAlertas: 'administracion@telolimpio.cl',
            diasAnticipacion: 3,
            emailResumenSemanal: true
        },
        sistema: {
            version: '1.0.0',
            modoMantenimiento: false,
            backupAutomatico: true
        }
    });

    // Fetch inicial al cargar la página
    useEffect(() => {
        const fetchConfig = async () => {
            const { data, error } = await supabase
                .from('configuracion')
                .select('*')
                .single();

            if (data && !error) {
                // Parseamos la info que viene plana a nuestra estructura de estado
                setConfig(prev => ({
                    ...prev,
                    empresa: {
                        nombre: data.empresa_nombre || prev.empresa.nombre,
                        rut: data.empresa_rut || prev.empresa.rut,
                        direccion: data.empresa_direccion || prev.empresa.direccion,
                        email: data.empresa_email || prev.empresa.email,
                        telefono: data.empresa_telefono || prev.empresa.telefono,
                    },
                    notificaciones: {
                        emailAlertas: data.notif_email_alertas ?? prev.notificaciones.emailAlertas,
                        emailDestinoAlertas: data.notif_email_destino ?? prev.notificaciones.emailDestinoAlertas,
                        diasAnticipacion: data.notif_dias_anticipacion ?? prev.notificaciones.diasAnticipacion,
                        emailResumenSemanal: data.notif_email_resumen ?? prev.notificaciones.emailResumenSemanal,
                    },
                    sistema: {
                        version: data.sys_version || prev.sistema.version,
                        modoMantenimiento: data.sys_mantenimiento ?? prev.sistema.modoMantenimiento,
                        backupAutomatico: data.sys_backup ?? prev.sistema.backupAutomatico,
                    }
                }));
            }
        };

        fetchConfig();
    }, []);

    const handleInputChange = (section: string, field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Upsert (Update or Insert) en la fila ID 1
            const payload = {
                id: 1, // Asumimos una única fila de configuración general
                empresa_nombre: config.empresa.nombre,
                empresa_rut: config.empresa.rut,
                empresa_direccion: config.empresa.direccion,
                empresa_email: config.empresa.email,
                empresa_telefono: config.empresa.telefono,

                notif_email_alertas: config.notificaciones.emailAlertas,
                notif_email_destino: config.notificaciones.emailDestinoAlertas,
                notif_dias_anticipacion: config.notificaciones.diasAnticipacion,
                notif_email_resumen: config.notificaciones.emailResumenSemanal,

                sys_version: config.sistema.version,
                sys_mantenimiento: config.sistema.modoMantenimiento,
                sys_backup: config.sistema.backupAutomatico,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('configuracion')
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;

            alert('Configuración guardada en la Nube exitosamente');
        } catch (error: any) {
            console.error('Error guardando configuración:', error.message);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
                <p className="text-muted-foreground">
                    Administra los parámetros generales del sistema.
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
                    <TabsTrigger value="sistema">Sistema</TabsTrigger>
                </TabsList>

                {/* Tab General */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de la Empresa</CardTitle>
                            <CardDescription>
                                Datos que aparecerán en reportes y correos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre">Nombre de Fantasía</Label>
                                <Input
                                    id="nombre"
                                    value={config.empresa.nombre}
                                    onChange={(e) => handleInputChange('empresa', 'nombre', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rut">RUT Empresa</Label>
                                <Input
                                    id="rut"
                                    value={config.empresa.rut}
                                    onChange={(e) => handleInputChange('empresa', 'rut', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="direccion">Dirección Comercial</Label>
                                <Input
                                    id="direccion"
                                    value={config.empresa.direccion}
                                    onChange={(e) => handleInputChange('empresa', 'direccion', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Contacto</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={config.empresa.email}
                                        onChange={(e) => handleInputChange('empresa', 'email', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="telefono">Teléfono</Label>
                                    <Input
                                        id="telefono"
                                        value={config.empresa.telefono}
                                        onChange={(e) => handleInputChange('empresa', 'telefono', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={isLoading}>
                                <Save className="mr-2 h-4 w-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Tab Notificaciones */}
                <TabsContent value="notificaciones">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alertas y Avisos</CardTitle>
                            <CardDescription>
                                Configura cuándo y cómo recibir notificaciones.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Alertas por Email</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Recibir correos cuando venzan servicios.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={config.notificaciones.emailAlertas}
                                        onChange={(e) => handleInputChange('notificaciones', 'emailAlertas', e.target.checked)}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dias">Días de anticipación para alertas</Label>
                                <Input
                                    id="dias"
                                    type="number"
                                    value={config.notificaciones.diasAnticipacion}
                                    onChange={(e) => handleInputChange('notificaciones', 'diasAnticipacion', parseInt(e.target.value))}
                                />
                            </div>
                            <div className="grid gap-2 border-t pt-4 border-border">
                                <Label htmlFor="emailDestino">Casilla de correo receptora de Alertas</Label>
                                <p className="text-[12px] text-muted-foreground mb-1">
                                    Aquí llegarán los avisos de vencimiento (Opción recomendada: correo interno de ventas).
                                </p>
                                <Input
                                    id="emailDestino"
                                    type="email"
                                    placeholder="ejemplo@telolimpio.cl"
                                    value={config.notificaciones.emailDestinoAlertas}
                                    onChange={(e) => handleInputChange('notificaciones', 'emailDestinoAlertas', e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={isLoading}>
                                <Save className="mr-2 h-4 w-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Tab Sistema */}
                <TabsContent value="sistema">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado del Sistema</CardTitle>
                            <CardDescription>
                                Opciones avanzadas y mantenimiento.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 rounded-lg border p-4 bg-muted/50">
                                <Server className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Versión del Sistema</p>
                                    <p className="text-sm text-muted-foreground">{config.sistema.version}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4 border-destructive/20 bg-destructive/5">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-destructive">Modo Mantenimiento</Label>
                                    <p className="text-sm text-destructive/80">
                                        Desactiva el acceso a usuarios no administradores.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive"
                                        checked={config.sistema.modoMantenimiento}
                                        onChange={(e) => handleInputChange('sistema', 'modoMantenimiento', e.target.checked)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Backup Automático</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Generar respaldos diarios de la base de datos.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={config.sistema.backupAutomatico}
                                        onChange={(e) => handleInputChange('sistema', 'backupAutomatico', e.target.checked)}
                                    />
                                </div>
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSave} disabled={isLoading}>
                                <Save className="mr-2 h-4 w-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
