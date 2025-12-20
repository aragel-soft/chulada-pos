import * as React from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TagInputProps {
  placeholder?: string;
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

const cleanTag = (tag: string) => {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

export function TagInput({
  placeholder = "Seleccionar etiquetas...",
  availableTags,
  selectedTags,
  onTagsChange,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [menuWidth, setMenuWidth] = React.useState(0);

  const suggestions = availableTags.filter(
    (tag) => !selectedTags.includes(tag)
  );

  React.useEffect(() => {
    if (open && containerRef.current) {
      setMenuWidth(containerRef.current.offsetWidth);
    }
  }, [open, selectedTags]);

  const handleSelect = (tag: string) => {
    const cleaned = cleanTag(tag); 

    if (cleaned && !selectedTags.includes(cleaned)) {
      onTagsChange([...selectedTags, cleaned]);
    }

    setInputValue(""); 
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleUnselect = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedTags.length > 0) {
          handleUnselect(selectedTags[selectedTags.length - 1]);
        }
      }

      if (e.key === "Enter" && inputValue) {
        e.preventDefault();
        handleSelect(inputValue);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
      >
        <PopoverAnchor asChild>
          <div
            ref={containerRef} 
            className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 bg-background"
          >
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1.5">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(tag)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              <CommandInput
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                onBlur={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                placeholder={selectedTags.length > 0 ? "" : placeholder}
                className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[120px]"
              />
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent 
          className="p-0" 
          style={{ width: menuWidth > 0 ? menuWidth : "auto" }} 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (
              containerRef.current && 
              containerRef.current.contains(e.target as Node)
            ) {
              e.preventDefault();
            }
          }}
        >
          <CommandList>
              {inputValue.length > 0 && !suggestions.includes(inputValue) && !selectedTags.includes(inputValue) && (
               <CommandGroup heading="Crear nueva">
                  <CommandItem
                      onSelect={() => handleSelect(inputValue)}
                      className="cursor-pointer"
                  >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear etiqueta "{inputValue}"
                  </CommandItem>
               </CommandGroup>
              )}
              
              {suggestions.length > 0 && (
                <>
                  {(inputValue.length > 0 || selectedTags.length > 0) && <CommandSeparator />}
                  <CommandGroup heading="Sugerencias">
                    {suggestions.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => handleSelect(tag)}
                      className="cursor-pointer"
                    >
                      {tag}
                    </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}