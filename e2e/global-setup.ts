import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🔧 Esperando a que Tauri inicie completamente...');
  
  // Lanzar browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navegar y esperar a que cargue
  await page.goto(baseURL!);
  
  // Esperar a que el formulario de login esté listo
  await page.waitForSelector('input#username', { timeout: 30000 });
  
  // Verificar que la BD está funcionando
  try {
    await page.evaluate(async () => {
      // @ts-ignore
      const result = await window.__TAURI__.core.invoke('debug_database');
      console.log('✅ BD inicializada:', result);
    });
  } catch (error) {
    console.warn('⚠️  No se pudo verificar BD, continuando...');
  }
  
  await browser.close();
  
  console.log('✅ Tauri listo para tests');
}

export default globalSetup;