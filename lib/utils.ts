import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function getFileTypeColor(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension ?? "")) {
    return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
  } else if (["pdf"].includes(extension ?? "")) {
    return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300";
  } else if (["doc", "docx", "txt", "md"].includes(extension ?? "")) {
    return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
  } else if (["xls", "xlsx", "csv"].includes(extension ?? "")) {
    return "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300";
  } else {
    return "bg-primary/10 text-primary";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
}
