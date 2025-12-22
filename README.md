# 🛒 Chulada POS

Sistema de Punto de Venta para **Qué Chulada** - Tienda de cosméticos.

## 🚀 Stack Tecnológico

- **Desktop:** Tauri 2.0 + React 19 + TypeScript
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Database:** SQLite (rusqlite)
- **Sync:** Supabase (Placeholder)
- **Testing:** Vitest + Playwright

## 📋 Requisitos

- Node.js 18+ (Recomendado: v20 o v22)
- Rust 1.77+ (Requerido para Tauri v2)
- npm

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone git@github.com:aragel-soft/chulada-pos.git
cd chulada-pos

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Instalar navegadores para pruebas E2E (solo una vez)
npx playwright install

# Ejecutar en desarrollo
npm run tauri dev
````

## 🧪 Testing

```bash
# Pruebas unitarias (Vitest)
npm run test

# Pruebas unitarias con Interfaz (UI)
npm run test:ui

# Pruebas E2E (WebDriverIO)
# Nota: Requiere tener la aplicación corriendo o configurada en wdio.conf.js
npm run test:e2e
```

## 📦 Build

```bash
npm run tauri build
```

## 📁 Estructura del Proyecto

```
chulada-pos/
├── src/              # Frontend React (Vite)
├── src-tauri/        # Backend Rust (Tauri 2.0 Core)
├── test/
│   └── e2e/          # Tests de integración con WebDriverIO
└── README.md
```

## 👥 Equipo

**Aragel Software**

  - Aramis Jasso (Scrum Master / Developer)
  - Miguel López (Product Owner / Developer)

## 📄 Licencia

Privado - © 2025 Aragel Software
