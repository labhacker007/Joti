'use client';

import React, { useRef, useState } from 'react';
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export default function FileUploadDropzone({
  onFilesSelected,
  accept = '.pdf,.docx,.doc,.xlsx,.csv,.html',
  maxSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 5,
  disabled = false,
}: FileUploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = accept.split(',').map(t => t.trim());

  const validateFiles = (files: File[]): boolean => {
    setError('');

    if (files.length === 0) {
      return false;
    }

    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed at once`);
      return false;
    }

    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        setError(`File "${file.name}" exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
        return false;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();

      const isValidType = acceptedTypes.some(type => {
        const normalizedType = type.toLowerCase();
        return (
          normalizedType === fileExtension ||
          normalizedType === mimeType ||
          file.type.includes(normalizedType.replace('.', ''))
        );
      });

      if (!isValidType) {
        setError(`File type "${fileExtension}" not supported. Allowed: ${accept}`);
        return false;
      }
    }

    return true;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (validateFiles(fileArray)) {
      const fileInfos = fileArray.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      setSelectedFiles(prev => [...prev, ...fileInfos].slice(0, maxFiles));
      onFilesSelected(fileArray);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(false);
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Drag and drop files here
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse your computer
        </p>
        <p className="text-xs text-muted-foreground">
          Supported formats: {accept} | Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 text-red-700 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-card space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-foreground">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </h4>
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-background rounded border border-border/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
