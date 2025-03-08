import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
// Updated imports for document processing
import type * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

// We'll dynamically import PDF.js in browser context
let pdfjsLib: typeof pdfjs | null = null;

// Initialize PDF.js in client-side only
if (typeof window !== "undefined") {
  // This function will be called when we need PDF.js functionality
  const initPdfJs = async () => {
    if (pdfjsLib) return pdfjsLib;

    try {
      // Dynamic import of PDF.js for the browser
      pdfjsLib = await import("pdfjs-dist/webpack.mjs");

      // Set worker source with a more reliable approach
      // First try to use the version from pdfjsLib
      const pdfJsVersion = pdfjsLib.version || "4.10.38";

      // Set worker path to CDN
      const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsVersion}/pdf.worker.min.js`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      console.log("PDF.js initialized successfully with worker:", workerUrl);
      return pdfjsLib;
    } catch (err) {
      console.error("Failed to load PDF.js:", err);
      throw new Error("PDF.js library failed to load");
    }
  };

  // Pre-initialize PDF.js
  initPdfJs().catch(console.error);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Reads files of various formats as text or structured data
 * Supports large files through streaming and chunk processing
 * @param file The file to read
 * @param options Configuration options for reading
 * @returns Promise with the file contents in the appropriate format
 */
export async function readFromFile(
  file: File,
  options: {
    maxSizeInMB?: number;
    chunkSize?: number;
    format?: "text" | "json" | "arraybuffer" | "dataurl";
    onProgress?: (progress: number) => void;
  } = {}
): Promise<string | object | ArrayBuffer> {
  const {
    maxSizeInMB = 100,
    chunkSize = 1024 * 1024 * 2, // 2MB chunks
    format = "text",
    onProgress,
  } = options;

  // Safety check for extremely large files
  if (file.size > maxSizeInMB * 1024 * 1024) {
    throw new Error(`File exceeds maximum size of ${maxSizeInMB}MB`);
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  // Report initial progress
  if (onProgress) {
    onProgress(0);
  }

  // For smaller files, use simpler methods
  if (file.size < chunkSize) {
    try {
      // Handle specific file types
      if (["docx", "doc"].includes(extension ?? "")) {
        const content = await readWordDocument(file, onProgress);
        if (onProgress) {
          onProgress(100);
        }
        return content;
      } else if (["xlsx", "xls"].includes(extension ?? "")) {
        const content = await readExcelFile(file, onProgress);
        if (onProgress) {
          onProgress(100);
        }
        return content;
      } else if (["csv"].includes(extension ?? "")) {
        const content = await readCSVFile(file, onProgress);
        if (onProgress) {
          onProgress(100);
        }
        return content;
      } else if (["pdf"].includes(extension ?? "")) {
        const content = await readPDFFile(file, onProgress);
        if (onProgress) {
          onProgress(100);
        }
        return content;
      } else {
        // For other file types, default to requested format
        let result;
        switch (format) {
          case "text": {
            result = await readFileAsText(file);
            break;
          }
          case "json": {
            result = await readFileAsJSON(file);
            break;
          }
          case "arraybuffer": {
            result = await readFileAsArrayBuffer(file);
            break;
          }
          case "dataurl": {
            result = await readFileAsDataURL(file);
            break;
          }
          default: {
            result = await readFileAsText(file);
            break;
          }
        }
        if (onProgress) {
          onProgress(100);
        }
        return result;
      }
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error(
        `Failed to read file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // For larger files, use chunked reading
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileSize = file.size;
    const chunks: Uint8Array[] = [];
    let offset = 0;

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (e.target?.result) {
        const chunk = new Uint8Array(e.target.result as ArrayBuffer);
        chunks.push(chunk);
        offset += chunk.length;

        // Report progress
        if (onProgress) {
          onProgress(Math.min(100, Math.round((offset / fileSize) * 100)));
        }

        if (offset < fileSize) {
          readNextChunk();
        } else {
          // Combine all chunks
          const totalLength = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0
          );
          const combinedChunks = new Uint8Array(totalLength);

          let position = 0;
          for (const chunk of chunks) {
            combinedChunks.set(chunk, position);
            position += chunk.length;
          }

          // Process combined data based on file type
          try {
            (async () => {
              if (["docx", "doc"].includes(extension ?? "")) {
                try {
                  // For Word documents, we need to process the whole file
                  const blob = new Blob([combinedChunks.buffer], {
                    type: file.type,
                  });
                  const wordFile = new File([blob], file.name, {
                    type: file.type,
                  });
                  const content = await readWordDocument(wordFile, onProgress);
                  resolve(content);
                } catch (error) {
                  console.error("Error processing Word document:", error);
                  resolve(
                    `Failed to read Word document: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  );
                }
              } else if (["xlsx", "xls"].includes(extension ?? "")) {
                try {
                  // For Excel files, we need to process the whole file
                  const blob = new Blob([combinedChunks.buffer], {
                    type: file.type,
                  });
                  const excelFile = new File([blob], file.name, {
                    type: file.type,
                  });
                  const content = await readExcelFile(excelFile, onProgress);
                  resolve(content);
                } catch (error) {
                  console.error("Error processing Excel file:", error);
                  resolve(
                    `Failed to read Excel file: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  );
                }
              } else if (["csv"].includes(extension ?? "")) {
                try {
                  const text = new TextDecoder().decode(combinedChunks);
                  processCSV(text)
                    .then(resolve)
                    .catch((error) => {
                      console.error("Error processing CSV file:", error);
                      resolve(
                        `Failed to read CSV file: ${
                          error instanceof Error
                            ? error.message
                            : "Unknown error"
                        }`
                      );
                    });
                } catch (error) {
                  console.error("Error processing CSV file:", error);
                  resolve(
                    `Failed to read CSV file: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  );
                }
              } else if (["pdf"].includes(extension ?? "")) {
                try {
                  // For PDFs, we need to process the whole file
                  const pdf = await readPDFBuffer(
                    combinedChunks.buffer,
                    onProgress
                  );
                  resolve(pdf);
                } catch (error) {
                  console.error("Error processing PDF file:", error);
                  resolve(
                    `Failed to read PDF file: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  );
                }
              } else {
                // For other file types, convert based on requested format
                switch (format) {
                  case "text":
                    resolve(new TextDecoder().decode(combinedChunks));
                    break;
                  case "json":
                    try {
                      const text = new TextDecoder().decode(combinedChunks);
                      resolve(JSON.parse(text));
                    } catch (error) {
                      reject(new Error("Failed to parse JSON file"));
                    }
                    break;
                  case "arraybuffer":
                    resolve(combinedChunks.buffer);
                    break;
                  case "dataurl":
                    const base64 = btoa(
                      Array.from(combinedChunks)
                        .map((byte) => String.fromCharCode(byte))
                        .join("")
                    );
                    resolve(`data:${file.type};base64,${base64}`);
                    break;
                  default:
                    resolve(new TextDecoder().decode(combinedChunks));
                }
              }
            })();
          } catch (error) {
            console.error("Error processing file:", error);
            reject(
              new Error(
                `Failed to process file: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              )
            );
          }
        }
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Error reading file"));
    };

    readNextChunk();
  });
}

// Basic file reading functions
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error("Error reading text file:", error);
      reject(new Error("Error reading text file"));
    };
    reader.readAsText(file);
  });
}

export async function readFileAsJSON(file: File): Promise<object> {
  try {
    const text = await readFileAsText(file);
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    throw new Error("Failed to parse JSON file");
  }
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (error) => {
      console.error("Error reading file as array buffer:", error);
      reject(new Error("Error reading file as array buffer"));
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error("Error reading file as data URL:", error);
      reject(new Error("Error reading file as data URL"));
    };
    reader.readAsDataURL(file);
  });
}

// Enhanced document reading functions

/**
 * Read PDF files using PDF.js
 */
export async function readPDFFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    return readPDFBuffer(arrayBuffer, onProgress);
  } catch (error) {
    console.error("Error in readPDFFile:", error);
    throw new Error(
      `Failed to read PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Process PDF data from an ArrayBuffer
 */
async function readPDFBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Make sure we're in browser context
    if (typeof window === "undefined") {
      throw new Error("PDF processing is only available in browser context");
    }

    // Initialize PDF.js if not already done
    if (!pdfjsLib) {
      pdfjsLib = await import("pdfjs-dist/webpack.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    // Load the PDF document using PDF.js
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const { numPages } = pdf;
    let text = "";

    // Extract metadata if available
    const metadata = await pdf.getMetadata().catch(() => null);
    if (metadata?.info) {
      text += "--- PDF METADATA ---\n";
      const info = metadata.info as Record<string, any>;
      Object.entries(info).forEach(([key, value]) => {
        if (key !== "metadata" && value && typeof value !== "function") {
          text += `${key}: ${value}\n`;
        }
      });
      text += "\n";
    }

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        // Update progress based on page processing
        onProgress(Math.round((i / numPages) * 90)); // Up to 90%, save 10% for final processing
      }

      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Get page dimensions and rotation
      const viewport = page.getViewport({ scale: 1.0 });

      // Check for annotations (like links, comments, etc)
      let annotations = "";
      try {
        const annots = await page.getAnnotations();
        if (annots && annots.length > 0) {
          annotations = `\n[${annots.length} annotation(s) found]\n`;
        }
      } catch (e) {
        // Ignore annotation errors
      }

      // Extract text with position information for better formatting
      const textItems = content.items as any[];
      const textWithLayout = extractTextWithLayout(textItems, viewport.height);

      text += `------- Page ${i} (${Math.round(viewport.width)}x${Math.round(
        viewport.height
      )})${annotations} -------\n${textWithLayout}\n\n`;
    }

    if (onProgress) {
      onProgress(100);
    }

    return text;
  } catch (error) {
    console.error("Error in readPDFBuffer:", error);
    throw new Error(
      `Failed to process PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Extract text with better layout preservation
 */
function extractTextWithLayout(textItems: any[], pageHeight: number): string {
  if (!textItems || textItems.length === 0) {
    return "";
  }

  // Sort items by vertical position (top to bottom) first, then by horizontal position
  textItems.sort((a, b) => {
    const yDiff = Math.abs(a.transform[5] - b.transform[5]);
    // If they're roughly on the same line (within 5 units)
    if (yDiff < 5) {
      return a.transform[4] - b.transform[4]; // Sort by x position
    }
    // Otherwise sort by y position (reversed because PDF coordinates start from bottom)
    return b.transform[5] - a.transform[5];
  });

  let result = "";
  let lastY = -1;
  let lastX = -1;

  for (const item of textItems) {
    if (!("str" in item) || !item.str) {
      continue;
    }

    const x = item.transform[4];
    const y = item.transform[5];

    // Check if this is a new line
    if (lastY !== -1 && Math.abs(y - lastY) > 5) {
      result += "\n";
      lastX = -1; // Reset x position for new line, this is intentional
    }
    // Check if we need to add spaces between words on the same line
    else if (lastX !== -1 && x - lastX > item.width) {
      const spaceCount = Math.min(10, Math.floor((x - lastX) / item.width));
      result += " ".repeat(spaceCount > 0 ? spaceCount : 1);
    }

    result += item.str;
    lastY = y;
    lastX = x + (item.width || 0);
  }

  return result;
}

/**
 * Extract additional information from PDFs like structure, tables, and images
 */
export async function extractPDFInfo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  text: string;
  pageCount: number;
  hasImages: boolean;
  tables?: any[];
  structure?: any;
}> {
  try {
    if (onProgress) {
      onProgress(10);
    }

    // Make sure we're in browser context
    if (typeof window === "undefined") {
      throw new Error("PDF processing is only available in browser context");
    }

    // Initialize PDF.js if not already done
    if (!pdfjsLib) {
      pdfjsLib = await import("pdfjs-dist/webpack.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    if (onProgress) {
      onProgress(30);
    }

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const { numPages } = pdf;
    let text = "";
    let hasImages = false;

    // Process each page
    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        onProgress(30 + Math.round((i / numPages) * 60));
      }

      const page = await pdf.getPage(i);

      // Text content
      const content = await page.getTextContent();
      const pageText = extractTextWithLayout(
        content.items as any[],
        page.getViewport({ scale: 1.0 }).height
      );
      text += `------- Page ${i} -------\n${pageText}\n\n`;

      // Check for images using the operatorList
      try {
        const opList = await page.getOperatorList();
        const OPS = pdfjsLib.OPS;

        if (
          OPS &&
          opList.fnArray.some(
            (op) =>
              op === OPS.paintImageXObject ||
              op === OPS.paintImageMaskXObject ||
              op === OPS.paintXObject ||
              op === OPS.paintImageXObjectRepeat
          )
        ) {
          hasImages = true;
        }
      } catch (e) {
        // Ignore errors in image detection
        console.warn("Error detecting images in PDF:", e);
      }
    }

    if (onProgress) {
      onProgress(100);
    }

    return {
      text,
      pageCount: numPages,
      hasImages,
    };
  } catch (error) {
    console.error("Error extracting PDF info:", error);
    throw new Error(
      `Failed to extract PDF info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get a preview of PDF contents (first page or table of contents)
 */
export async function getPDFPreview(
  file: File,
  maxLength: number = 300
): Promise<string> {
  try {
    console.log("Generating PDF preview for:", file.name);

    // Make sure we're in browser context
    if (typeof window === "undefined") {
      return `[PDF Preview] ${file.name} - Preview not available (server-side)`;
    }

    // Initialize PDF.js if not already done
    if (!pdfjsLib) {
      console.log("PDF.js not initialized, initializing now...");
      try {
        pdfjsLib = await import("pdfjs-dist/webpack.mjs");

        // Set worker source with a more reliable approach
        const pdfJsVersion = pdfjsLib.version || "4.10.38";
        const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsVersion}/pdf.worker.min.js`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        console.log("PDF.js initialized for preview with worker:", workerUrl);
      } catch (error) {
        console.error("Failed to initialize PDF.js for preview:", error);
        return `[PDF Preview] ${file.name} - Error initializing PDF.js`;
      }
    }

    console.log("Reading PDF file as ArrayBuffer...");
    const arrayBuffer = await readFileAsArrayBuffer(file);

    console.log("Loading PDF document...");
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    console.log("PDF document loaded successfully with", pdf.numPages, "pages");

    let preview = `[PDF] ${file.name} - ${pdf.numPages} page(s)\n`;

    // Try to get outline (table of contents) if available
    let outline = null;
    try {
      outline = await pdf.getOutline();
      console.log("PDF outline obtained:", outline);
    } catch (e) {
      console.warn("No outline available for PDF:", e);
    }

    // Add outline if available
    if (outline && outline.length > 0) {
      preview += "\nTable of Contents:\n";
      for (let i = 0; i < Math.min(outline.length, 5); i++) {
        preview += `- ${outline[i].title}\n`;
      }
      if (outline.length > 5) {
        preview += `... and ${outline.length - 5} more items\n`;
      }
      preview += "\n";
    }

    // Get first page content as preview
    console.log("Getting first page of PDF...");
    const page = await pdf.getPage(1);

    console.log("Getting text content from first page...");
    const content = await page.getTextContent();

    const textItems = content.items as any[];
    let firstPageText = "";

    console.log(
      "Processing text items from first page:",
      textItems.length,
      "items"
    );
    for (const item of textItems) {
      if ("str" in item && firstPageText.length < maxLength) {
        firstPageText += item.str + " ";
      }
    }

    if (firstPageText.length > maxLength) {
      firstPageText = firstPageText.substring(0, maxLength - 3) + "...";
    }

    preview += firstPageText;
    console.log("PDF preview generated successfully");

    return preview;
  } catch (error) {
    console.error("Error generating PDF preview:", error);
    return `[PDF Preview] ${file.name} - Preview not available (${
      error instanceof Error ? error.message : "unknown error"
    })`;
  }
}

/**
 * Read Word documents using mammoth.js
 */
export async function readWordDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);

    const arrayBuffer = await readFileAsArrayBuffer(file);

    if (onProgress) onProgress(50);

    // Check if mammoth is available (it's imported dynamically in browser environments)
    if (typeof mammoth === "undefined") {
      throw new Error("mammoth.js is not available for parsing Word documents");
    }

    // Extract text from the document
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (onProgress) onProgress(90);

    // The result contains the extracted text and any warnings
    const text = result.value;

    if (result.messages && result.messages.length > 0) {
      console.warn(
        "Warnings during Word document processing:",
        result.messages
      );
    }

    if (onProgress) onProgress(100);

    return text;
  } catch (error) {
    console.error("Error in readWordDocument:", error);

    // Fallback to text representation if mammoth fails
    try {
      const text = await readFileAsText(file);
      return text;
    } catch (innerError) {
      throw new Error(
        `Failed to read Word document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Read Excel files using SheetJS xlsx library
 */
export async function readExcelFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string | object> {
  try {
    if (onProgress) onProgress(20);

    const arrayBuffer = await readFileAsArrayBuffer(file);

    if (onProgress) onProgress(50);

    // Check if XLSX is available
    if (typeof XLSX === "undefined") {
      throw new Error("xlsx library is not available for parsing Excel files");
    }

    // Parse the Excel data
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    if (onProgress) onProgress(80);

    // Process all sheets and convert to a text representation
    let result = "";
    workbook.SheetNames.forEach((sheetName) => {
      // Get the worksheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON to make it easier to work with
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      result += `\n--- Sheet: ${sheetName} ---\n\n`;

      // Format as a text table
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        const formattedData = jsonData
          .map((row) => {
            if (Array.isArray(row)) {
              return row.join("\t");
            }
            return "";
          })
          .join("\n");

        result += formattedData + "\n";
      } else {
        result += "Empty sheet\n";
      }
    });

    if (onProgress) onProgress(100);

    return result;
  } catch (error) {
    console.error("Error in readExcelFile:", error);

    // Fallback to CSV processing if it's a CSV file or if xlsx processing fails
    if (file.name.toLowerCase().endsWith(".csv")) {
      return readCSVFile(file, onProgress);
    }

    throw new Error(
      `Failed to read Excel file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Read CSV files using PapaParse
 */
export async function readCSVFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string | object> {
  try {
    if (onProgress) onProgress(30);

    const text = await readFileAsText(file);

    if (onProgress) onProgress(60);

    const result = await processCSV(text);

    if (onProgress) onProgress(100);

    return result;
  } catch (error) {
    console.error("Error in readCSVFile:", error);
    throw new Error(
      `Failed to read CSV file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function processCSV(text: string): Promise<string | object> {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        // If the CSV is small, return a formatted text representation
        if (results.data.length < 100) {
          let formattedText = "";

          // Add headers
          if (results.meta.fields && results.meta.fields.length > 0) {
            formattedText += results.meta.fields.join("\t") + "\n";
            formattedText += "-".repeat(80) + "\n";
          }

          // Add data rows
          results.data.forEach((row: any) => {
            if (results.meta.fields) {
              const values = results.meta.fields.map((field) =>
                row[field] !== undefined ? row[field] : ""
              );
              formattedText += values.join("\t") + "\n";
            }
          });

          resolve(formattedText);
        } else {
          resolve(results.data);
        }
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

// Helper function to detect the actual file type regardless of extension
export async function detectFileType(file: File): Promise<string> {
  // Read the first few bytes to determine file type
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check file signatures (magic numbers)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  } else if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    // This could be DOCX, XLSX, PPTX, or any other Office Open XML format
    // Further inspection would be needed for exact format
    return "office-openxml";
  } else if (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  ) {
    // This is an OLE Compound Document (could be DOC, XLS, PPT)
    return "office-compound";
  }

  // If no magic number is detected, rely on the file extension
  return file.name.split(".").pop()?.toLowerCase() ?? "unknown";
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
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / 1048576).toFixed(1) + " MB";
  }
}

// Check if a file type is supported for parsing
export function isSupportedFileType(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const supportedExtensions = [
    "txt",
    "md",
    "json",
    "csv",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "pdf",
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "css",
    "xml",
  ];

  return supportedExtensions.includes(extension ?? "");
}

// Get a preview of the file content (first few lines)
export async function getFilePreview(
  file: File,
  maxLength: number = 200
): Promise<string> {
  try {
    const extension = file.name.split(".").pop()?.toLowerCase();

    // For PDF files, use our specialized PDF preview
    if (["pdf"].includes(extension ?? "")) {
      return getPDFPreview(file, maxLength);
    }
    // For other binary files, generate a simple description
    else if (["doc", "docx", "xls", "xlsx"].includes(extension ?? "")) {
      return `[${extension?.toUpperCase()} File] - ${
        file.name
      } (${formatFileSize(file.size)})`;
    }

    const text = await readFileAsText(file);
    if (text.length <= maxLength) {
      return text;
    }

    // Find a good breaking point (end of a line) near maxLength
    const breakPoint = text.indexOf("\n", maxLength - 50);
    if (breakPoint !== -1 && breakPoint < maxLength + 50) {
      return text.substring(0, breakPoint) + "...";
    }

    return text.substring(0, maxLength) + "...";
  } catch (error) {
    return `Preview not available for ${file.name}`;
  }
}
