import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditUserDialog } from "./EditUserDialog";
import { getAllRoles } from "@/lib/api/users";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


vi.mock("@/lib/api/users", () => ({
  getAllRoles: vi.fn(),
  updateUser: vi.fn(),
  saveAvatar: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (src: string) => src,
}));


vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser = {
  id: "1",
  full_name: "John Doe",
  username: "johndoe",
  role_id: "role_1",
  role_name: "admin",
  is_active: true,
  avatar_url: "http://example.com/avatar.png",
  created_at: "2023-01-01",
  updated_at: "2023-01-01",
};

const mockRoles = [
  { id: "role_1", display_name: "Admin", name: "admin" },
  { id: "role_2", display_name: "Cashier", name: "cashier" },
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

describe("EditUserDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getAllRoles as any).mockResolvedValue(mockRoles);
  });

  it("should render correctly and have save button disabled initially", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2" 
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());
    
    const saveButton = screen.getByTestId("btn-save-user");
    expect(saveButton).toBeDisabled();
  });

  it("should enable save button when full_name changes", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2"
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

    const input = screen.getByTestId("input-fullname");
    fireEvent.change(input, { target: { value: "Jane Doe" } });

    const saveButton = screen.getByTestId("btn-save-user");
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

   it("should enable save button when role changes", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2"
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());
    
    const trigger = screen.getByTestId("select-role");
    fireEvent.click(trigger);
    
    const newRoleOptions = await screen.findAllByText("Cashier");
    fireEvent.click(newRoleOptions[newRoleOptions.length - 1]);

    const saveButton = screen.getByTestId("btn-save-user");
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

  it("should enable save button when active status changes", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2"
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

    const switchBtn = screen.getByTestId("switch-active");
    fireEvent.click(switchBtn);

    const saveButton = screen.getByTestId("btn-save-user");
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

  it("should enable save button when avatar is removed", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2"
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

    const removeBtn = screen.getByTestId("btn-remove-avatar");
    fireEvent.click(removeBtn);

    const saveButton = screen.getByTestId("btn-save-user");
    await waitFor(() => expect(saveButton).toBeEnabled());
  });
  
  it("should enable save button when avatar is uploaded (user has no avatar initially)", async () => {
      const userNoAvatar = { ...mockUser, avatar_url: undefined };
      renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={userNoAvatar}
        currentUserId="2"
      />
    );
    
    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());
    
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    
    const input = screen.getByLabelText(/Subir avatar/i); 
    
    fireEvent.change(input, { target: { files: [file] } });
    
    const saveButton = screen.getByTestId("btn-save-user");
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

  it("should disable save button when fields revert to original values", async () => {
    renderWithClient(
      <EditUserDialog
        open={true}
        onOpenChange={onOpenChange}
        user={mockUser}
        currentUserId="2"
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument());

    const input = screen.getByTestId("input-fullname");
    fireEvent.change(input, { target: { value: "Jane Doe" } });
    await waitFor(() => expect(screen.getByTestId("btn-save-user")).toBeEnabled());

    fireEvent.change(input, { target: { value: "John Doe" } }); 
    
    await waitFor(() => expect(screen.getByTestId("btn-save-user")).toBeDisabled());
  });
});
