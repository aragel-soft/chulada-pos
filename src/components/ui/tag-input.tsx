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
import { cn } from "@/lib/utils";

interface TagInputProps {
  placeholder?: string;
  availableTags: string[]; 
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

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

  const suggestions = availableTags.filter(
    (tag) => !selectedTags.includes(tag)
  );

  const handleSelect = (tag: string) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue(""); 
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
      
      if (e.key === "Enter" && inputValue.trim() !== "") {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (!selectedTags.includes(newTag)) {
          handleSelect(newTag);
        }
      }
    }
  };

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn("overflow-visible bg-transparent", className)}
    >
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background"
      >
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1.5">
              {tag}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/20 hover:text-destructive transition-colors"
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

      {open && (
        <div className="relative mt-2">
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
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
                    <CommandSeparator />
                    <CommandGroup heading="Sugerencias">
                      {suggestions.map((tag) => (
                      <CommandItem
                        key={tag}
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
          </div>
        </div>
      )}
    </Command>
  );
}