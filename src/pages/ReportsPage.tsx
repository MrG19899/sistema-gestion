import React, { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
const ListTodo = ({ className }: { className?: string }) => <span className={className}>📋</span>;
const Plus = ({ className }: { className?: string }) => <span className={className}>➕</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Download = ({ className }: { className?: string }) => <span className={className}>📥</span>;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { subMonths, startOfMonth } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

export const ReportsPage: React.FC = () => {
    const { profile } = useAuth();
    const [period, setPeriod] = useState('6m');
    const [serviceTypeData, setServiceTypeData] = useState<{ name: string, value: number, color: string }[]>([]);

    // Todos en línea (Supabase notas_muro)
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        fetchTodos();

        const channel = supabase
            .channel('reportes_notas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_muro' }, () => {
                fetchTodos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTodos = async () => {
        const { data, error } = await supabase
            .from('notas_muro')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTodos(data.map(n => ({
                id: n.id,
                text: n.texto,
                completed: !n.fijada
            })));
        }
    };

    // Variables estadísticas abolidas
    useEffect(() => {
        fetchReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    const fetchReportData = async () => {
        let monthsBack = 6;
        if (period === '1m') monthsBack = 1;
        if (period === '3m') monthsBack = 3;
        if (period === '1y') monthsBack = 12;

        const startDate = startOfMonth(subMonths(new Date(), monthsBack - 1));

        // 1. Obtener Datos
        const [{ data: limpiezas }, { data: plagas }, { data: alfombras }] = await Promise.all([
            supabase.from('servicios_limpieza').select('created_at').gte('created_at', startDate.toISOString()),
            // Plagas asume ticket promedio 90.000 para fines ilustrativos si es que no guardamos "valor_total"
            supabase.from('servicios_plagas').select('created_at, tecnico_asignado').gte('created_at', startDate.toISOString()),
            supabase.from('servicios_alfombras').select('created_at, valor_total').gte('created_at', startDate.toISOString())
        ]);

        // 2. Procesamiento de Cantidades
        let tServices = 0;

        limpiezas?.forEach(() => tServices++);

        // Procesamiento omitiendo techCounts
        plagas?.forEach(() => {
            tServices++;
        });

        alfombras?.forEach(() => tServices++);

        // Procesamiento de Cantidades finalizado

        // 3. Distribución de servicios en pie chart
        const totalCat = (plagas?.length || 0) + (limpiezas?.length || 0) + (alfombras?.length || 0) || 1;
        setServiceTypeData([
            { name: 'Control Plagas', value: Math.round(((plagas?.length || 0) / totalCat) * 100), color: '#f97316' },
            { name: 'Limpieza', value: Math.round(((limpiezas?.length || 0) / totalCat) * 100), color: '#0ea5e9' },
            { name: 'Alfombras', value: Math.round(((alfombras?.length || 0) / totalCat) * 100), color: '#8b5cf6' },
        ]);

        // (Gráfico de técnicos removido por decisión del usuario)
    };

    // (Sección de stats removida por decisión UI/UX, para enfocar el dashboard en operativas)

    const toggleTodo = async (id: string) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        // Optimistic update
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

        await supabase
            .from('notas_muro')
            .update({ fijada: todo.completed }) // Si estaba "completo" (fijada=false), al togglearlo queda "incompleto" (fijada=true)
            .eq('id', id);
    };

    const addTodo = async () => {
        if (!newTodo.trim()) return;

        const payload = {
            texto: newTodo,
            autor: profile?.nombre || profile?.email?.split('@')[0] || 'Desconocido',
            creador_id: profile?.id || 'temp',
            fijada: true,
            tipo: JSON.stringify({ category: 'general', priority: 'media' })
        };

        setNewTodo('');
        await supabase.from('notas_muro').insert([payload]);
    };

    const deleteTodo = async (id: string) => {
        if (confirm('¿Eliminar esta tarea permanente?')) {
            setTodos(todos.filter(t => t.id !== id));
            await supabase.from('notas_muro').delete().eq('id', id);
        }
    };

    const exportToCSV = () => {
        alert("La exportación en esta vista se encuentra temporalmente inhabilitada. Rediríjase al panel específico de servicios.");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white neon-glow">Reportes y Estadísticas</h2>
                    <p className="text-gray-400 mt-1 font-medium">
                        Análisis detallado del rendimiento de tu negocio.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
                    <Button
                        variant={period === '1m' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('1m')}
                        className={period === '1m'
                            ? 'bg-primary text-white shadow-neon-blue font-bold'
                            : 'text-gray-300 hover:text-white hover:bg-white/10 font-medium'}
                    >
                        1 Mes
                    </Button>
                    <Button
                        variant={period === '3m' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('3m')}
                        className={period === '3m'
                            ? 'bg-primary text-white shadow-neon-blue font-bold'
                            : 'text-gray-300 hover:text-white hover:bg-white/10 font-medium'}
                    >
                        3 Meses
                    </Button>
                    <Button
                        variant={period === '6m' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('6m')}
                        className={period === '6m'
                            ? 'bg-primary text-white shadow-neon-blue font-bold'
                            : 'text-gray-300 hover:text-white hover:bg-white/10 font-medium'}
                    >
                        6 Meses
                    </Button>
                    <Button
                        variant={period === '1y' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('1y')}
                        className={period === '1y'
                            ? 'bg-primary text-white shadow-neon-blue font-bold'
                            : 'text-gray-300 hover:text-white hover:bg-white/10 font-medium'}
                    >
                        1 Año
                    </Button>
                </div>
                <Button
                    variant="outline"
                    onClick={exportToCSV}
                    className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary-foreground transition-all duration-200"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Removed Stats Grid via User Request */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Todo List / Boletín */}
                <Card className="lg:col-span-2 shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">Boletín de Suministros y Tareas</CardTitle>
                            <CardDescription>Control operativo de faltantes e insumos</CardDescription>
                        </div>
                        <ListTodo className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col h-[300px]">
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {todos.length === 0 && (
                                <p className="text-center text-muted-foreground mt-10 font-medium">No hay tareas o insumos pendientes. 🎉</p>
                            )}
                            {todos.map(todo => (
                                <div key={todo.id} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 w-full">
                                        <input
                                            type="checkbox"
                                            checked={todo.completed}
                                            onChange={() => toggleTodo(todo.id)}
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        <span className={`text-sm font-medium w-full select-none cursor-pointer ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`} onClick={() => toggleTodo(todo.id)}>
                                            {todo.text}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-white hover:bg-red-500 ml-2 rounded-full h-8 w-8 p-0 shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2 border-t pt-4">
                            <Input
                                placeholder="Ej: Comprar detergente litio, Revisar cinta."
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                                className="bg-slate-50 border-slate-200"
                            />
                            <Button onClick={addTodo} className="shrink-0 font-bold bg-primary hover:bg-primary/90 text-white">
                                <Plus className="h-4 w-4 mr-1" /> Añadir
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Distribution Pie */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Distribución de Servicios</CardTitle>
                        <CardDescription>Porcentaje por línea de negocio</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2">
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {serviceTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full mt-4">
                            {serviceTypeData.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-gray-600">{item.name}</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Componente "Productividad por Técnico" completamente removido mediante solicitud del usuario */}

            {/* Additional Metrics / Highlights (Comentado temporalmente por falta de relevancia)
            <Card className="shadow-sm border-none bg-white">
                <CardHeader>
                    <CardTitle className="text-lg">Hitos y Alertas</CardTitle>
                    <CardDescription>Eventos clave detectados este mes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                        <div className="bg-orange-500 p-1.5 rounded-full mt-0.5">
                            <Calendar className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-orange-900">8 Vencimientos Próximos</p>
                            <p className="text-xs text-orange-700 mt-1">Servicios de control de plagas que vencen en los próximos 15 días.</p>
                            <Button variant="link" size="sm" className="h-auto p-0 text-orange-800 font-bold decoration-orange-800/30 mt-1">Ver detalles</Button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                        <div className="bg-green-500 p-1.5 rounded-full mt-0.5">
                            <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-green-900">Meta Mensual Alcanzada</p>
                            <p className="text-xs text-green-700 mt-1">Se ha superado el objetivo de ingresos propuesto para el mes de Junio.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="bg-blue-500 p-1.5 rounded-full mt-0.5">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-blue-900">5 Nuevos Clientes</p>
                            <p className="text-xs text-blue-700 mt-1">Se han registrado nuevos contratos corporativos esta semana.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            */}
        </div>
    );
};
