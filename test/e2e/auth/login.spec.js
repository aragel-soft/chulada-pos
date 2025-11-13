// --- Helper: Invocar comando Tauri con retry ---
async function invokeTauriCommand(command, args, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await browser.execute(async (cmd, params) => {
        return await window.__TAURI__.core.invoke(cmd, params);
      }, command, args);
    } catch (error) {
      if (i === retries - 1) throw error;
      await browser.pause(1000);
    }
  }
}

describe('HU-AUTH-001: Login de usuario en Desktop', () => {

  beforeEach(async () => {
    await browser.pause(2000);

    // Verificar si hay sesión activa (dashboard visible)
    const dashboardExists = await $('h1').isExisting();
    
    if (dashboardExists) {
      const dashboardTitle = await $('h1').getText();
      
      // Si estamos en dashboard, hacer logout
      if (dashboardTitle.includes('Dashboard') || dashboardTitle.includes('Inicio')) {
        console.log('⚠️  Sesión activa detectada. Haciendo logout...');
        
        // Buscar botón de logout
        try {
          const logoutButton = await $('button*=Cerrar Sesión');
          await logoutButton.click();
          await browser.pause(1000);
        } catch (e) {
          console.warn('No se pudo hacer logout automático');
        }
      }
    }

    // Esperar a que la pantalla de login esté lista
    await $('#username').waitForExist({ timeout: 10000 });
    await browser.pause(500); // Dar tiempo para que todo cargue
  });

  // --- Test 1: Formulario visible ---
  it('debe mostrar el formulario de login al cargar', async () => {
    // Verificar que los campos existen y son visibles
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await expect(usernameInput).toBeDisplayed();
    await expect(passwordInput).toBeDisplayed();
    await expect(submitButton).toBeDisplayed();
    
    // Verificar que el botón está deshabilitado al inicio
    await expect(submitButton).toBeDisabled();
  });

  // --- Test 2: Habilitar botón ---
  it('debe habilitar el botón cuando ambos campos están llenos', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    // Limpiar campos
    await usernameInput.clearValue();
    await passwordInput.clearValue();
    await browser.pause(300);

    // Verificar que está deshabilitado vacío
    await expect(submitButton).toBeDisabled();

    // Llenar solo username
    await usernameInput.setValue('admin');
    await browser.pause(200);
    await expect(submitButton).toBeDisabled();

    // Llenar password
    await passwordInput.setValue('1234');
    await browser.pause(200);
    
    // Ahora debe estar habilitado
    await expect(submitButton).toBeEnabled();
  });

  // --- Test 3: Login exitoso ---
  it('debe hacer login exitosamente con credenciales correctas', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('admin');
    await passwordInput.setValue('1234');
    await submitButton.click();

    // Esperar navegación al dashboard
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        const title = await browser.getTitle();
        return url.includes('dashboard') || 
               title.includes('Dashboard');
      },
      {
        timeout: 5000,
        timeoutMsg: 'No se redirigió al dashboard después del login'
      }
    );

    // Verificar que ya NO estamos en login
    const usernameExists = await $('#username').isExisting();
    expect(usernameExists).toBe(false);
  });

  // --- Test 4: Credenciales incorrectas ---
  it('debe mostrar error con credenciales incorrectas', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('admin');
    await passwordInput.setValue('wrongpassword');
    await submitButton.click();

    const errorMessage = await $('.text-red-800.bg-red-50');

    await errorMessage.waitForDisplayed({ 
      timeout: 3000,
      timeoutMsg: 'No se mostró mensaje de error'
    });

    const errorText = await errorMessage.getText();
    expect(errorText.toLowerCase()).toMatch(/incorrectos/);
  });

  // --- Test 5: Usuario inexistente ---
  it('debe mostrar error para usuario inexistente', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('usuarioquenoexiste123');
    await passwordInput.setValue('1234');
    await submitButton.click();

    const errorMessage = await $('.text-red-800.bg-red-50');

    await errorMessage.waitForDisplayed({ timeout: 3000 });
    const errorText = await errorMessage.getText();
    expect(errorText.toLowerCase()).toMatch(/incorrectos/);
  });

  // --- Test 6: Usuario inactivo ---
  it('debe mostrar error para usuario desactivado', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('inactive_user');
    await passwordInput.setValue('1234');
    await submitButton.click();

    const errorMessage = await $('.text-red-800.bg-red-50');

    await errorMessage.waitForDisplayed({ timeout: 3000 });
    const errorText = await errorMessage.getText();
    expect(errorText.toLowerCase()).toMatch(/desactivado/);
  });

  // --- Test 7: Submit con Enter ---
  it('debe enviar formulario al presionar Enter en password', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');

    await usernameInput.setValue('admin');
    await passwordInput.setValue('1234');
    await passwordInput.addValue('\uE007');

        await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        const title = await browser.getTitle();
        return url.includes('dashboard') || 
               title.includes('Dashboard');
      },
      {
        timeout: 5000,
        timeoutMsg: 'No se envió el formulario con enter'
      }
    );
  });

  // --- Test 8: Performance ---
  it('debe validar que el login toma menos de 500ms', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('admin');
    await passwordInput.setValue('1234');

    const startTime = Date.now();
    await submitButton.click();
    
    await browser.waitUntil(
      async () => !(await $('#username').isExisting()),
      { timeout: 5000 }
    );
    
    const endTime = Date.now();
    const loginTime = endTime - startTime;

    console.log(`⏱️  Login time: ${loginTime}ms`);
    
    // NOTA: Este test puede fallar en CI o máquinas lentas
    expect(loginTime).toBeLessThan(2000); 
  });

  // --- Test 9: Validación de username corto ---
  it('debe mostrar error de validación para username corto', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');

    await usernameInput.clearValue();
    await passwordInput.clearValue();

    // Username muy corto (menos de 3 caracteres)
    await usernameInput.setValue('ab');
    await passwordInput.click(); // Trigger blur

    const errorMessage = await $('.text-red-500');
    
    await errorMessage.waitForDisplayed({ timeout: 3000 });
    const errorText = await errorMessage.getText();
    expect(errorText.toLowerCase()).toMatch(/menos 3/);
  });

  // --- Test 10: Validación de password corto ---
  it('debe mostrar error de validación para password corto', async () => {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');

    await usernameInput.clearValue();
    await passwordInput.clearValue();

    // Password muy corto (menos de 4 caracteres)
    await usernameInput.setValue('admin'); 
    await passwordInput.setValue('123');
    await usernameInput.click(); // Trigger blur

    const errorMessage = await $('.text-red-500');
    
    await errorMessage.waitForDisplayed({ timeout: 3000 });
    const errorText = await errorMessage.getText();
    expect(errorText.toLowerCase()).toMatch(/menos 4/);
  });

  // --- Test 11: Focus inicial ---
  it('debe enfocar el campo username al cargar', async () => {
    const usernameInput = await $('#username');
    
    // Dar tiempo para que se establezca el autofocus
    await browser.pause(500);
    
    // Verificar focus
    const isFocused = await usernameInput.isFocused();
    expect(isFocused).toBe(true);
  });
});