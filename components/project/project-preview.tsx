"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ProjectPreviewProps {
  projectFiles: Array<{
    path: string
    content?: string
  }>
  activeFilePath?: string
  className?: string
}

export function ProjectPreview({ projectFiles, activeFilePath, className }: ProjectPreviewProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create a blob URL for the HTML file to preview
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    try {
      // Find the entry point - we'll use index.html or another HTML file as the main entry
      let entryFile = projectFiles.find(file => file.path === "index.html") || 
                      projectFiles.find(file => file.path.endsWith(".html"))

      // If no HTML file is found but we have an active file that is HTML, use that
      if (!entryFile && activeFilePath?.endsWith(".html")) {
        entryFile = projectFiles.find(file => file.path === activeFilePath);
      }

      // If we still don't have an entry point, look for README.md or other common entry points
      if (!entryFile) {
        entryFile = projectFiles.find(file => file.path === "README.md") ||
                    projectFiles.find(file => file.path.endsWith("main.js")) ||
                    projectFiles.find(file => file.path.endsWith("app.js"));
      }

      // If we have no valid entry point at all, show an error
      if (!entryFile || !entryFile.content) {
        setError("No valid preview entry point found. Try creating an index.html file.");
        setIsLoading(false);
        return;
      }

      // Process the entry file - if it's HTML, we can use it directly
      // If it's another file type, wrap it in appropriate HTML
      let htmlContent = entryFile.content;
      
      if (!entryFile.path.endsWith(".html")) {
        // For non-HTML files, create appropriate wrappers
        if (entryFile.path.endsWith(".md")) {
          // Simple markdown preview (you might want to use a proper markdown renderer)
          htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Markdown Preview</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; color: ${isDark ? '#e1e1e1' : '#333'}; background: ${isDark ? '#1a1a1a' : '#fff'}; }
                  pre { background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 10px; overflow: auto; border-radius: 3px; }
                  code { font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; }
                  img { max-width: 100%; }
                </style>
              </head>
              <body>
                <pre>${entryFile.content}</pre>
              </body>
            </html>
          `;
        } else if (entryFile.path.endsWith(".js")) {
          // JavaScript preview
          htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>JavaScript Preview</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: ${isDark ? '#e1e1e1' : '#333'}; background: ${isDark ? '#1a1a1a' : '#fff'}; }
                  #output { border: 1px solid #ccc; padding: 10px; margin-top: 20px; min-height: 100px; }
                </style>
              </head>
              <body>
                <h3>JavaScript Output:</h3>
                <div id="output"></div>
                <script>
                  // Redirect console.log to our output div
                  (function() {
                    const output = document.getElementById('output');
                    const originalLog = console.log;
                    console.log = function(...args) {
                      originalLog.apply(console, args);
                      const text = args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                      ).join(' ');
                      const p = document.createElement('p');
                      p.textContent = text;
                      output.appendChild(p);
                    };
                  })();

                  // Run the code with error handling
                  try {
                    ${entryFile.content}
                  } catch (error) {
                    console.log('Error:', error.message);
                  }
                </script>
              </body>
            </html>
          `;
        } else {
          // Generic file preview
          htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>File Preview</title>
                <style>
                  body { font-family: monospace; white-space: pre; padding: 20px; color: ${isDark ? '#e1e1e1' : '#333'}; background: ${isDark ? '#1a1a1a' : '#fff'}; }
                </style>
              </head>
              <body>${entryFile.content}</body>
            </html>
          `;
        }
      } else {
        // For HTML files, we need to handle relative imports by injecting other project files
        // This is a simplified implementation - a real solution would need more complex processing
        
        // Function to find files referenced in HTML and inject inline
        const injectProjectFiles = (html: string) => {
          // Process CSS imports and inject them
          projectFiles.forEach(file => {
            if (file.path.endsWith('.css') && file.content) {
              const cssLinkRegex = new RegExp(`<link[^>]*href=["']${file.path}["'][^>]*>`, 'g');
              if (html.match(cssLinkRegex)) {
                html = html.replace(cssLinkRegex, `<style>${file.content}</style>`);
              }
            }
            
            // Process JS imports and inject them
            if (file.path.endsWith('.js') && file.content) {
              const scriptRegex = new RegExp(`<script[^>]*src=["']${file.path}["'][^>]*></script>`, 'g');
              if (html.match(scriptRegex)) {
                html = html.replace(scriptRegex, `<script>${file.content}</script>`);
              }
            }
          });
          
          return html;
        };
        
        htmlContent = injectProjectFiles(htmlContent);
      }

      // Create a blob URL for the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setIsLoading(false);

      // Clean up the blob URL when the component unmounts or when we create a new one
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error creating preview:', err);
      setError('Failed to generate preview');
      setIsLoading(false);
    }
  }, [projectFiles, activeFilePath, isDark]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Generating preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="mb-4">
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg inline-block">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          </div>
          <h3 className="text-xl font-medium mb-2">Preview Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full bg-background", className)}>
      {previewUrl && (
        <iframe
          src={previewUrl}
          title="Project Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-modals allow-forms"
        />
      )}
    </div>
  );
} 