import * as React from "react"
import { Check, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export interface DataTableFacetedFilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string | null
}

interface DataTableFacetedFilterProps {
  title?: string
  options: DataTableFacetedFilterOption[]
  selectedValues?: Set<string>
  onSelect: (values: Set<string>) => void
}

export function DataTableFacetedFilter({
  title,
  options,
  selectedValues,
  onSelect,
}: DataTableFacetedFilterProps) {
  const selected = selectedValues || new Set()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selected.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selected.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selected.size} seleccionados
                  </Badge>
                ) : (
                  options
                    .filter((option) => selected.has(option.value))
                    .map((option) => (
                      <Badge
                        variant={option.color ? "outline" : "secondary"}
                        key={option.value}
                        className={cn(
                          "rounded-sm font-normal",
                          option.color ? "text-[10px] px-2 py-0 h-5 font-medium border-0" : "px-1"
                        )}
                        style={option.color ? {
                          backgroundColor: option.color + "20",
                          color: option.color,
                        } : undefined}
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-0" 
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const newSet = new Set(selected)
                      if (isSelected) {
                        newSet.delete(option.value)
                      } else {
                        newSet.add(option.value)
                      }
                      onSelect(newSet)
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    {option.color ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0 h-5 font-medium border-0 truncate justify-start"
                        style={{
                          backgroundColor: option.color + "20",
                          color: option.color,
                        }}
                      >
                        {option.label}
                      </Badge>
                    ) : (
                      <span>{option.label}</span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onSelect(new Set())}
                    className="justify-center text-center"
                  >
                    Limpiar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
