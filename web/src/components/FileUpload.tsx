"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["application/pdf"];

export interface FileValidationError {
  code: "file_too_large" | "invalid_type" | "generic";
  message: string;
}

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: FileValidationError) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onError,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = useCallback(
    (file: File): FileValidationError | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return {
          code: "invalid_type",
          message: "Solo se aceptan archivos PDF",
        };
      }

      if (file.size > MAX_FILE_SIZE) {
        return {
          code: "file_too_large",
          message: "Archivo muy grande (máx 5MB)",
        };
      }

      return null;
    },
    []
  );

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        onError(error);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onError, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile) {
    return (
      <div
        className={cn(
          "flex items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4",
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemoveFile}
          disabled={disabled}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Eliminar archivo</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        disabled={disabled}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Subir archivo PDF"
      />

      <div className="flex flex-col items-center justify-center px-6 py-10">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
            isDragging ? "bg-primary/20" : "bg-muted"
          )}
        >
          <Upload
            className={cn(
              "h-6 w-6 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        <p className="mt-4 text-center">
          <span className="font-medium text-primary">Hacé clic para subir</span>
          <span className="text-muted-foreground"> o arrastrá tu archivo</span>
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          PDF (máx. 5MB)
        </p>
      </div>
    </div>
  );
}
