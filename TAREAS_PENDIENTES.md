# Sistema de Gestión - Plan de Implementación

**Fecha de actualización:** 07/02/2026  
**Estado:** Listo para comenzar FASE 1

---

## 📋 Estado Actual del Sistema

### ✅ Módulos Operativos
- **Dashboard** - Métricas y visión general
- **Clientes** - CRUD básico (falta edición y soft delete)
- **Alfombras** - Gestión de limpieza en taller
- **Limpieza** - Servicios de aseo general
- **Control de Plagas** - Básico (sin trampas ni certificados)

### ⚠️ Pendientes de Mantenimiento
- [x] Verificar y actualizar fechas en PlagasPage (deben estar en 2026)
- [x] Verificar y actualizar fechas en LimpiezaPage (deben estar en 2026)
- [x] Fechas en AlfombrasPage actualizadas a 2026

---

## 🚀 FASE 1: Módulo Control de Plagas Completo (2-3 semanas)

### Semana 1: Entidades Base y Trampas
- [ ] Crear modelo de datos (TypeScript interfaces)
  - `Trampa`
  - `ServicioControlPlagas`
  - `ServicioTrampa`
  - `Alfombra` (mejorado)
  - `ServicioLimpieza` (mejorado)
- [ ] Componente `QuickClientCreateModal`
  - Modal para crear cliente rápido
  - Integración con `ClientAutocomplete`
  - Opción "+ Crear nuevo cliente" en dropdown
- [ ] CRUD de Trampas por Cliente
  - Agregar trampa con número único por cliente
  - Editar ubicación y tipo
  - Marcar como activa/inactiva/baja
  - Vista en pestaña de detalle cliente
- [ ] Mejorar módulo Clientes
  - Implementar edición completa
  - Soft delete (inactivo en lugar de eliminar)
  - Vista detalle con pestañas (Datos, Trampas, Servicios, Certificados)

### Semana 2: Flujo de Servicio
- [ ] Programación de servicios de control
  - Seleccionar cliente
  - Ver trampas activas
  - Asignar técnico y fecha
- [ ] Ejecución de servicio
  - Checklist de trampas del cliente
  - Marcar revisada / cebo cambiado
  - Tipo de cebo usado
  - Observaciones por trampa
- [ ] Estados de servicio (pendiente/en_proceso/completado/cancelado)

### Semana 3: Certificados PDF
- [ ] Generar certificado PDF automático
  - Plantilla profesional con logo
  - Tabla detallada de trampas
  - Totales de revisiones y cambios de cebo
  - Número certificado auto-incremental (CERT-2026-XXXX)
- [ ] Descargar PDF
- [ ] Compartir por WhatsApp con cliente
- [ ] Historial de certificados por cliente
- [ ] Bloqueo de edición de servicios certificados

### Mejoras Paralelas (Durante FASE 1)
- [ ] Soft delete en todos los módulos
- [ ] Mejorar consistencia de UI entre módulos

---

## 📊 FASE 2: Mejoras Operativas (1-2 semanas)

### Control de Plagas
- [ ] Sistema de alertas visuales (servicios por vencer)
- [ ] Reportes básicos (servicios por técnico, por período)
- [ ] Renovación automática de servicios

### Alfombras
- [ ] Generación de comprobantes/etiquetas
- [ ] Sistema de códigos QR para tracking interno
- [ ] Reportes de productividad (m² por día, tiempo promedio)

### Limpieza
- [ ] Plantillas de servicios recurrentes
- [ ] Tracking de materiales consumidos
- [ ] Cotizaciones automáticas

### Reportes Generales
- [ ] Página de reportes completa
- [ ] Visualizaciones de datos (gráficos, métricas)
- [ ] Reportes de ingresos y facturación
- [ ] Exportación a PDF/Excel

---

## 🔧 FASE 3: Backend y Avanzado (Futuro)

- [ ] Backend real con base de datos (PostgreSQL/MySQL)
- [ ] API RESTful
- [ ] Sistema de usuarios y permisos
- [ ] PWA para uso móvil offline
- [ ] Integración WhatsApp Business API (envío automático)
- [ ] QR de validación pública de certificados
- [ ] Dashboard analítico avanzado

---

## 📝 Notas Importantes

### Arquitectura de Datos
El sistema maneja **3 líneas de servicio** que coexisten:
1. **Control de Plagas** (con trampas) - FASE 1 implementa esto
2. **Alfombras** (limpieza en taller) - Ya operativo
3. **Limpieza/Aseo General** - Ya operativo

Un mismo cliente puede tener múltiples servicios de diferentes tipos simultáneamente.

### Decisiones Técnicas
- ✅ Compartir certificados por **WhatsApp** (más práctico que email)
- ✅ Sin app móvil nativa en FASE 1 (web responsive suficiente)
- ✅ Sin QR ni firma digital en FASE 1 (dejar para FASE 3)
- ✅ Sin fotos de trampas en FASE 1 (optimizar después)
- ✅ TRAMPA vs SERVICIO_TRAMPA:
  - TRAMPA = objeto físico permanente
  - SERVICIO_TRAMPA = registro de cada visita/mantención

### Validaciones Críticas
- Número de trampa único por cliente (no globalmente)
- Soft delete de clientes (no eliminar, inactivar)
- Servicios con certificado generado → bloqueados para edición
- Cliente puede tener servicios de múltiples tipos

---

## 🎯 Próximo Paso

**Comenzar FASE 1 - Semana 1:** Crear modelo de datos y componente QuickClientCreateModal
