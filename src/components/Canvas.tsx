import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Edit, Eye, Play, Copy, Download, Maximize2, Minimize2, FileText, Code2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface CanvasData {
  type: "markdown" | "code";
  title: string;
  content: string;
  language?: string;
  updatedAt: number;
}

interface CanvasProps {
  messageId: Id<"messages">;
  canvasData: CanvasData;
  isEditable?: boolean;
  onUpdate?: (data: CanvasData) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ 
  messageId, 
  canvasData, 
  isEditable = true,
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(canvasData.content);
  const [editedTitle, setEditedTitle] = useState(canvasData.title);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Convex mutation for updating canvas data
  const updateMessage = useMutation(api.messages.updateCanvas);

  // Reset edited content when canvas data changes
  useEffect(() => {
    setEditedContent(canvasData.content);
    setEditedTitle(canvasData.title);
  }, [canvasData.content, canvasData.title]);

  const handleSave = useCallback(async () => {
    try {
      const updatedData: CanvasData = {
        ...canvasData,
        title: editedTitle.trim() || canvasData.title,
        content: editedContent,
        updatedAt: Date.now(),
      };

      await updateMessage({
        messageId,
        canvasData: updatedData,
      });

      onUpdate?.(updatedData);
      setIsEditing(false);
      
      toast.success("Canvas updated successfully");
    } catch (error) {
      console.error("Failed to update canvas:", error);
      toast.error("Failed to update canvas");
    }
  }, [messageId, canvasData, editedTitle, editedContent, updateMessage, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditedContent(canvasData.content);
    setEditedTitle(canvasData.title);
    setIsEditing(false);
  }, [canvasData.content, canvasData.title]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(canvasData.content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  }, [canvasData.content]);

  const handleDownload = useCallback(() => {
    const extension = canvasData.type === "markdown" ? "md" : 
                     canvasData.language || "html";
    const filename = `${canvasData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
    
    const blob = new Blob([canvasData.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("File downloaded");
  }, [canvasData]);

  // Generate HTML preview for code canvas
  const codePreview = useMemo(() => {
    if (canvasData.type !== "code") return "";
    
    // Create a complete HTML document with the code content
    let htmlContent = editedContent;
    
    // If it's not a complete HTML document, wrap it
    if (!htmlContent.toLowerCase().includes('<html')) {
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${editedTitle}</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    }
    
    return htmlContent;
  }, [canvasData.type, editedContent, editedTitle]);

  const refreshPreview = useCallback(() => {
    if (iframeRef.current && canvasData.type === "code") {
      const iframe = iframeRef.current;
      iframe.srcdoc = codePreview;
    }
  }, [codePreview, canvasData.type]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  return (
    <>
      {/* Backdrop overlay when fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      
      <Card className={cn(
        "canvas-container mt-4 overflow-hidden transition-all duration-300",
        isFullscreen && "fixed inset-8 z-50 shadow-2xl bg-background border-2"
      )}>
        {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          {canvasData.type === "markdown" ? (
            <FileText className="w-5 h-5 text-blue-500" />
          ) : (
            <Code2 className="w-5 h-5 text-green-500" />
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b border-border/50 focus:border-primary outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
            />
          ) : (
            <h3 className="text-lg font-semibold">{canvasData.title}</h3>
          )}
          
          <Badge variant="secondary" className="text-xs">
            {canvasData.type === "markdown" ? "Markdown" : canvasData.language || "HTML"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            className="h-8 w-8 p-0"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          {isEditable && (
            <>
              {isEditing ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSave()}
                    className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8 px-3"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Canvas Content */}
      <div className={cn(
        "canvas-content",
        isFullscreen ? "h-[calc(100vh-120px)]" : "h-96"
      )}>
        {canvasData.type === "markdown" ? (
          /* Markdown Canvas */
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "editor" | "preview")} className="h-full">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              {(isEditing || isEditable) && (
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="preview" className="h-[calc(100%-60px)] m-4 mt-2">
              <div className="h-full overflow-auto prose prose-sm max-w-none p-4 bg-background rounded-lg border">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkEmoji]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {isEditing ? editedContent : canvasData.content}
                </ReactMarkdown>
              </div>
            </TabsContent>

            {(isEditing || isEditable) && (
              <TabsContent value="editor" className="h-[calc(100%-60px)] m-4 mt-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                  placeholder="Write your markdown content here..."
                  disabled={!isEditing}
                />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          /* Code Canvas */
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "editor" | "preview")} className="h-full">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Preview
              </TabsTrigger>
              {(isEditing || isEditable) && (
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  Code
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="preview" className="h-[calc(100%-60px)] m-4 mt-2">
              <iframe
                ref={iframeRef}
                srcDoc={codePreview}
                className="w-full h-full rounded-lg border bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title={`Preview: ${canvasData.title}`}
              />
            </TabsContent>

            {(isEditing || isEditable) && (
              <TabsContent value="editor" className="h-[calc(100%-60px)] m-4 mt-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                  placeholder="Write your HTML, CSS, and JavaScript here..."
                  disabled={!isEditing}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </Card>
    </>
  );
};

export default Canvas; 