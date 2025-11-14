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

// Page Objects for better maintainability
const UsersPage = {
    url: '/settings/users',
    searchBar: 'input[placeholder="Buscar por nombre o usuario..."]',
    userTable: 'table',
    userRow: 'table > tbody > tr',
    noResultsMessage: '//td[text()="No se encontraron usuarios con ese criterio."]',
    // Selectors for column headers with sorting buttons
    columnHeaderName: '//th[./button[contains(., "Nombre")]]',
    columnHeaderUsername: '//th[./button[contains(., "Usuario")]]',
    columnHeaderRole: '//th[./button[contains(., "Rol")]]',
    columnHeaderStatus: '//th[./button[contains(., "Estado")]]',
    columnHeaderCreatedAt: '//th[./button[contains(., "Fecha de Creación")]]',
    // Pagination
    paginationPrevious: '[aria-label="Ir a la página anterior"]',
    paginationNext: '[aria-label="Ir a la página siguiente"]',
    paginationLink: (pageNumber) => `//a[text()='${pageNumber}']`,
    pageSizeSelectTrigger: '.h-8.w-\\[70px\\]', // Selector for the SelectTrigger button
    pageSizeSelectItem: (size) => `div[role="listbox"] div[role="option"][data-value="${size}"]`, // Selector for items in the Select dropdown
};

const DashboardPage = {
    url: '/dashboard',
    // Assuming sonner toast, common selectors might be data-sonner-toast or role="status"
    toastError: 'div[data-sonner-toast][data-type="error"]', // Adjust if your sonner toast uses different attributes
};

const ConfigPage = {
    usersCard: 'a[href="/settings/users"]' // Selector for the card/link that leads to the user list page
};

