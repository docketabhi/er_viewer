'use client';

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  exportSvg,
  exportPng,
  sanitizeFilename,
  type ExportSvgOptions,
  type ExportPngOptions,
} from '@/lib/export';

/**
 * Export format options.
 */
export type ExportFormat = 'svg' | 'png' | 'pdf';

/**
 * Props for the ExportModal component.
 */
export interface ExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** SVG element to export */
  svgElement: SVGSVGElement | null;
  /** Default filename for export */
  defaultFilename?: string;
  /** Initial format to select */
  initialFormat?: ExportFormat;
  /** Callback when export starts */
  onExportStart?: () => void;
  /** Callback when export completes successfully */
  onExportSuccess?: (format: ExportFormat, filename: string) => void;
  /** Callback when export fails */
  onExportError?: (error: string) => void;
  /** Whether dark mode is active */
  isDarkMode?: boolean;
}

/**
 * Format information for display.
 */
const formatInfo: Record<ExportFormat, { label: string; description: string; icon: string }> = {
  svg: {
    label: 'SVG',
    description: 'Vector format, scalable, editable in design tools',
    icon: 'svg',
  },
  png: {
    label: 'PNG',
    description: 'Raster image, best for sharing and presentations',
    icon: 'png',
  },
  pdf: {
    label: 'PDF',
    description: 'Document format, ideal for printing',
    icon: 'pdf',
  },
};

/**
 * Close icon component.
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

/**
 * Download icon component.
 */
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

/**
 * Spinner icon component.
 */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Checkmark icon component.
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * ExportModal component for configuring and triggering diagram exports.
 *
 * Features:
 * - Format selection (SVG, PNG, PDF)
 * - Filename customization
 * - Background color options
 * - Padding configuration
 * - Progress indication
 * - Keyboard accessible (Escape to close)
 *
 * @example
 * ```tsx
 * <ExportModal
 *   isOpen={showExportModal}
 *   onClose={() => setShowExportModal(false)}
 *   svgElement={svgRef.current}
 *   defaultFilename="my-diagram"
 *   onExportSuccess={(format, filename) => {
 *     console.log(`Exported ${filename} as ${format}`);
 *   }}
 * />
 * ```
 */
export const ExportModal = memo(function ExportModal({
  isOpen,
  onClose,
  svgElement,
  defaultFilename = 'diagram',
  initialFormat = 'svg',
  onExportStart,
  onExportSuccess,
  onExportError,
  isDarkMode = false,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initialFormat);
  const [filename, setFilename] = useState(defaultFilename);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const modalRef = useRef<HTMLDivElement>(null);
  const filenameInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename);
      setSelectedFormat(initialFormat);
      setExportStatus('idle');
      setIsExporting(false);
      // Focus the filename input when modal opens
      setTimeout(() => filenameInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultFilename, initialFormat]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExporting, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isExporting
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isExporting, onClose]);

  /**
   * Handle export action.
   */
  const handleExport = useCallback(async () => {
    if (!svgElement || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');
    onExportStart?.();

    try {
      const baseOptions: ExportSvgOptions = {
        filename: sanitizeFilename(filename),
        includeBackground,
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        padding: 20,
        includeStyles: true,
      };

      if (selectedFormat === 'svg') {
        const result = exportSvg(svgElement, baseOptions);

        if (result.success && result.filename) {
          setExportStatus('success');
          onExportSuccess?.(selectedFormat, result.filename);
          // Close modal after short delay to show success state
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setExportStatus('error');
          onExportError?.(result.error || 'Export failed');
        }
      } else if (selectedFormat === 'png') {
        const pngOptions: ExportPngOptions = {
          ...baseOptions,
          scale: 2, // High-DPI for better quality
          quality: 1,
        };

        const result = await exportPng(svgElement, pngOptions);

        if (result.success && result.filename) {
          setExportStatus('success');
          onExportSuccess?.(selectedFormat, result.filename);
          // Close modal after short delay to show success state
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setExportStatus('error');
          onExportError?.(result.error || 'PNG export failed');
        }
      } else {
        // PDF not yet implemented
        setExportStatus('error');
        onExportError?.(`${selectedFormat.toUpperCase()} export is not yet implemented`);
      }
    } catch (error) {
      setExportStatus('error');
      onExportError?.(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [
    svgElement,
    isExporting,
    selectedFormat,
    filename,
    includeBackground,
    isDarkMode,
    onExportStart,
    onExportSuccess,
    onExportError,
    onClose,
  ]);

  /**
   * Handle keyboard submit.
   */
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleExport();
      }
    },
    [handleExport]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="
        export-modal__backdrop
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        ref={modalRef}
        className="
          export-modal
          w-full max-w-md
          mx-4
          bg-background
          rounded-lg shadow-xl
          border border-border
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2
            id="export-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            Export Diagram
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="
              p-1 rounded
              text-muted-foreground hover:text-foreground
              hover:bg-muted
              focus:outline-none focus:ring-2 focus:ring-primary
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4" onKeyDown={handleKeyDown}>
          {/* Filename input */}
          <div>
            <label
              htmlFor="export-filename"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Filename
            </label>
            <input
              ref={filenameInputRef}
              id="export-filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={isExporting}
              className="
                w-full px-3 py-2
                bg-background
                border border-border rounded-md
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
              placeholder="Enter filename"
            />
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(formatInfo) as ExportFormat[]).map((format) => {
                const info = formatInfo[format];
                const isSelected = selectedFormat === format;
                const isDisabled = format === 'pdf'; // SVG and PNG are implemented, PDF coming soon

                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => !isDisabled && setSelectedFormat(format)}
                    disabled={isExporting || isDisabled}
                    className={`
                      p-3 rounded-md border text-center
                      transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:border-muted-foreground'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-primary
                    `}
                    title={isDisabled ? `${info.label} export coming soon` : info.description}
                  >
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isDisabled ? 'Coming soon' : info.description.split(',')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                disabled={isExporting}
                className="
                  w-4 h-4
                  rounded
                  border-border
                  text-primary
                  focus:ring-primary focus:ring-offset-0
                "
              />
              <span className="text-sm text-foreground">
                Include background
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="
              px-4 py-2
              text-sm font-medium
              text-muted-foreground
              hover:text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary rounded
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !svgElement || !filename.trim()}
            className={`
              inline-flex items-center gap-2
              px-4 py-2
              text-sm font-medium
              rounded-md
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              transition-all
              ${exportStatus === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : exportStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isExporting ? (
              <>
                <SpinnerIcon className="w-4 h-4" />
                <span>Exporting...</span>
              </>
            ) : exportStatus === 'success' ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                <span>Download {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ExportModal;
