import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUsersList } from "@/lib/api/users";
import { AppAvatar } from "@/components/ui/app-avatar";

interface UserComboboxProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UserCombobox({
  value,
  onChange,
  placeholder = "Todos los usuarios",
  className,
  disabled = false,
}: UserComboboxProps) {
  const [open, setOpen] = useState(false);

  // Fetch users list specifically for the custom combobox
  const { data: users = [] } = useQuery({
    queryKey: ["users-list-filter"],
    queryFn: () => getUsersList({ include_deleted: true }),
    staleTime: 1000 * 60 * 10,
  });

  const selectedUser = users.find((u: any) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <AppAvatar 
                path={selectedUser.avatar_url || ""} 
                name={selectedUser.full_name || selectedUser.username} 
                className="h-5 w-5 text-[9px]" 
              />
              <span className="truncate">{selectedUser.full_name || selectedUser.username}</span>
            </div>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar usuario..." />
          <CommandList>
            <CommandEmpty>No encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all_users_reset"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                {placeholder}
              </CommandItem>

              {users.map((user: any) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name || user.username}
                  onSelect={() => {
                    onChange(user.id === value ? null : user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <AppAvatar 
                    path={user.avatar_url || ""} 
                    name={user.full_name || user.username} 
                    className="h-5 w-5 mr-2 text-[9px]" 
                  />
                  <span className="truncate">{user.full_name || user.username}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
