'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Loader, FileText, Shield, Brain } from 'lucide-react';
import FileUploadDropzone from '@/components/FileUploadDropzone';
import { userFeedsAPI } from '@/api/client';

interface UploadResult {
  status: 'success' | 'error' | 'duplicate';
  filename: string;
  message: string;
  articleTitle?: string;
  articleId?: number;
  executiveSummary?: string;
  iocCount?: number;
  ttpCount?: number;
  extractionMethod?: string;
}

export default function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  const handleFilesSelected = async (files: File[]) => {
    setUploading(true);
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        const response = await userFeedsAPI.uploadDocument(file, {
          title: file.name,
        }) as any;

        const data = response.data || response;
        results.push({
          status: data.status === 'duplicate' ? 'duplicate' : 'success',
          filename: file.name,
          message: data.message || 'Document ingested successfully',
          articleTitle: data.article_title,
          articleId: data.article_id,
          executiveSummary: data.executive_summary,
          iocCount: data.ioc_count || 0,
          ttpCount: data.ttp_count || 0,
          extractionMethod: data.extraction_method,
        });
      } catch (err: any) {
        const detail = err.response?.data?.detail || err.message || 'Failed to process document';
        results.push({
          status: 'error',
          filename: file.name,
          message: detail,
        });
      }
    }

    setUploadResults(prev => [...results, ...prev]);
    setUploading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Documents</h1>
        <p className="text-muted-foreground mt-1">
          Import threat intelligence from PDFs, Word files, Excel sheets, and more.
          GenAI will automatically extract IOCs, TTPs, and generate summaries.
        </p>
      </div>

      <div className="space-y-6">
        <FileUploadDropzone
          onFilesSelected={handleFilesSelected}
          accept=".pdf,.docx,.doc,.xlsx,.csv,.html,.htm,.txt"
          maxSize={50 * 1024 * 1024}
          maxFiles={5}
          disabled={uploading}
        />

        {uploading && (
          <div className="p-4 bg-blue-500/10 text-blue-700 rounded-md flex items-start gap-3">
            <Loader className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-semibold">Processing documents...</p>
              <p className="text-sm">Extracting text, running IOC/TTP analysis, and generating GenAI summaries</p>
            </div>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Upload Results</h2>
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border',
                    result.status === 'success'
                      ? 'bg-green-500/5 border-green-500/30'
                      : result.status === 'duplicate'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-red-500/5 border-red-500/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : result.status === 'duplicate' ? (
                      <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground break-all">
                        {result.articleTitle || result.filename}
                      </p>
                      <p className={`text-sm ${
                        result.status === 'success' ? 'text-green-600'
                          : result.status === 'duplicate' ? 'text-amber-600'
                            : 'text-red-600'
                      }`}>
                        {result.message}
                      </p>

                      {(result.status === 'success' || result.status === 'duplicate') && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {(result.iocCount ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {result.iocCount} IOCs
                            </span>
                          )}
                          {(result.ttpCount ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              {result.ttpCount} TTPs
                            </span>
                          )}
                          {result.extractionMethod && (
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                              {result.extractionMethod}
                            </span>
                          )}
                        </div>
                      )}

                      {result.executiveSummary && (
                        <p className="mt-2 text-sm text-muted-foreground italic">
                          {result.executiveSummary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-3">Supported File Formats</h3>
          <ul className="space-y-2 text-sm">
            <li>• <strong>PDF:</strong> Articles and research papers</li>
            <li>• <strong>Word:</strong> .docx and .doc files</li>
            <li>• <strong>Excel:</strong> .xlsx spreadsheets with content</li>
            <li>• <strong>HTML:</strong> Web pages and articles</li>
            <li>• <strong>CSV:</strong> Comma-separated article data</li>
            <li>• <strong>Text:</strong> Plain text documents</li>
          </ul>
        </div>

        <div className="p-4 bg-green-500/10 text-green-700 rounded-lg border border-green-200">
          <h3 className="font-semibold mb-3">What Happens After Upload</h3>
          <ol className="space-y-2 text-sm">
            <li>1. Text extracted from your document</li>
            <li>2. GenAI analyzes for IOCs, TTPs, and threats</li>
            <li>3. Executive & technical summaries generated</li>
            <li>4. Article appears in your Feeds page</li>
            <li>5. Watchlist keywords auto-matched</li>
          </ol>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 text-amber-700 rounded-lg border border-amber-200">
        <h3 className="font-semibold mb-2">File Size & Limits</h3>
        <p className="text-sm">
          Maximum file size: 50MB per file | Maximum 5 files at once
        </p>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
