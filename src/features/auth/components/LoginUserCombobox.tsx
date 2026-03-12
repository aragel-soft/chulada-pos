import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, User2 } from "lucide-react";
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
import { invoke } from "@tauri-apps/api/core";

interface LoginUserComboboxProps {
  value: string;
  onChange: (username: string) => void;
  onEnterPress?: () => void;
  className?: string;
}

export function LoginUserCombobox({
  value,
  onChange,
  onEnterPress,
  className,
}: LoginUserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [usernames, setUsernames] = useState<string[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchUsernames = async () => {
      try {
        const names = await invoke<string[]>("get_active_usernames");
        setUsernames(names);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    fetchUsernames();
  }, []);

  const handleSelect = (selectedUsername: string) => {
    const original = usernames.find(
      (u) => u.toLowerCase() === selectedUsername.toLowerCase()
    );
    onChange(original || selectedUsername);
    setOpen(false);

    setTimeout(() => {
      onEnterPress?.();
    }, 80);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-left h-10 px-3 border-input",
            className
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !open && value) {
              e.preventDefault();
              onEnterPress?.();
            }
          }}
        >
          {value ? (
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 opacity-70 shrink-0" />
              <span className="truncate">{value}</span>
            </div>
          ) : (
            <span className="truncate text-muted-foreground">
              Selecciona tu usuario...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar usuario..." />
          <CommandList>
            <CommandEmpty>No se encontró el usuario.</CommandEmpty>
            <CommandGroup>
              {usernames.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <User2 className="h-4 w-4 mr-2 opacity-70" />
                  <span className="truncate">{name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
