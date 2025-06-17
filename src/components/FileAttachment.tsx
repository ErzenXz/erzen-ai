import React from "react";
import { File, Image, X, Download, FileText, FileIcon, VideoIcon, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileAttachmentProps {
  type: "image" | "file" | "audio" | "video";
  name: string;
  url: string;
  size?: number;
  onRemove?: () => void;
  showRemove?: boolean;
  className?: string;
  extractedText?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

const getFileIcon = (fileName: string, fileType?: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const type = fileType?.toLowerCase();
  
  if (type?.includes('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return Image;
  }
  if (type?.includes('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
    return VideoIcon;
  }
  if (type?.includes('audio/') || ['mp3', 'wav', 'ogg'].includes(ext || '')) {
    return Music;
  }
  if (['pdf'].includes(ext || '')) {
    return FileText;
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return FileText;
  }
  return FileIcon;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileColor = (fileName: string, fileType?: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const type = fileType?.toLowerCase();
  
  if (type?.includes('image/')) return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
  if (type?.includes('video/')) return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
  if (type?.includes('audio/')) return 'bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400';
  if (['pdf'].includes(ext || '')) return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
  if (['doc', 'docx'].includes(ext || '')) return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
  if (['txt', 'md'].includes(ext || '')) return 'bg-muted border-border text-muted-foreground';
  if (['json', 'csv'].includes(ext || '')) return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
  
  return 'bg-muted border-border text-muted-foreground';
};

export function FileAttachment({ 
  type, 
  name, 
  url, 
  size, 
  onRemove, 
  showRemove = false, 
  className,
  extractedText,
  isUploading,
  uploadProgress
}: FileAttachmentProps) {
  const IconComponent = getFileIcon(name);
  const colorClass = getFileColor(name);
  const isImage = type === "image";
  const isAudio = type === "audio";
  const isVideo = type === "video";
  const isMediaFile = isImage || isAudio || isVideo;

  return (
    <div className={cn(
      "relative group rounded-lg border transition-all hover:shadow-md",
      colorClass,
      className
    )}>
      {/* Remove button */}
      {showRemove && onRemove && !isUploading && (
        <Button
          onClick={onRemove}
          size="sm"
          variant="destructive"
          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <X size={12} />
        </Button>
      )}

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center z-10">
          <Loader2 size={12} className="animate-spin" />
        </div>
      )}

      {/* File content */}
      <div className="p-3 space-y-2">
        {isImage && url ? (
          <div className="space-y-2">
            <div className="relative">
              <img 
                src={url} 
                alt={name} 
                className={cn(
                  "w-full h-32 object-cover rounded-md transition-opacity",
                  isUploading && "opacity-75"
                )}
                onError={(e) => {
                  // Fallback to file icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* Upload overlay for images */}
              {isUploading && (
                <div className="absolute inset-0 bg-background/20 rounded-md flex items-center justify-center">
                  <div className="bg-card/90 rounded-lg p-2 text-xs font-medium text-card-foreground">
                    Uploading...
                  </div>
                </div>
              )}
            </div>
            <div className="hidden flex items-center gap-2">
              <IconComponent size={16} />
              <span className="text-sm font-medium truncate">{name}</span>
            </div>
            {/* Progress bar for images */}
            {isUploading && uploadProgress !== undefined && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <div className="text-xs text-center text-muted-foreground">
                  {uploadProgress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        ) : isAudio && url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} />
              <span className="text-sm font-medium truncate">{name}</span>
            </div>
            {!isUploading && (
              <audio 
                controls 
                className="w-full"
                src={url}
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
            )}
            {isUploading && (
              <div className="text-center p-4 border rounded-md bg-muted/20">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Processing audio...</p>
              </div>
            )}
            {/* Progress bar for audio */}
            {isUploading && uploadProgress !== undefined && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <div className="text-xs text-center text-muted-foreground">
                  {uploadProgress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        ) : isVideo && url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <VideoIcon size={16} />
              <span className="text-sm font-medium truncate">{name}</span>
            </div>
            {!isUploading && (
              <video 
                controls 
                className="w-full max-h-48 rounded-md"
                src={url}
                preload="metadata"
              >
                Your browser does not support the video element.
              </video>
            )}
            {isUploading && (
              <div className="text-center p-4 border rounded-md bg-muted/20">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Processing video...</p>
              </div>
            )}
            {/* Progress bar for video */}
            {isUploading && uploadProgress !== undefined && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <div className="text-xs text-center text-muted-foreground">
                  {uploadProgress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <IconComponent size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                {size && (
                  <p className="text-xs opacity-75">{formatFileSize(size)}</p>
                )}
                {isUploading && (
                  <p className="text-xs text-primary">Uploading...</p>
                )}
              </div>
            </div>
            {/* Progress bar for files */}
            {isUploading && uploadProgress !== undefined && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1" />
                <div className="text-xs text-muted-foreground">
                  {uploadProgress.toFixed(0)}% uploaded
                </div>
              </div>
            )}
          </div>
        )}

        {/* File type badge and download button */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {isUploading ? "Uploading" : 
             type === "image" ? "Image" : 
             type === "audio" ? "Audio" : 
             type === "video" ? "Video" : "File"}
          </Badge>
          
          {/* Download button - only show when not uploading */}
          {url && !isUploading && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download size={12} />
            </Button>
          )}
        </div>

        {/* Extracted text preview */}
        {extractedText && extractedText.length > 0 && !extractedText.includes('[') && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <p className="text-muted-foreground mb-1">Content preview:</p>
            <p className="line-clamp-2">{extractedText}</p>
          </div>
        )}
      </div>
    </div>
  );
} 