import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersListPage } from "./UsersListPage";
import { getUsersList } from "@/lib/api/users";
import type { User } from "@/types/users";
import { useAuthStore } from "@/stores/authStore"; 
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock API
vi.mock("@/lib/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/users")>();
  return {
    ...actual,
    getUsersList: vi.fn(),
  };
});

vi.mock("@/stores/authStore");

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (src: string) => src,
}));

vi.mock("../components/DeleteUsersDialog", () => ({
  DeleteUsersDialog: ({ open, onOpenChange, users, onSuccess }: any) => {
    if (!open) return null;
    return (
      <div data-testid="delete-dialog-mock">
        <p>Usuarios a borrar: {users.length}</p>
        <button onClick={onSuccess}>Confirmar Mock</button>
        <button onClick={() => onOpenChange(false)}>Cancelar Mock</button>
      </div>
    );
  },
}));

const mockUsers: User[] = [
  {
    id: "3",
    full_name: "Charlie Brown",
    username: "charlie",
    role_id: "cashier_id",
    role_name: "cashier",
    created_at: "2023-01-02T10:00:00Z",
    is_active: true,
    avatar_url: undefined,
  },
  {
    id: "1",
    full_name: "Zelda Smith",
    username: "zelda",
    role_id: "admin_id",
    role_name: "admin",
    created_at: "2023-01-01T10:00:00Z",
    is_active: true,
    avatar_url: undefined,
  },
  {
    id: "2",
    full_name: "Adam Jones",
    username: "adam",
    role_id: "manager_id",
    role_name: "manager",
    created_at: "2023-01-03T10:00:00Z",
    is_active: false,
    avatar_url: undefined,
  },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe("UsersListPage Sorting", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    (getUsersList as any).mockResolvedValue(mockUsers);

    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "1", permissions: [] }, 
      can: () => false, 
    });
  });

  it("should sort users by name in ascending order when clicking the 'Name' header button", async () => {
    renderWithClient(<UsersListPage />);

    // Wait for data to load
    await waitFor(() => expect(screen.getByText("Adam Jones")).toBeInTheDocument());

    // 1. Verificar el orden inicial (por defecto es por fecha de creación descendente)
    let rows = await screen.findAllByRole("row");
    // Header row is 0. Data rows start at 1.
    // Initial sort: Created At Desc -> Adam (Jan 3), Charlie (Jan 2), Zelda (Jan 1)
    expect(rows[1]).toHaveTextContent("Adam Jones");
    expect(rows[2]).toHaveTextContent("Charlie Brown");
    expect(rows[3]).toHaveTextContent("Zelda Smith");

    // 2. Hacer clic en el botón de la cabecera "Nombre" para ordenar ascendentemente
    const nameHeaderButton = screen.getByRole("button", { name: /Nombre/i });
    fireEvent.click(nameHeaderButton);

    // 3. Verificar el nuevo orden (ascendente por nombre)
    rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveTextContent("Adam Jones");
    expect(rows[2]).toHaveTextContent("Charlie Brown");
    expect(rows[3]).toHaveTextContent("Zelda Smith");
  });

  it("should sort users by name in descending order when clicking the 'Name' header button twice", async () => {
    renderWithClient(<UsersListPage />);

    await waitFor(() => expect(screen.getByText("Adam Jones")).toBeInTheDocument());

    // 1. Hacemos clic dos veces para ordenar descendentemente
    const nameHeaderButton = screen.getByRole("button", { name: /Nombre/i });
    fireEvent.click(nameHeaderButton); // Clic 1: Ascendente
    fireEvent.click(nameHeaderButton); // Clic 2: Descendente

    // 2. Verificar el nuevo orden (descendente por nombre)
    const rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zelda Smith");
    expect(rows[2]).toHaveTextContent("Charlie Brown");
    expect(rows[3]).toHaveTextContent("Adam Jones");
  });

  it("should sort users by role in ascending order when clicking the 'Role' header button", async () => {
    renderWithClient(<UsersListPage />);

    await waitFor(() => expect(screen.getByText("Adam Jones")).toBeInTheDocument());

    // 1. Hacemos clic en la cabecera de "Rol"
    const roleHeaderButton = screen.getByRole("button", { name: /Rol/i });
    fireEvent.click(roleHeaderButton);

    // 2. Verificar el orden (ascendente por rol: admin, cashier, manager)
    const rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zelda Smith"); // admin
    expect(rows[2]).toHaveTextContent("Charlie Brown"); // cashier
    expect(rows[3]).toHaveTextContent("Adam Jones"); // manager
  });
});

describe("UsersListPage Integration (Delete)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUsersList as any).mockResolvedValue(mockUsers);
    
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "1", permissions: ["users:read", "users:delete"] },
      can: (perm: string) => ["users:read", "users:delete"].includes(perm),
    });
  });

  it("should have the delete button initially disabled", async () => {
    renderWithClient(<UsersListPage />);
    await waitFor(() => screen.getByText("Zelda Smith"));

    const deleteButton = screen.getByText(/Eliminar/i).closest("button");
    expect(deleteButton).toBeDisabled();
  });

  it("should enable delete button when selecting a user (other than current)", async () => {
    renderWithClient(<UsersListPage />);
    await waitFor(() => screen.getByText("Charlie Brown"));

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[2]); 

    const deleteButton = screen.getByText(/Eliminar \(1\)/i).closest("button");
    expect(deleteButton).not.toBeDisabled();
  });

  it("should open the dialog when delete button is clicked", async () => {
    renderWithClient(<UsersListPage />);
    await waitFor(() => screen.getByText("Charlie Brown"));

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[2]);

    const deleteButton = screen.getByText(/Eliminar/i);
    fireEvent.click(deleteButton);

    expect(screen.getByTestId("delete-dialog-mock")).toBeInTheDocument();
    expect(screen.getByText("Usuarios a borrar: 1")).toBeInTheDocument();
  });
});