describe('User Management Page', () => {

    before(async () => {
        // Custom login command for convenience
        browser.addCommand('login', async function (username, password) {
            await browser.url('http://tauri.localhost/login');
            await $('#username').setValue(username);
            await $('#password').setValue(password);
            await $('button*=Iniciar Sesión').click();
            await browser.waitUntil(async () => (await browser.getUrl()).includes('http://tauri.localhost/dashboard'), {
                timeout: 10000,
                timeoutMsg: 'Expected to be on dashboard after login'
            });
        });

        // Custom logout command for cleanup
        browser.addCommand('logout', async function () {
            // Assuming there's a logout button or mechanism on the dashboard/app layout
            try {
                const logoutButton = await $('button*=Cerrar Sesión'); // Adjust selector if needed
                if (await logoutButton.isExisting()) {
                    await logoutButton.click();
                    await browser.waitUntil(async () => (await browser.getUrl()).includes('http://tauri.localhost/login'), {
                        timeout: 5000,
                        timeoutMsg: 'Expected to be on login page after logout'
                    });
                } else {
                    // If logout button not found, just navigate to login page
                    await browser.url('http://tauri.localhost/login');
                }
            } catch (e) {
                console.warn('Logout button not found or unable to click, navigating to login page directly.');
                await browser.url('http://tauri.localhost/login');
            }
        });
    });

    beforeEach(async () => {
        // Ensure we start from a logged-out state or login if not
        const currentUrl = await browser.getUrl();
        if (!currentUrl.includes('http://tauri.localhost/login')) {
            await browser.logout(); // This should work now
        }
        // Then login as admin for most tests
        await browser.login(process.env.ADMIN_USER, process.env.ADMIN_PASS);
    });

    afterEach(async () => {
        // Clean up by logging out after each test
        await browser.logout(); // This should work now
    });

    describe('Admin Access and Functionality', () => {

        it('E2E: should display the user list for admin users', async () => {
            await $(ConfigPage.usersCard).click(); // Navigate to users page from config
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            const userTable = await $(UsersPage.userTable);
            await expect(userTable).toBeDisplayed();

            const userRows = await $$(UsersPage.userRow);
            await expect(userRows.length).toBeGreaterThan(0); // Should have at least one user (admin)

            // Verify the presence of expected columns in the header
            await expect($(UsersPage.columnHeaderName)).toBeDisplayed();
            await expect($(UsersPage.columnHeaderUsername)).toBeDisplayed();
            await expect($(UsersPage.columnHeaderRole)).toBeDisplayed();
            await expect($(UsersPage.columnHeaderStatus)).toBeDisplayed();
            await expect($(UsersPage.columnHeaderCreatedAt)).toBeDisplayed();
        });

        it('E2E: should filter users by name or username in real-time', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            const searchBar = await $(UsersPage.searchBar);
            await expect(searchBar).toBeDisplayed();

            // Assuming there's an "Admin User" with username "admin"
            await searchBar.setValue('Admin');
            await browser.pause(200); // Small pause for real-time filtering to apply

            let userRows = await $$(UsersPage.userRow);
            await expect(userRows.length).toBe(1); // Expecting only admin user
            await expect(userRows[0]).toHaveTextContaining('Admin User'); // Assuming full_name for admin

            await searchBar.clearValue();
            await browser.pause(200);

            userRows = await $$(UsersPage.userRow);
            await expect(userRows.length).toBeGreaterThan(1); // Should be more than just admin
        });

        it('E2E: should show a message when search returns no results', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            const searchBar = await $(UsersPage.searchBar);
            await searchBar.setValue('UsuarioInexistente12345');
            await browser.pause(200);

            const noResults = await $(UsersPage.noResultsMessage);
            await expect(noResults).toBeDisplayed();
            await expect(noResults).toHaveText('No se encontraron usuarios con ese criterio.');
        });

        it('E2E: should correctly sort users by "Fecha de Creación" (descending by default)', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            const createdAtHeader = await $(UsersPage.columnHeaderCreatedAt);
            await expect(createdAtHeader).toBeDisplayed();

            // Initial sort is desc by created_at. Click to change to asc.
            await createdAtHeader.click();
            await browser.pause(500); // Allow time for sorting to apply

            await expect(createdAtHeader.$('svg.lucide-arrow-up')).toBeDisplayed(); // Should be ascending now

            await createdAtHeader.click();
            await browser.pause(500);

            await expect(createdAtHeader.$('svg.lucide-arrow-down')).toBeDisplayed(); // Should be descending again
        });

        it('E2E: should display active/inactive status with correct badges', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            // Assuming 'admin' user is always active and is in the first row
            const adminRow = await $$(UsersPage.userRow)[0];
            await expect(adminRow.$('.badge.bg-green-600')).toBeDisplayed(); // Check for active badge
        });

        it('E2E: should handle pagination correctly', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            // Assuming there are enough users to have multiple pages (more than 16)
            const initialRows = await $$(UsersPage.userRow);
            if (initialRows.length === 16) {
                const nextButton = await $(UsersPage.paginationNext);
                await expect(nextButton).toBeEnabled();
                await nextButton.click();
                await browser.pause(500);
                await expect($$(UsersPage.userRow).length).toBeGreaterThan(0);

                const previousButton = await $(UsersPage.paginationPrevious);
                await expect(previousButton).toBeEnabled();
                await previousButton.click();
                await browser.pause(500);
                await expect($$(UsersPage.userRow).length).toBe(16);
            } else {
                console.warn('Not enough users for full pagination test (less than 16).');
            }

            const pageSizeSelectTrigger = await $(UsersPage.pageSizeSelectTrigger);
            await pageSizeSelectTrigger.click();
            await browser.pause(200);
            const select48Items = await $(UsersPage.pageSizeSelectItem(48));
            await expect(select48Items).toBeDisplayed();
            await select48Items.click();
            await browser.pause(500);
            const rowsAfterPageSizeChange = await $$(UsersPage.userRow);
            if (initialRows.length === 16) {
                await expect(rowsAfterPageSizeChange.length).toBeGreaterThan(16);
            }
        });
    });

    describe('Access Control', () => {
        beforeEach(async () => {
            await browser.logout();
            await browser.login(process.env.NORMAL_USER, process.env.NORMAL_PASS);
        });

        it('E2E: should redirect a non-admin user and show an error toast', async () => {
            await browser.url(`http://tauri.localhost${UsersPage.url}`);
            await expect(browser).toHaveUrlContaining(DashboardPage.url);
            const errorToast = await $(DashboardPage.toastError);
            await expect(errorToast).toBeDisplayed();
            await expect(errorToast).toHaveText('No tienes permisos para acceder a esta sección');
        });
    });

    describe('Performance Tests', () => {
        // The main beforeEach logs in as admin, so no extra login needed here.

        it('Performance: initial load should be under 300ms', async () => {
            const start = Date.now();
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);
            await $(UsersPage.userTable).waitForDisplayed({ timeout: 5000 });
            const loadTime = Date.now() - start;

            console.log(`Initial page load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(300);
        });

        it('Performance: filtering should respond in less than 100ms', async () => {
            await $(ConfigPage.usersCard).click();
            await expect(browser).toHaveUrlContaining(UsersPage.url);

            const searchBar = await $(UsersPage.searchBar);
            await searchBar.waitForDisplayed();

            const start = Date.now();
            await searchBar.setValue('Admin');
            
            await $(`//span[text()='Admin User']`).waitForDisplayed({ timeout: 2000 });
            const searchTime = Date.now() - start;

            console.log(`Search/filter response time: ${searchTime}ms`);
            expect(searchTime).toBeLessThan(100);
        });
    });
});