'use client';

import * as React from 'react';
import { Check, Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleSelectTheme = (newTheme: string) => {
    setTheme(newTheme);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 relative overflow-hidden group"
          title="Select a theme"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 transition-all" />
          ) : theme === 'dark' ? (
            <Moon className="h-4 w-4 transition-all" />
          ) : (
            <Palette className="h-4 w-4 transition-all" />
          )}
          <span className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-md transition-opacity" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 p-2 rounded-xl shadow-lg border-border/40 backdrop-blur-sm bg-card/95"
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground mb-1">
          Appearance
        </DropdownMenuLabel>
        
        <DropdownMenuGroup className="grid grid-cols-2 gap-1">
          <ThemeMenuItem 
            value="light" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            icon={<Sun className="h-4 w-4 mr-2 text-amber-500" />}
            colors="bg-gradient-to-br from-blue-50 to-gray-100 border-gray-200 text-gray-800"
            label="Light"
          />
          <ThemeMenuItem 
            value="dark" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            icon={<Moon className="h-4 w-4 mr-2 text-blue-400" />}
            colors="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-gray-200"
            label="Dark"
          />
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground mb-1">
          Colors
        </DropdownMenuLabel>
        
        <div className="grid grid-cols-3 gap-1.5">
          <ThemeMenuItem 
            value="blue" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 text-white"
          />
          <ThemeMenuItem 
            value="green" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white"
          />
          <ThemeMenuItem 
            value="purple" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400 text-white"
          />
          <ThemeMenuItem 
            value="yellow" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-yellow-400 to-yellow-500 border-yellow-300 text-white"
          />
          <ThemeMenuItem 
            value="pink" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-pink-500 to-pink-600 border-pink-400 text-white"
          />
          <ThemeMenuItem 
            value="orange" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 text-white"
          />
          <ThemeMenuItem 
            value="teal" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-teal-500 to-teal-600 border-teal-400 text-white"
          />
          <ThemeMenuItem 
            value="gray" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 text-white"
          />
          <ThemeMenuItem 
            value="system" 
            currentTheme={theme} 
            onSelect={handleSelectTheme}
            colors="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 border-blue-400 text-white"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeMenuItem({ 
  value, 
  currentTheme, 
  onSelect, 
  icon, 
  colors,
  label
}: { 
  value: string 
  currentTheme: string | undefined
  onSelect: (theme: string) => void
  icon?: React.ReactNode
  colors: string
  label?: string
}) {
  const isActive = currentTheme === value;
  const displayLabel = label || value;
  
  return (
    <button
      className={cn(
        "relative flex items-center justify-center rounded-md p-2 text-sm font-medium transition-all",
        "border hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50",
        colors,
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={() => onSelect(value)}
    >
      {icon ? (
        <>
          {icon}
          <span className="capitalize">{displayLabel}</span>
        </>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          {isActive && (
            <Check className="h-4 w-4 absolute text-white drop-shadow-md" />
          )}
          <span className="capitalize sr-only">{displayLabel}</span>
        </div>
      )}
    </button>
  );
}