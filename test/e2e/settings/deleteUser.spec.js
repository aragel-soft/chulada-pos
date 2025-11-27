describe('Delete User Flow', () => {
  async function loginAsAdmin() {
    const usernameInput = await $('#username');
    if (await usernameInput.isExisting()) {
      await usernameInput.setValue('admin');
      await $('#password').setValue('1234');
      await $('button*=Iniciar Sesión').click();
      await $('h1').waitForExist({ timeout: 5000 });
    }
  }

  async function createTestUser(username, fullname) {
    const createBtn = await $('[data-testid="open-create-user-dialog"]'); 
    await createBtn.waitForClickable();
    await createBtn.click();
    
    await $('div[role="dialog"]').waitForDisplayed();

    await $('[data-testid="input-fullname"]').setValue(fullname);
    await $('[data-testid="input-username"]').setValue(username);
    await $('[data-testid="input-password"]').setValue('password123');
    await $('[data-testid="input-confirm-password"]').setValue('password123');

    await $('[data-testid="select-role"]').click();
    await $('div[role="listbox"]').waitForDisplayed();
    const options = await $$('div[role="option"]');
    if (options.length > 0) {
      await options[0].click();
    }

    await $('[data-testid="btn-save-user"]').click();
    await $('div[role="dialog"]').waitForDisplayed({ reverse: true });
    
    await browser.pause(500); 
  }

  beforeEach(async () => {
    await browser.reloadSession();
    await loginAsAdmin();

    const settingsLink = await $('[data-testid="nav-item-settings"]');
    await settingsLink.waitForClickable();
    await settingsLink.click();

    const usersTab = await $('button=Usuarios');
    await usersTab.waitForClickable({ timeout: 3000 });
    await usersTab.click();

    await $('table').waitForExist();
  });

  it('should prevent self-deletion (Admin Protection)', async () => {
    const searchInput = await $('input[placeholder="Buscar por nombre o usuario..."]');
    await searchInput.setValue('Administrador del Sistema');
    await browser.pause(1000);

    const tableBody = await $('tbody');
    const firstRow = await tableBody.$('tr'); 
    const checkbox = await firstRow.$('button[role="checkbox"]');
    await checkbox.click();

    const deleteBtn = await $('button*=Eliminar');
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    const alertDialog = await $('div[role="alertdialog"]');
    await alertDialog.waitForDisplayed();
    
    const confirmBtn = await alertDialog.$('button=Eliminar');
    await confirmBtn.click();

    const toast = await $('li*=No puedes eliminar tu propia cuenta'); 
    await toast.waitForDisplayed({ timeout: 3000 });
    expect(await toast.isDisplayed()).toBe(true);
  });

  it('should create and then successfully delete a user', async () => {
    const userToDelete = `delete_me_${Date.now()}`;
    
    await createTestUser(userToDelete, 'User To Delete');

    const searchInput = await $('input[placeholder="Buscar por nombre o usuario..."]');
    await searchInput.setValue(userToDelete);
    await browser.pause(1000);

    const tableBody = await $('tbody');
    const rows = await tableBody.$$('tr');
    await expect(rows.length).toBeGreaterThan(0);
    
    const targetRow = rows[0];
    const checkbox = await targetRow.$('button[role="checkbox"]');
    await checkbox.click();

    const deleteBtn = await $('button*=Eliminar');
    await deleteBtn.waitForClickable();
    await deleteBtn.click();

    const alertDialog = await $('div[role="alertdialog"]');
    await alertDialog.waitForDisplayed();
    
    const confirmBtn = await alertDialog.$('button=Eliminar');
    await confirmBtn.click();

    await alertDialog.waitForDisplayed({ reverse: true });

    const successToast = await $('div*=Usuario eliminado correctamente'); 
    await browser.pause(500);
    
    const updatedRows = await tableBody.$$('tr');
    const firstRowText = await updatedRows[0].getText();
    
    if (updatedRows.length === 1) {
      expect(firstRowText).toContain('No se encontraron');
    } else {
      expect(updatedRows.length).toBe(0);
    }
  });

  it('should cancel deletion process', async () => {
    const searchInput = await $('input[placeholder="Buscar por nombre o usuario..."]');
    await searchInput.setValue('Administrador del Sistema');
    await browser.pause(1000);

    const tableBody = await $('tbody');
    const checkbox = await tableBody.$('tr').$('button[role="checkbox"]');
    await checkbox.click();

    await $('button*=Eliminar').click();
    const alertDialog = await $('div[role="alertdialog"]');
    await alertDialog.waitForDisplayed();

    const cancelBtn = await alertDialog.$('button=Cancelar');
    await cancelBtn.click();

    await alertDialog.waitForDisplayed({ reverse: true });

    const rows = await tableBody.$$('tr');
    expect(await rows[0].getText()).toContain('Administrador del Sistema');
  });
});