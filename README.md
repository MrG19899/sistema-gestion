# Sistema de Gestión - Te lo limpio

Sistema interno de gestión para servicios de limpieza y control de plagas.

## 🚀 Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **UI**: TailwindCSS
- **Routing**: React Router DOM
- **PWA**: Instalable como aplicación

## 📋 Requisitos previos

- Node.js 18+ instalado
- Cuenta de Firebase (gratuita)

## ⚙️ Configuración

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto (o usa uno existente)
3. En el proyecto, agrega una aplicación web
4. Copia las credenciales de configuración
5. Actualiza `src/firebase.ts` con tus credenciales:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 2. Habilitar servicios de Firebase

En Firebase Console:

#### Authentication
1. Ve a "Authentication" → "Sign-in method"
2. Habilita "Email/Password"

#### Firestore Database
1. Ve a "Firestore Database"
2. Crea la base de datos en modo "production"
3. Configura las reglas de seguridad (ver abajo)

#### Storage
1. Ve a "Storage"
2. Crea el bucket de almacenamiento
3. Configura las reglas de seguridad

### 3. Reglas de Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Los usuarios solo pueden leer su propio perfil
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.rol == 'admin';
    }
    
    // Todas las demás colecciones requieren autenticación
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Crear usuario administrador inicial

En Firebase Console → Authentication → Users → Add user:
- Email: admin@telolimpio.cl
- Password: (elige una contraseña segura)

Luego, en Firestore Database, crea manualmente un documento en la colección `users`:
- ID del documento: (copiar el UID del usuario que acabas de crear)
- Campos:
  ```json
  {
    "uid": "UID_DEL_USUARIO",
    "email": "admin@telolimpio.cl",
    "nombre": "Administrador",
    "rol": "admin",
    "activo": true,
    "createdAt": (timestamp actual)
  }
  ```

## 🏃 Ejecutar en desarrollo

```bash
# Instalar dependencias (ya hecho)
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🔐 Login inicial

- Email: admin@telolimpio.cl
- Password: (la que configuraste)

## 📦 Build para producción

```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/`

## 🌐 Deploy

### Opción 1: Firebase Hosting (Recomendado)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar hosting
firebase init hosting

# Deploy
firebase deploy
```

### Opción 2: Vercel

1. Sube el código a GitHub
2. Conecta el repositorio en [Vercel](https://vercel.com)
3. Deploy automático

## 📱 Instalar como PWA

Una vez desplegado:

### En Windows
1. Abre la app en Chrome o Edge
2. Click en el ícono de instalación en la barra de direcciones
3. Confirmar instalación

### En Android
1. Abre la app en Chrome
2. Menu (⋮) → "Agregar a pantalla de inicio"

### En iOS
1. Abre en Safari
2. Botón "Compartir" → "Agregar a inicio"

## 📝 Estructura del proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── Layout/       # Navbar, Sidebar, MainLayout
│   └── ProtectedRoute.tsx
├── contexts/         # React contexts
│   └── AuthContext.tsx
├── pages/            # Páginas principales
│   ├── Dashboard.tsx
│   └── Login.tsx
├── types/            # TypeScript types
│   └── index.ts
├── firebase.ts       # Configuración de Firebase
├── App.tsx           # App principal con routing
├── main.tsx          # Entry point
└── index.css         # Estilos globales
```

## 🔄 Próximos pasos

1. ✅ Configurar Firebase
2. ✅ Crear usuario admin
3. ⏳ Implementar módulo de Clientes
4. ⏳ Implementar módulo de Limpieza
5. ⏳ Implementar módulo de Control de Plagas
6. ⏳ Generación de PDFs
7. ⏳ Dashboard con datos reales

## 🆘 Soporte

Para preguntas o problemas, contacta al desarrollador.
