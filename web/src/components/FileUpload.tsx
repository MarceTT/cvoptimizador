"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PAGES = 10;
const ACCEPTED_TYPES = ["application/pdf"];

export interface FileValidationError {
  code: "oversized" | "invalid_type" | "protected" | "corrupt" | "image_only" | "too_long";
  message: string;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: FileValidationError) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({ onFileSelect, onError, disabled, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = useCallback(
    async (file: File): Promise<boolean> => {
      // Check file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError({
          code: "invalid_type",
          message: "Solo se aceptan archivos PDF",
        });
        return false;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        onError({
          code: "oversized",
          message: "Archivo muy grande (máx 5MB)",
        });
        return false;
      }

      return true;
    },
    [onError]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const isValid = await validateFile(file);
      if (isValid) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-secondary/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            disabled={disabled}
            className="sr-only"
          />
          
          <svg
            className="mb-4 h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          <p className="text-base font-medium">
            {isDragging ? "Soltá el archivo aquí" : "Arrastrá tu CV o hacé clic para seleccionar"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            PDF, máximo 5MB, hasta 10 páginas
          </p>
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className={cn(
              "rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
