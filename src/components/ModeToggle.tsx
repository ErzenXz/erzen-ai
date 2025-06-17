import { useEffect, useState } from "react"
import { Moon, Sun, Palette, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const colorThemes = [
  { name: "Default", value: "default", colors: ["bg-slate-600", "bg-slate-500"] },
  { name: "Blue", value: "theme-blue", colors: ["bg-blue-600", "bg-blue-500"] },
  { name: "Green", value: "theme-green", colors: ["bg-green-600", "bg-green-500"] },
  { name: "Purple", value: "theme-purple", colors: ["bg-purple-600", "bg-purple-500"] },
  { name: "Orange", value: "theme-orange", colors: ["bg-orange-600", "bg-orange-500"] },
  { name: "Pink", value: "theme-pink", colors: ["bg-pink-600", "bg-pink-500"] },
  { name: "Teal", value: "theme-teal", colors: ["bg-teal-600", "bg-teal-500"] },
  { name: "Red", value: "theme-red", colors: ["bg-red-600", "bg-red-500"] },
  { name: "Indigo", value: "theme-indigo", colors: ["bg-indigo-600", "bg-indigo-500"] },
]

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("default")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])


  useEffect(() => {
    // Get the current color theme from document class
    const currentColorTheme = colorThemes.find(t =>
      document.documentElement.classList.contains(t.value)
    )?.value ?? "default"
    setColorTheme(currentColorTheme)
  }, [])

  const handleColorThemeChange = (newColorTheme: string) => {
    // Remove all color theme classes
    colorThemes.forEach(t => {
      if (t.value !== "default") {
        document.documentElement.classList.remove(t.value)
      }
    })

    // Add the new color theme class
    if (newColorTheme !== "default") {
      document.documentElement.classList.add(newColorTheme)
    }

    setColorTheme(newColorTheme)
    localStorage.setItem("color-theme", newColorTheme)
  }

  // Load saved color theme on mount
  useEffect(() => {
    const savedColorTheme = localStorage.getItem("color-theme") ?? "default"
    handleColorThemeChange(savedColorTheme)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-4">
        {/* Appearance Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Appearance</h4>

          {/* Light/Dark/System Toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all",
                theme === "light"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all",
                theme === "dark"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Moon size={14} />
              Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all",
                theme === "system"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor size={14} />
              Auto
            </button>
          </div>
        </div>

        {/* Colors Section */}
        <div className="space-y-3 mt-6">
          <h4 className="text-sm font-medium text-muted-foreground">Colors</h4>

          <div className="grid grid-cols-3 gap-2">
            {colorThemes.map((colorThemeOption) => (
              <button
                key={colorThemeOption.value}
                onClick={() => handleColorThemeChange(colorThemeOption.value)}
                className={cn(
                  "relative h-8 rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                  colorTheme === colorThemeOption.value
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground"
                )}
                title={colorThemeOption.name}
              >
                <div className="flex h-full">
                  <div className={cn("flex-1", colorThemeOption.colors[0])} />
                  <div className={cn("flex-1", colorThemeOption.colors[1])} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}