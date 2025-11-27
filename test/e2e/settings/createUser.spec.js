describe('POS- 11 Create User Flow', () => {
  async function loginAsAdmin() {
    const usernameInput = await $('#username');
    if (await usernameInput.isExisting()) {
      await usernameInput.setValue('admin');
      await $('#password').setValue('1234');
      await $('button*=Iniciar Sesión').click();
      await $('h1').waitForExist({ timeout: 5000 });
    }
  }

  beforeEach(async () => {
    await browser.reloadSession();
    await loginAsAdmin();

    // Navigate to Users page
    const settingsLink = await $('[data-testid="nav-item-settings"]');
    await settingsLink.waitForClickable();
    await settingsLink.click();

    const usersTab = await $('button=Usuarios');
    await usersTab.waitForClickable({ timeout: 3000 });
    await usersTab.click();

    // Wait for table to load
    await $('table').waitForExist();
  });

  it('should create a new user successfully', async () => {
    // Open dialog
    await $('[data-testid="open-create-user-dialog"]').click();
    await $('div[role="dialog"]').waitForDisplayed();

    const uniqueUsername = `testuser_${Date.now()}`;

    // Fill form
    await $('[data-testid="input-fullname"]').setValue('Test User');
    await $('[data-testid="input-username"]').setValue(uniqueUsername);
    await $('[data-testid="input-password"]').setValue('password123');
    await $('[data-testid="input-confirm-password"]').setValue('password123');

    // Select role
    await $('[data-testid="select-role"]').click();
    await $('div[role="listbox"]').waitForDisplayed();
    const options = await $$('div[role="option"]');
    if (options.length > 0) {
      await options[0].click();
    }

    // Save
    await $('[data-testid="btn-save-user"]').click();

    // Verify dialog closes (success)
    await $('div[role="dialog"]').waitForDisplayed({ reverse: true });

    // Verify user appears in table (search for it)
    const searchInput = await $('input[placeholder="Buscar por nombre o usuario..."]');
    await searchInput.setValue(uniqueUsername);
    await browser.pause(1000); // Wait for filter

    const tableBody = await $('tbody');
    const rows = await tableBody.$$('tr');
    const rowText = await rows[0].getText();
    expect(rowText).toContain(uniqueUsername);
  });

  it('should show error for duplicate username', async () => {
    // Open dialog
    await $('[data-testid="open-create-user-dialog"]').click();
    await $('div[role="dialog"]').waitForDisplayed();

    // Use an existing username (assuming 'admin' exists)
    await $('[data-testid="input-fullname"]').setValue('Duplicate User');
    await $('[data-testid="input-username"]').setValue('admin');
    await $('[data-testid="input-password"]').setValue('password123');
    await $('[data-testid="input-confirm-password"]').setValue('password123');

    // Select role
    await $('[data-testid="select-role"]').click();
    await $('div[role="listbox"]').waitForDisplayed();
    const options = await $$('div[role="option"]');
    if (options.length > 0) {
      await options[0].click();
    }

    // Save
    await $('[data-testid="btn-save-user"]').click();

    // Verify error message
    // The error is set on the field, likely appearing in a FormMessage
    const errorMessage = await $('p*=El usuario ya existe');
    await errorMessage.waitForDisplayed();
    expect(await errorMessage.isDisplayed()).toBe(true);

    // Dialog should still be open
    expect(await $('div[role="dialog"]').isDisplayed()).toBe(true);
  });

  it('should show error for password mismatch', async () => {
    // Open dialog
    await $('[data-testid="open-create-user-dialog"]').click();
    await $('div[role="dialog"]').waitForDisplayed();

    await $('[data-testid="input-fullname"]').setValue('Mismatch User');
    await $('[data-testid="input-username"]').setValue(`mismatch_${Date.now()}`);
    await $('[data-testid="input-password"]').setValue('password123');
    await $('[data-testid="input-confirm-password"]').setValue('password456');

    // Select role
    await $('[data-testid="select-role"]').click();
    await $('div[role="listbox"]').waitForDisplayed();
    const options = await $$('div[role="option"]');
    if (options.length > 0) {
      await options[0].click();
    }

    // Save button might be clickable but validation should trigger
    await $('[data-testid="btn-save-user"]').click();

    // Verify error message
    const errorMessage = await $('p*=Las contraseñas no coinciden');
    await errorMessage.waitForDisplayed();
    expect(await errorMessage.isDisplayed()).toBe(true);

    // Dialog should still be open
    expect(await $('div[role="dialog"]').isDisplayed()).toBe(true);
  });
});
