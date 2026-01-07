"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"

export type MultiSelectProps = {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  children: React.ReactNode
}

export type MultiSelectItemProps = {
  value: string
  children: React.ReactNode
}

export function MultiSelect({ value, onChange, placeholder = "Select items", children }: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(value.filter((i) => i !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && value.length > 0) {
          onChange(value.slice(0, -1))
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
    }
  }

  const selectables = React.Children.map(children, (child) => {
    if (React.isValidElement<MultiSelectItemProps>(child)) {
      return child.props.value
    }
    return null
  }).filter(Boolean) as string[]

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {value.map((item) => {
            // Find the corresponding child to get the display text
            const child = React.Children.toArray(children).find(
              (c) => React.isValidElement<MultiSelectItemProps>(c) && c.props.value === item,
            )

            const displayText = React.isValidElement<MultiSelectItemProps>(child) ? child.props.children : item

            return (
              <Badge variant="secondary" key={item} className="mr-1 mb-1">
                {displayText}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(item)
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={() => handleUnselect(item)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            )
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto max-h-52">
              {React.Children.map(children, (child) => {
                if (React.isValidElement<MultiSelectItemProps>(child)) {
                  const isSelected = value.includes(child.props.value)
                  if (!inputValue || child.props.children.toString().toLowerCase().includes(inputValue.toLowerCase())) {
                    return (
                      <CommandItem
                        key={child.props.value}
                        onSelect={() => {
                          if (!isSelected) {
                            onChange([...value, child.props.value])
                            setInputValue("")
                          }
                        }}
                        className={`${isSelected ? "bg-primary/10" : ""}`}
                      >
                        {child.props.children}
                      </CommandItem>
                    )
                  }
                }
                return null
              })}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  )
}

export function MultiSelectItem(props: MultiSelectItemProps) {
  return <>{props.children}</>
}
