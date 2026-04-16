# Sistema de Gestión Electoral — Campaña Presidente Franco

## Descripción

App React + Vite para gestión de votantes de una campaña política en Presidente Franco, Paraguay.
Permite registro, control de acceso por roles y exportación a Excel.

## Stack

- **Frontend:** React (JSX) + Vite
- **Base de datos:** Supabase (PostgreSQL)
- **Estilos:** CSS en `src/styles.css` (sin Tailwind en este proyecto)
- **Export:** ExcelJS + file-saver + XLSX

## Estructura

```
src/
├── App.jsx              # Componente raíz, enrutamiento por rol
├── main.jsx             # Entry point
├── styles.css           # Estilos globales
├── components/
│   ├── LoginScreen.jsx  # Pantalla de login
│   └── Logos.jsx        # Logos institucionales
├── lib/                 # Cliente Supabase y configuración
├── utils/
│   └── helpers.js       # Utilidades compartidas
└── img/                 # Assets gráficos
```

## Reglas de Negocio Críticas

- **IDs de votantes:** pueden repetirse entre diferentes miembros del equipo, pero deben ser únicos dentro del mismo miembro
- **Roles:** control de acceso por rol (admin / miembro de equipo)
- **Módulo activo:** Concejal 2026 (ver App.jsx línea 217)

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

## Variables de Entorno

Requiere `.env` con las credenciales de Supabase:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Notas para Claude

- El proyecto usa JSX puro (sin TypeScript en los componentes principales)
- No agregar Tailwind sin confirmar primero
- Las exportaciones Excel son funcionalidad crítica — no modificar sin revisar helpers.js
- Supabase es la única fuente de verdad; toda lógica de permisos debe validarse contra la DB
