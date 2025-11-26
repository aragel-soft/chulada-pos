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

      expect(width).toBeLessThan(100);
    });

    it('should show tooltips when sidebar is collapsed', async () => {
      const sidebar = await $('[data-testid="sidebar"]');
      const width = await sidebar.getSize('width');

      if (width > 100) {
        const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
        await hamburgerBtn.click();
        await browser.pause(500);
      }

      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.moveTo();
      await browser.pause(500);
      const tooltip = await $('[role="tooltip"]');
      await expect(tooltip).toBeDisplayed();
      await expect(tooltip).toHaveText('Inventario');
    });

    it('should NOT show tooltips when sidebar is expanded', async () => {
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
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.click();
      await browser.pause(500);
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.click();

      await browser.waitUntil(
        async () => (await browser.getUrl()).includes('/inventory'),
        { timeout: 5000 }
      );
      await browser.pause(500);

      const sidebar = await $('[data-testid="sidebar"]');
      const widthAfter = await sidebar.getSize('width');
      expect(widthAfter).toBeLessThan(100);
    });

    it('should highlight active navigation item', async () => {
      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      const isActive = await inventoryBtn.getAttribute('data-active');
      expect(isActive).toBe('true');
    });
  });

  describe('Mobile Behavior (< 1024px)', () => {
    beforeEach(async () => {
      await browser.setWindowSize(375, 667);
      await browser.pause(500);
    });

    it('should activate mobile mode when resizing window', async () => {
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await expect(hamburgerBtn).toBeDisplayed();

      const sidebar = await $('[data-testid="sidebar"]');
      const isDisplayed = await sidebar.isDisplayed();
      expect(isDisplayed).toBe(false);
    });

    it('should open drawer, navigate and close drawer', async () => {
      const hamburgerBtn = await $('[data-testid="sidebar-trigger"]');
      await hamburgerBtn.click();
      
      const sidebar = await $('[data-testid="sidebar"]');
      await sidebar.waitForDisplayed({ timeout: 2000 });
      await expect(sidebar).toBeDisplayed();

      const inventoryBtn = await $('[data-testid="nav-item-inventory"]');
      await inventoryBtn.click();

      await browser.waitUntil(
        async () => (await browser.getUrl()).includes('/inventory'),
        { timeout: 5000, timeoutMsg: 'URL did not change to /inventory' }
      );

      await browser.pause(500); 
      const isDisplayed = await sidebar.isDisplayed();
      expect(isDisplayed).toBe(false);
    });
  });
});
