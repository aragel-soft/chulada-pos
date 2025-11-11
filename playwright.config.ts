import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para testing E2E con Tauri
 */
export default defineConfig({
  testDir: './e2e',
  
  // Global setup - espera a que Tauri esté 100% listo
  globalSetup: './e2e/global-setup.ts',
  
  // Timeout extendido para Tauri (la app tarda en iniciar)
  timeout: 30000,
  
  // Configuración de expect
  expect: {
    timeout: 10000, // Aumentado para comandos Tauri
  },
  
  // CRÍTICO: No correr en paralelo con Tauri
  fullyParallel: false,
  
  // Fallar build si hay tests marcados como .only
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 1,
  
  // Workers - Solo 1 para evitar múltiples instancias de Tauri
  workers: 1,
  
  // Reporter
  reporter: [
    ['list'], // Mostrar en consola
    ['html', { outputFolder: 'playwright-report' }] // HTML report
  ],
  
  // Output folder para screenshots/videos
  outputDir: 'test-results/',
  
  use: {
    // Base URL para desarrollo
    baseURL: 'http://localhost:1420', // Puerto por defecto de Tauri en dev
    
    // Trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot solo en fallos
    screenshot: 'only-on-failure',
    
    // Video solo en fallos
    video: 'retain-on-failure',
    
    // Aumentar timeout de navegación
    navigationTimeout: 15000,
    
    // Aumentar timeout de acciones
    actionTimeout: 10000,
  },

  // Configuración de proyectos (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server para desarrollo
  webServer: {
    command: 'npm run tauri dev',
    url: 'http://localhost:1420',
    timeout: 120000, // Tauri tarda en compilar la primera vez
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});