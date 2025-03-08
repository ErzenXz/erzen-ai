"use client";

import { useState, useRef, useEffect } from "react";
import { X, FileText, Upload, File as FileIcon, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isSupportedFileType, getFilePreview, readFromFile } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
}

interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  error?: string;
}

export function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      
      const newFiles = Array.from(e.target.files) as FileWithPreview[];
      
      // Filter out unsupported file types
      const supportedFiles = newFiles.filter(file => isSupportedFileType(file));
      const unsupportedFiles = newFiles.filter(file => !isSupportedFileType(file));
      
      // Mark unsupported files with an error
      unsupportedFiles.forEach(file => {
        file.error = "Unsupported file type";
        file.progress = 100;
      });
      
      // Process supported files in parallel
      const processedFiles = await Promise.all(
        supportedFiles.map(async (file) => {
          try {
            file.progress = 0;
            
            // Generate preview
            file.preview = await getFilePreview(file);
            
            // Process file content (this will be used when sending the message)
            await readFromFile(file, {
              onProgress: (progress) => {
                // Update progress for this specific file
                setFiles(prevFiles => {
                  return prevFiles.map(f => 
                    f.name === file.name ? { ...f, progress } : f
                  ) as FileWithPreview[];
                });
              }
            });
            
            file.progress = 100;
            return file;
          } catch (error) {
            file.error = "Failed to process file";
            file.progress = 100;
            return file;
          }
        })
      );
      
      // Combine all files (supported and unsupported)
      const allFiles = [...processedFiles, ...unsupportedFiles];
      
      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...allFiles];
        onFilesChange(updatedFiles);
        return updatedFiles;
      });
      
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);
      onFilesChange(updatedFiles);
      return updatedFiles;
    });
  };

  const triggerFileInput = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Return different colors based on file type
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
    } else if (['pdf'].includes(extension || '')) {
      return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300";
    } else if (['doc', 'docx', 'txt', 'md'].includes(extension || '')) {
      return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
    } else if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300";
    } else {
      return "bg-primary/10 text-primary";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <TooltipProvider>
      <div className="w-full mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".txt,.md,.json,.csv,.doc,.docx,.xls,.xlsx,.pdf,.js,.ts,.jsx,.tsx,.html,.css,.xml"
        />

        {files.length === 0 ? (
          <div className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
            <Button
              variant="ghost"
              className="h-20 w-full flex flex-col items-center justify-center gap-2"
              onClick={triggerFileInput}
              type="button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm font-medium">Processing files...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-medium">Upload files</p>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop or click to upload
                    </p>
                  </div>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="px-3 py-1">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerFileInput}
                type="button"
                className="h-8"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add more
                  </>
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-2",
                      "bg-background/50 backdrop-blur-sm hover:bg-muted/50 transition-colors",
                      file.error && "border-destructive/50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <div className={cn(
                        "flex h-9 w- 9 items-center justify-center rounded-md",
                        getFileTypeIcon(file.name)
                      )}>
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          {file.error && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center text-destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  <span className="text-xs">Error</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{file.error}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      {file.progress !== undefined && file.progress < 100 && (
                        <Progress value={file.progress} className="h-1 w-12" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive ml-2 flex-shrink-0"
                      onClick={(e) => removeFile(index, e)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}