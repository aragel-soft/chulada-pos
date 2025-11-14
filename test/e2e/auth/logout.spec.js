// -- Helper: Iniciar sesión 
async function loginAsAdmin() {
  try {
    const usernameInput = await $('#username');
    const passwordInput = await $('#password');
    const submitButton = await $('button*=Iniciar Sesión');

    await usernameInput.setValue('admin');
    await passwordInput.setValue('1234');
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

describe('HU-POS-009: User Logout', () => {
  beforeEach(async () => {
    await browser.url('http://tauri.localhost/login');
    await $('#username').waitForExist({ timeout: 5000 });
    
    await loginAsAdmin();
    
    const url = await browser.getUrl();
    expect(url).toContain('/dashboard');
  });

  // --- Test 1: Cancel Logout ---
  it('should cancel logout and remain on dashboard', async () => {
    const logoutTrigger = await $('button*=Cerrar Sesión');
    await logoutTrigger.click();

    const cancelButton = await $('button*=Cancelar');
    await cancelButton.waitForDisplayed({ timeout: 2000 });

    await cancelButton.click();
    await browser.pause(500);

    const url = await browser.getUrl();
    expect(url).toContain('/dashboard');

    const dashboardTitle = await $('h1');
    expect(dashboardTitle).toBeDisplayed();
  });

  // --- Test 2: Successfull Logout ---
  it('should logout successfully and redirect to /login', async () => {
    const logoutTrigger = await $('button*=Cerrar Sesión');
    await logoutTrigger.click();

    await $('button*=Cancelar').waitForDisplayed({ timeout: 2000 });
    await browser.pause(200); 

    const confirmButton = await $('button*=Cerrar sesión');
    await confirmButton.click();

    await $('#username').waitForExist({ timeout: 5000 });

    const url = await browser.getUrl();
    expect(url).toContain('/login');
  });

  // --- Test 3: Protect Route Post-Logout ---
  it('should prevent access to protected routes after logout', async () => {
    const logoutTrigger = await $('button*=Cerrar Sesión');
    await logoutTrigger.click();
    await $('button*=Cancelar').waitForDisplayed({ timeout: 2000 });
    const confirmButton = await $('button*=Cerrar sesión');
    await confirmButton.click();

    await $('#username').waitForExist({ timeout: 5000 });
    const loginUrl = await browser.getUrl();
    expect(loginUrl).toContain('/login');

    await browser.url('http://tauri.localhost/dashboard');
    await browser.pause(500);

    const finalUrl = await browser.getUrl();
    expect(finalUrl).toContain('/login');

    const usernameInput = await $('#username');
    expect(usernameInput).toBeDisplayed();
  });
});