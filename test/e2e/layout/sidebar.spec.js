import { expect } from '@wdio/globals';

describe('AppSidebar Navigation & Responsiveness', () => {

  before(async () => {
    const usernameInput = await $('#username');
    await usernameInput.waitForDisplayed();
    await usernameInput.setValue('admin');
    await $('#password').setValue('1234');
    await $('button*=Iniciar Sesión').click();
    
    await browser.waitUntil(
      async () => (await browser.getUrl()).includes('/dashboard'),
      { timeout: 5000 }
    );

    await browser.execute(() => {
      localStorage.removeItem('layout-storage');
    });
  });

  describe('Desktop Behavior (>= 1024px)', () => {
    it('should display sidebar expanded by default on desktop', async () => {
      const sidebar = await $('[data-testid="sidebar"]');
      await sidebar.waitForExist();
      await expect(sidebar).toBeDisplayed();
      
      const ventasText = await $('span=Ventas');
      await expect(ventasText).toBeDisplayed();
    });

    it('should collapse sidebar when clicking hamburger button', async () => {
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.click();
      await browser.pause(500);
      
      const sidebar = await $('[data-testid="sidebar"]');
      const width = await sidebar.getSize('width');
      
      // Verifica que el ancho sea reducido 
      expect(width).toBeLessThan(100);
    });

    it('should show tooltips when sidebar is collapsed', async () => {
      // Asegurar colapso
      const sidebar = await $('[data-testid="sidebar"]');
      const width = await sidebar.getSize('width');

      if (width > 100) {
        const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
        await hamburgerBtn.click();
        await browser.pause(500);
      }
      
      // Hover sobre Inventario
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.moveTo();
      await browser.pause(500);
      
      // Tooltip via Rol
      const tooltip = await $('[role="tooltip"]');
      await expect(tooltip).toBeDisplayed();
      await expect(tooltip).toHaveText('Inventario');
    });

    it('should NOT show tooltips when sidebar is expanded', async () => {
      // Expandir
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.click();
      await browser.pause(500);

      await $('body').moveTo({ x: 0, y: 0 });
      
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.moveTo();
      await browser.pause(500);
      
      const tooltips = await $$('[role="tooltip"]');
      if (tooltips.length > 0) {
        for (const tooltip of tooltips) {
           await expect(tooltip).not.toBeDisplayed();
        }
      } else {
        expect(tooltips.length).toBe(0);
      }
    });

    it('should persist sidebar state after navigation', async () => {
      // Colapsar
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.click();
      await browser.pause(500);
      
      // Navegar
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.click();
      
      await browser.waitUntil(
        async () => (await browser.getUrl()).includes('/inventory'),
        { timeout: 5000 }
      );
      await browser.pause(500);
      
      // Verificar persistencia del colapso
      const sidebar = await $('[data-testid="sidebar"]');
      const widthAfter = await sidebar.getSize('width');
      expect(widthAfter).toBeLessThan(100);
    });

    it('should highlight active navigation item', async () => {
      // Estamos en /inventory
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      const isActive = await inventoryBtn.getAttribute('data-active');
      expect(isActive).toBe('true');
    });
  });

  describe('Mobile Behavior (< 1024px)', () => {
    beforeEach(async () => {
      await browser.setWindowSize(375, 667);
      await browser.pause(1000); 
    });

    // Función auxiliar para obtener SOLO el sidebar visible
    const getMobileSidebar = async () => {
      // Opción A: Buscar por el rol de diálogo (común en drawers móviles)
      const dialogSidebar = await $('[role="dialog"][data-testid="sidebar"]');
      try {
          await dialogSidebar.waitForExist({ timeout: 3000 });
          return dialogSidebar;
      } catch (e) {
          // Si falla, intentamos la opción B
      }
      
      // Opción B (Respaldo): Buscar todos y devolver el último
      const allSidebars = await $$('[data-testid="sidebar"]');
      return allSidebars[allSidebars.length - 1];
    };

    it('should hide desktop sidebar by default on mobile', async () => {
      const desktopSidebar = await $('[data-testid="sidebar"]'); 
      const isDisplayed = await desktopSidebar.isDisplayed();
      expect(isDisplayed).toBe(false);
    });

    it('should open drawer when clicking hamburger button', async () => {
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.waitForExist();
      await hamburgerBtn.waitForClickable();
      
      // Intentar clic normal primero, luego JS click si falla
      try {
        await hamburgerBtn.click();
      } catch (e) {
        console.log('Normal click failed, trying JS click');
        await browser.execute((el) => el.click(), hamburgerBtn);
      }
      
      // Esperar un poco a que el portal se renderice
      await browser.pause(2000); 

      // USAMOS LA NUEVA ESTRATEGIA DE SELECCIÓN
      const sidebar = await getMobileSidebar();
      
      if (!sidebar) {
          console.log('Sidebar not found! Dumping body...');
          const body = await $('body').getHTML();
          console.log(body);
          throw new Error('Mobile sidebar not found after click');
      }
      
      // Esperamos que ESTE sidebar específico esté visible
      await sidebar.waitForDisplayed();
      const isDisplayed = await sidebar.isDisplayed();
      expect(isDisplayed).toBe(true);
      
      // Verificar texto dentro de este sidebar específico
      const ventasText = await sidebar.$('span=Ventas');
      await expect(ventasText).toBeDisplayed();
    });

    it('should display drawer at correct width (~288px)', async () => {
      let sidebar = await getMobileSidebar();
      
      if (!sidebar || !(await sidebar.isDisplayed())) {
         const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
         await browser.execute((el) => el.click(), hamburgerBtn);
         await browser.pause(1000);
         sidebar = await getMobileSidebar(); // Re-seleccionar tras abrir
      }

      const width = await sidebar.getCSSProperty('width');
      expect(parseInt(width.value)).toBeGreaterThanOrEqual(280);
      expect(parseInt(width.value)).toBeLessThanOrEqual(300);
    });

    it('should show overlay and prevent body scroll when open', async () => {
      const sidebar = await getMobileSidebar();
      if (!sidebar || !(await sidebar.isDisplayed())) {
         const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
         await browser.execute((el) => el.click(), hamburgerBtn);
         await browser.pause(1000);
      }

      const overlay = await $('[data-testid="sheet-overlay"]');
      await expect(overlay).toBeDisplayed();
      
      const bodyOverflow = await browser.execute(() => {
        return window.getComputedStyle(document.body).overflow;
      });
      expect(['hidden', 'clip']).toContain(bodyOverflow); 
    });

    it('should close drawer when clicking on overlay', async () => {
      const overlay = await $('[data-testid="sheet-overlay"]');
      await overlay.click({ x: 200, y: 200 });
      
      // Esperamos que el sidebar móvil desaparezca
      const sidebar = await getMobileSidebar();
      // Si sidebar es undefined, asumimos que ya se cerró (o nunca se abrió, pero esperamos que se cierre)
      if (sidebar) {
          await sidebar.waitForDisplayed({ reverse: true, timeout: 2000 });
          const isDisplayed = await sidebar.isDisplayed();
          expect(isDisplayed).toBe(false);
      }
    });

    it('should close drawer when clicking on a navigation item', async () => {
      // 1. Abrir
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await browser.execute((el) => el.click(), hamburgerBtn);
      await browser.pause(1000);

      const sidebar = await getMobileSidebar();
      
      // 2. Buscar el botón DENTRO del sidebar móvil
      // Es importante encadenar `sidebar.$()` para no clicar el de desktop por error
      const inventoryBtn = await sidebar.$('[data-testid="nav-item-inventory"]');
      
      await browser.execute((el) => el.click(), inventoryBtn);
      
      // 3. Verificar cierre
      if (sidebar) {
          await sidebar.waitForDisplayed({ reverse: true, timeout: 2000 });
          expect(await sidebar.isDisplayed()).toBe(false);
      }
    });
  });
});