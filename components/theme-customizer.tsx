

"use client"

import { useEffect, useState } from "react"
import { Paintbrush } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const themes = [
  {
    name: "zinc",
    label: "Zinc",
    activeColor: "rgb(161 161 170)",
  },
  {
    name: "slate",
    label: "Slate",
    activeColor: "rgb(148 163 184)",
  },
  {
    name: "stone",
    label: "Stone",
    activeColor: "rgb(168 162 158)",
  },
  {
    name: "gray",
    label: "Gray",
    activeColor: "rgb(156 163 175)",
  },
  {
    name: "neutral",
    label: "Neutral",
    activeColor: "rgb(163 163 163)",
  },
  {
    name: "red",
    label: "Red",
    activeColor: "rgb(239 68 68)",
  },
  {
    name: "rose",
    label: "Rose",
    activeColor: "rgb(244 63 94)",
  },
  {
    name: "orange",
    label: "Orange",
    activeColor: "rgb(249 115 22)",
  },
  {
    name: "green",
    label: "Green",
    activeColor: "rgb(34 197 94)",
  },
  {
    name: "blue",
    label: "Blue",
    activeColor: "rgb(59 130 246)",
  },
  {
    name: "yellow",
    label: "Yellow",
    activeColor: "rgb(234 179 8)",
  },
  {
    name: "violet",
    label: "Violet",
    activeColor: "rgb(139 92 246)",
  },
]

export function ThemeCustomizer() {
  const [mounted, setMounted] = useState(false)
  const { theme: currentTheme, setTheme } = useTheme()
  const [accentColor, setAccentColor] = useState<string>("blue")

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true)
    const savedAccent = localStorage.getItem("accent-color") || "blue"
    setAccentColor(savedAccent)
    applyAccentColor(savedAccent)
  }, [])

  const applyAccentColor = (accent: string) => {
    // console.log("🎨 Applying accent color:", accent)

    // Get the document root element
    const root = document.documentElement

    // Remove all existing accent classes from body
    const body = document.body
    const existingClasses = Array.from(body.classList).filter((className) => className.startsWith("accent-"))
    existingClasses.forEach((className) => body.classList.remove(className))

    // Add new accent class to body
    body.classList.add(`accent-${accent}`)

    // Update CSS variables based on the selected accent
    const selectedTheme = themes.find((t) => t.name === accent)
    if (selectedTheme) {
      // Apply CSS variable changes directly to :root
      switch (accent) {
        case "blue":
          root.style.setProperty("--primary", "221.2 83.2% 53.3%")
          root.style.setProperty("--primary-foreground", "210 40% 98%")
          root.style.setProperty("--ring", "221.2 83.2% 53.3%")
          break
        case "red":
          root.style.setProperty("--primary", "0 72.2% 50.6%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "0 72.2% 50.6%")
          break
        case "green":
          root.style.setProperty("--primary", "142.1 76.2% 36.3%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "142.1 76.2% 36.3%")
          break
        case "orange":
          root.style.setProperty("--primary", "24.6 95% 53.1%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "24.6 95% 53.1%")
          break
        case "violet":
          root.style.setProperty("--primary", "262.1 83.3% 57.8%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "262.1 83.3% 57.8%")
          break
        case "yellow":
          root.style.setProperty("--primary", "47.9 95.8% 53.1%")
          root.style.setProperty("--primary-foreground", "26 83.3% 14.1%")
          root.style.setProperty("--ring", "47.9 95.8% 53.1%")
          break
        case "rose":
          root.style.setProperty("--primary", "346.8 77.2% 49.8%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "346.8 77.2% 49.8%")
          break
        case "zinc":
          root.style.setProperty("--primary", "240 5.9% 10%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "240 5.9% 10%")
          break
        case "slate":
          root.style.setProperty("--primary", "215.4 16.3% 46.9%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "215.4 16.3% 46.9%")
          break
        case "stone":
          root.style.setProperty("--primary", "25 5.3% 44.7%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "25 5.3% 44.7%")
          break
        case "gray":
          root.style.setProperty("--primary", "220 8.9% 46.1%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "220 8.9% 46.1%")
          break
        case "neutral":
          root.style.setProperty("--primary", "0 0% 45.1%")
          root.style.setProperty("--primary-foreground", "0 0% 98%")
          root.style.setProperty("--ring", "0 0% 45.1%")
          break
      }
    }

    // console.log("🎨 Applied accent classes:", Array.from(body.classList))
  }

  const handleAccentChange = (accent: string) => {
    // console.log("🎨 Changing accent color to:", accent)

    setAccentColor(accent)
    localStorage.setItem("accent-color", accent)
    applyAccentColor(accent)

    // Show feedback
    const selectedTheme = themes.find((t) => t.name === accent)
    if (selectedTheme) {
      toast.success(`Theme changed to ${selectedTheme.label}`, {
        duration: 2000,
      })
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Paintbrush className="h-5 w-5" />
          <span className="sr-only">Customize theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        <div className="flex flex-col gap-4 p-4">
          <div>
            <p className="text-sm font-medium mb-2">Accent Color</p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => (
                <Button
                  key={theme.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAccentChange(theme.name)}
                  className={cn(
                    "justify-start h-8 px-2",
                    accentColor === theme.name && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  <span
                    className="mr-2 flex h-4 w-4 shrink-0 rounded-full border"
                    style={{ backgroundColor: theme.activeColor }}
                  />
                  <span className="text-xs">{theme.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Current theme: {currentTheme} with {accentColor} accent
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
