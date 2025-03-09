"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Copy, Check, FileText, BookOpen } from "lucide-react";
import { cn, getFileTypeColor } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface FileAttachmentProps {
  readonly name: string;
  readonly children: string;
  readonly error?: string;
  readonly meta?: {
    pageCount?: number;
    hasImages?: boolean;
    outline?: string[];
  };
}

export function FileAttachment({ name, children, error, meta }: FileAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isPreviewPdf = name.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    // Load PDF preview if it's a PDF file
    if (isPreviewPdf && !pdfPreview && !isPreviewLoading) {
      loadPdfPreview();
    }
  }, [name, children]);

  const loadPdfPreview = async () => {
    if (!isPreviewPdf || isPreviewLoading) return;
    
    setIsPreviewLoading(true);
    try {
      // Create a File object from the PDF content if we need to
      // In this case, we're just showing the existing preview text
      const filePreview = children.trim();
      setPdfPreview(filePreview);
    } catch (err) {
      console.error("Error loading PDF preview:", err);
      setPdfPreview("[PDF Preview not available]");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Measure content height when expanded
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded, children]);
  
  // Ensure ScrollArea is properly sized
  useEffect(() => {
    if (isExpanded && scrollAreaRef.current) {
      // Force a reflow to ensure the scrollArea takes the proper dimensions
      scrollAreaRef.current.style.display = 'none';
      // eslint-disable-next-line no-unused-expressions
      scrollAreaRef.current.offsetHeight;
      scrollAreaRef.current.style.display = '';
    }
  }, [isExpanded]);
  
  // Get a preview of the content (first 100 characters)
  const getPreview = () => {
    if (isPreviewLoading) {
      return "Loading PDF preview...";
    }

    if (isPreviewPdf && pdfPreview) {
      const previewText = pdfPreview.substring(0, 100);
      return previewText.length === 100 ? previewText + '...' : previewText;
    }

    if (children.length <= 100) {
      return children;
    }
    return children.substring(0, 100) + '...';
  };
  
  // Determine file type
  const getFileType = () => {
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    if (['csv', 'xls', 'xlsx', 'json'].includes(extension)) {
      return 'structured';
    } else if (['pdf'].includes(extension)) {
      return 'pdf';
    }
    return 'text';
  };
  
  const fileType = getFileType();
  
  // Calculate appropriate max height based on content
  const getMaxHeight = () => {
    // Set larger height for structured data files and PDFs
    if (fileType === 'structured' || fileType === 'pdf') {
      return "max-h-[500px]";
    }
    
    // For very large content, cap at 500px
    if (contentHeight && contentHeight > 1000) {
      return "max-h-[500px]";
    }
    
    // For medium content
    if (contentHeight && contentHeight > 300) {
      return "max-h-[400px]";
    }
    
    // Default height
    return "max-h-[300px]";
  };

  // Get file icon based on type
  const getFileIcon = () => {
    if (fileType === 'pdf') {
      return <BookOpen className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };
  
  // Get a special info header for PDFs
  const getPDFInfo = () => {
    if (fileType !== 'pdf') {
      return null;
    }
    
    return (
      <div className="px-4 py-2 text-xs text-muted-foreground border-t border-b bg-muted/20">
        {isPreviewLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            {meta?.pageCount && <span className="mr-3">Pages: {meta.pageCount}</span>}
            {meta?.hasImages && <span className="mr-3">Contains images</span>}
            {!meta && !isPreviewLoading && <span>PDF Document</span>}
          </>
        )}
      </div>
    );
  };
  
  // Format PDF content better by preserving page breaks
  const formatContent = () => {
    if (fileType === 'pdf') {
      if (isPreviewLoading) {
        return (
          <div className="flex items-center justify-center py-8">
            <Skeleton className="h-20 w-4/5" />
            <Skeleton className="h-20 w-4/5 mt-4" />
          </div>
        );
      }

      // Return the content with enhanced styling for page markers
      return (
        <div className="pdf-content">
          {children.split('------- Page').map((page, pageIdx) => {
            if (pageIdx === 0) {
              // If first part contains metadata, render it specially
              if (page.includes('PDF METADATA') && page.trim() !== '') {
                return (
                  <div key="metadata" className="pdf-metadata mb-4 pb-2 border-b border-dashed border-muted">
                    <div className="font-semibold text-xs text-muted-foreground mb-1 bg-muted/20 p-1 rounded">
                      Metadata
                    </div>
                    <div className="whitespace-pre-wrap text-muted-foreground">{page}</div>
                  </div>
                );
              }
              return null; // Skip empty first part
            }
            
            return (
              <div key={`page-${pageIdx}`} className="pdf-page mb-4 pb-4 border-b border-dashed border-muted">
                <div className="font-semibold text-xs text-muted-foreground mb-2 bg-muted/20 p-1 rounded sticky top-0">
                  Page{page.split('-------')[0]}
                </div>
                <div className="whitespace-pre-wrap">{page.split('-------')[1]}</div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // For all other types, just return the content as is
    return children;
  };
  
  return (
    <Card className="my-4 overflow-hidden border">
      <div className="flex items-center justify-between p-3 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            getFileTypeColor(name)
          )}>
            {getFileIcon()}
          </div>
          <div>
            <p className="font-medium text-sm">{name}</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={copyToClipboard}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy file content</span>
          </Button>
          <Button
            size="sm"
            className="h-8 flex items-center gap-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="text-xs">Hide content</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-xs">Show content</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {fileType === 'pdf' && getPDFInfo()}
      
      {!isExpanded && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-background/50 border-t">
          {isPreviewLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <p className="truncate">{getPreview()}</p>
          )}
        </div>
      )}
      
      {isExpanded && (
        <div ref={scrollAreaRef} className="border-t">
          <ScrollArea 
            className={cn(getMaxHeight())}
            type="always"
          >
            <div 
              ref={contentRef}
              className={cn(
                "p-4 text-xs font-mono break-words bg-background/50",
                fileType === 'structured' && "tabular-nums whitespace-pre-wrap",
                fileType === 'pdf' ? "" : "whitespace-pre-wrap"
              )}
            >
              {formatContent()}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}