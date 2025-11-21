async function login(username, password) {
  try {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue(username);
    await passwordInput.setValue(password);
    await submitButton.click();

    await browser.waitUntil(
      async () => (await $('h1').getText()).includes('Dashboard'),
      {
        timeout: 5000,
        timeoutMsg: 'No se pudo iniciar sesión para la prueba de logout',
      }
    );
  } catch (error) {
    console.error('Error en el helper loginAsAdmin:', error);
    throw error; 
  }
}

describe('HU-POS-10: Cargar carga de usuarios', () => {

  beforeEach(async () => {
    await browser.pause(2000);

    // Verificar si hay sesión activa (dashboard visible)
    const dashboardExists = await $('h1').isExisting();
    
    if (dashboardExists) {
      const dashboardTitle = await $('h1').getText();
      
      // Si estamos en dashboard, hacer logout
      if (dashboardTitle.includes('Dashboard')) {
        console.log('⚠️  Sesión activa detectada. Haciendo logout...');
        
        // Buscar botón de logout
        try {
          const logoutButton = await $('button*=Cerrar Sesión');
          await logoutButton.click();
          await $('button*=Cancelar').waitForDisplayed({ timeout: 2000 });

          const confirmButton = await $('button*=Cerrar sesión');
          await confirmButton.click();

          await $('#username').waitForExist({ timeout: 5000 });
          console.log('Logout successful. Proceeding to login test.');
        } catch (e) {
          console.warn('No se pudo hacer logout automático');
        }
      }
    }

    // Esperar a que la pantalla de login esté lista
    await $('#username').waitForExist({ timeout: 10000 });
    await browser.pause(500); // Dar tiempo para que todo cargue
  });
 

  // --- Test 1: ver listado como admin ---
  it('Make login as admin, view users list and filter it', async () => {
   await login('admin', '1234');
    const url = await browser.getUrl();
    expect(url).toContain('/dashboard');

    // Navegar a la sección de usuarios
    const settingsMenu = await $('button*=Configuración');
    await settingsMenu.click();

    // Hacer clic en la pestaña "Usuarios" dentro de la página de configuración
    const usersTab = await $('button=Usuarios');
    await usersTab.waitForClickable({ timeout: 3000 });
    await usersTab.click();

    // Verificar que la URL sea la correcta después de la navegación
    const usersUrl = await browser.getUrl();
    expect(usersUrl).toContain('/settings/users');

    

    // 1. Verificar que la tabla de usuarios esté visible y contenga datos
    const userTable = await $('table');
    await userTable.waitForExist({ timeout: 5000, timeoutMsg: 'La tabla de usuarios no apareció' });
    expect(await userTable.isDisplayed()).toBe(true);

    // Esperar a que haya al menos una fila en el cuerpo de la tabla
    const tableBody = await userTable.$('tbody');
    await tableBody.$('tr').waitForExist({ timeout: 5000, timeoutMsg: 'La tabla no se cargó con ninguna fila de usuario' });

    // 2. Realizar una búsqueda y validar el resultado
    const searchInput = await $('input[placeholder="Buscar por nombre o usuario..."]');
    await searchInput.waitForExist({ timeout: 3000 });
    await searchInput.setValue('admin'); // Asumimos que existe un usuario "admin" para buscar

    await browser.pause(500); // Pausa para que la tabla se actualice con el filtro

    // 3. Validar que la tabla se ha filtrado correctamente
    const rows = await tableBody.$$('tr');
    expect(rows.length).toBeGreaterThan(0); // Debería haber al menos un resultado

    // Validar que todas las filas visibles contienen el texto buscado
    for (const row of rows) {
      const rowText = await row.getText();
      expect(rowText.toLowerCase()).toContain('admin');
    }

    // navegar de vuelta al dashboard
    const dashboardMenu = await $('button*=Dashboard');
    await dashboardMenu.click();
    const dashboardUrl = await browser.getUrl();
    expect(dashboardUrl).toContain('/dashboard');
    
  });

  // --- Test 2: no debe ver el listado como manager ---
  it('make login as manager and validate that it cannot see the users list', async () => {
    await login('manager', '1234');
    const url = await browser.getUrl();
    expect(url).toContain('/dashboard');

    // Navigate to the settings section
    const settingsMenu = await $('button*=Configuración');
    await settingsMenu.click();
 
    // Verificar que la URL sea la correcta después de la navegación
    const usersUrl = await browser.getUrl();
    expect(usersUrl).toContain('/settings');
 
    // Validar que la pestaña "Usuarios" NO está visible para el rol de manager
    const usersTab = await $('button=Usuarios');
    await expect(usersTab).not.toBeDisplayed();
  })
}
);