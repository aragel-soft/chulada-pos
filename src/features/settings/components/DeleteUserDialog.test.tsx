import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteUsersDialog } from "./DeleteUsersDialog";
import * as userApi from "@/lib/api/users";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/users";

vi.mock("@/lib/api/users");
vi.mock("@/stores/authStore");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser: User = {
  id: "user-1",
  username: "juanperez",
  full_name: "Juan Perez",
  role_id: "role-1",
  role_name: "Admin",
  is_active: true,
  created_at: "2023-01-01",
};

const mockCurrentUser = {
  id: "admin-id",
  username: "admin",
};

describe("DeleteUsersDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockCurrentUser,
    });
  });

  it("should display singular message for a single user", () => {
    render(
      <DeleteUsersDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={[mockUser]}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("¿Eliminar usuario?")).toBeInTheDocument();
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  it("should display plural message for multiple users", () => {
    const users = [mockUser, { ...mockUser, id: "user-2", full_name: "Maria" }];
    render(
      <DeleteUsersDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={users}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("¿Eliminar 2 usuarios?")).toBeInTheDocument();
  });

  it("should call API and onSuccess when confirmed", async () => {
    (userApi.deleteUsers as any).mockResolvedValue(undefined);

    render(
      <DeleteUsersDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={[mockUser]}
        onSuccess={mockOnSuccess}
      />
    );

    const deleteButton = screen.getByRole("button", { name: "Eliminar" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(userApi.deleteUsers).toHaveBeenCalledWith(["user-1"], "admin-id");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("should handle last admin protection errors", async () => {
    const error = { code: "LAST_ADMIN_PROTECTION", message: "No puedes..." };
    (userApi.deleteUsers as any).mockRejectedValue(error);

    render(
      <DeleteUsersDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={[mockUser]}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled(); 
    });
  });
});