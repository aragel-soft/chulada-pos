import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersListPage } from "./UsersListPage";
import { useUsersStore, UserView } from "@/stores/usersStore";

// Mock del store de Zustand
vi.mock("@/stores/usersStore");

const mockUsers: UserView[] = [
  {
    id: "3",
    full_name: "Charlie Brown",
    username: "charlie",
    role_name: "cashier",
    created_at: "2023-01-02T10:00:00Z",
    is_active: true,
    avatar_url: undefined,
  },
  {
    id: "1",
    full_name: "Zelda Smith",
    username: "zelda",
    role_name: "admin",
    created_at: "2023-01-01T10:00:00Z",
    is_active: true,
    avatar_url: undefined,
  },
  {
    id: "2",
    full_name: "Adam Jones",
    username: "adam",
    role_name: "manager",
    created_at: "2023-01-03T10:00:00Z",
    is_active: false,
    avatar_url: undefined,
  },
];

describe("UsersListPage Sorting", () => {

  beforeEach(() => {
    // Proporcionamos una implementación mockeada para el hook
    (useUsersStore as any).mockReturnValue({
      users: mockUsers,
      loading: false,
      error: null,
      fetchUsers: vi.fn(),
    });
  });

  it("debe ordenar los usuarios por nombre en orden ascendente al hacer clic en la cabecera 'Nombre'", async () => {
    render(<UsersListPage />);

    // 1. Verificar el orden inicial (por defecto es por fecha de creación descendente)
    let rows = await screen.findAllByRole("row");
    // El orden inicial debe ser Adam (más reciente), Charlie, Zelda (más antiguo)
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

  it("debe ordenar los usuarios por nombre en orden descendente al hacer clic dos veces", async () => {
    render(<UsersListPage />);

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

  it("debe ordenar los usuarios por rol en orden ascendente", async () => {
    render(<UsersListPage />);

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
