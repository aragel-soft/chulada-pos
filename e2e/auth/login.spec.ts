import { test, expect, Page } from '@playwright/test';

// Helper: Invocar comando Tauri con retry
async function invokeTauriCommand(page: Page, command: string, args?: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await page.evaluate(async ({ cmd, params }) => {
        // @ts-ignore
        return await window.__TAURI__.core.invoke(cmd, params);
      }, { cmd: command, params: args });
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000); // Esperar 1s antes de reintentar
    }
  }
}

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la app (Tauri se ejecuta en localhost durante dev)
    await page.goto('/');
    // Esperar a que cargue el formulario
    await page.waitForSelector('input#username');
  });

  test('should display login form on initial load', async ({ page }) => {
    // Verificar que existe el título
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
    
    // Verificar que existen los campos
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    
    // Verificar que el botón está deshabilitado inicialmente
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should enable button when both fields are filled', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    // Botón deshabilitado inicialmente
    await expect(submitButton).toBeDisabled();

    // Llenar solo username
    await usernameInput.fill('admin');
    await expect(submitButton).toBeDisabled();

    // Llenar password
    await passwordInput.fill('1234');
    await expect(submitButton).toBeEnabled();
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    // Llenar credenciales correctas
    await usernameInput.fill('admin');
    await passwordInput.fill('1234');

    // Click en el botón
    await submitButton.click();

    // Verificar que redirige al dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verificar que aparece el dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Verificar que muestra el nombre del usuario
    await expect(page.getByText(/administrador del sistema/i)).toBeVisible();
  });

  test('should show error message with incorrect credentials', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    // Llenar credenciales incorrectas
    await usernameInput.fill('admin');
    await passwordInput.fill('wrongpassword');

    // Click en el botón
    await submitButton.click();

    // Verificar que muestra mensaje de error
    await expect(page.getByText(/usuario o contraseña incorrectos/i)).toBeVisible();
    
    // Verificar que NO redirige
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('should show error for non-existent user', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    // Llenar usuario inexistente
    await usernameInput.fill('usuariofalso');
    await passwordInput.fill('1234');

    // Click en el botón
    await submitButton.click();

    // Verificar mensaje genérico (no revela si el usuario existe)
    await expect(page.getByText(/usuario o contraseña incorrectos/i)).toBeVisible();
  });

  test('should show error for inactive user', async ({ page }) => {
    // El usuario inactivo ya existe en la BD (migration 004)
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    await usernameInput.fill('inactive_user');
    await passwordInput.fill('1234');
    await submitButton.click();

    await expect(page.getByText(/usuario desactivado/i)).toBeVisible();
  });

  test('should submit form when pressing Enter in password field', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');

    // Llenar credenciales
    await usernameInput.fill('admin');
    await passwordInput.fill('1234');

    // Presionar Enter en el campo password
    await passwordInput.press('Enter');

    // Verificar que redirige al dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('should validate login performance under 500ms', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    await usernameInput.fill('admin');
    await passwordInput.fill('1234');

    // Medir tiempo de respuesta
    const startTime = Date.now();
    await submitButton.click();
    await expect(page).toHaveURL(/\/dashboard/);
    const endTime = Date.now();

    const loginTime = endTime - startTime;
    
    // Verificar que sea menor a 500ms
    expect(loginTime).toBeLessThan(500);
  });

  test('should show validation errors for short inputs', async ({ page }) => {
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');

    // Username muy corto
    await usernameInput.fill('ab');
    await passwordInput.click(); // Trigger blur
    
    await expect(page.getByText(/usuario debe tener al menos 3 caracteres/i)).toBeVisible();

    // Password muy corto
    await usernameInput.fill('admin');
    await passwordInput.fill('123');
    await usernameInput.click(); // Trigger blur
    
    await expect(page.getByText(/contraseña debe tener al menos 4 caracteres/i)).toBeVisible();
  });

  test('should focus username input on page load', async ({ page }) => {
    // Verificar que el campo username tiene autofocus
    const usernameInput = page.locator('input#username');
    await expect(usernameInput).toBeFocused();
  });
});
