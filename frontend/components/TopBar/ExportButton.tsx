'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';

/**
 * Export format options.
 */
export type ExportFormat = 'svg' | 'png' | 'pdf';

/**
 * Props for the ExportButton component.
 */
export interface ExportButtonProps {
  /** Callback when export is requested */
  onExport?: (format: ExportFormat) => void;
  /** SVG element reference for export (optional - can use callback instead) */
  svgElement?: SVGSVGElement | null;
  /** Diagram title for filename */
  diagramTitle?: string;
  /** Whether export is currently in progress */
  isExporting?: boolean;
  /** Formats to show (defaults to all) */
  enabledFormats?: ExportFormat[];
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class */
  className?: string;
}

/**
 * Size configurations for the button.
 */
const sizeConfig = {
  sm: {
    button: 'h-8 px-2 text-xs',
    icon: 'w-4 h-4',
    dropdown: 'text-xs',
  },
  md: {
    button: 'h-9 px-3 text-sm',
    icon: 'w-4 h-4',
    dropdown: 'text-sm',
  },
  lg: {
    button: 'h-10 px-4 text-base',
    icon: 'w-5 h-5',
    dropdown: 'text-base',
  },
};

/**
 * Export format metadata.
 */
const formatInfo: Record<ExportFormat, { label: string; description: string }> = {
  svg: {
    label: 'SVG',
    description: 'Vector format, best for editing',
  },
  png: {
    label: 'PNG',
    description: 'Raster image, best for sharing',
  },
  pdf: {
    label: 'PDF',
    description: 'Document format, best for printing',
  },
};

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
 * Format icon component based on export format.
 */
function FormatIcon({
  format,
  className,
}: {
  format: ExportFormat;
  className?: string;
}) {
  if (format === 'svg') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M3.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h12.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75H3.75zM5 5.5h10v9H5v-9z" />
      </svg>
    );
  }

  if (format === 'png') {
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
          d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.47-4.469a.75.75 0 00-1.06 0L2.5 11.06zM6 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // PDF icon
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
    </svg>
  );
}

/**
 * Spinner icon component for loading state.
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
 * ExportButton component for exporting diagrams.
 *
 * Features:
 * - Dropdown with multiple export format options (SVG, PNG, PDF)
 * - Loading state during export
 * - Keyboard accessible
 * - Format descriptions for user guidance
 *
 * @example
 * ```tsx
 * <ExportButton
 *   onExport={(format) => handleExport(format)}
 *   diagramTitle="My Diagram"
 *   enabledFormats={['svg', 'png']}
 * />
 * ```
 */
export const ExportButton = memo(function ExportButton({
  onExport,
  svgElement,
  diagramTitle = 'diagram',
  isExporting = false,
  enabledFormats = ['svg', 'png', 'pdf'],
  size = 'md',
  className = '',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sizes = sizeConfig[size];

  /**
   * Toggle dropdown visibility.
   */
  const toggleDropdown = useCallback(() => {
    if (!isExporting) {
      setIsOpen((prev) => !prev);
    }
  }, [isExporting]);

  /**
   * Close dropdown.
   */
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle export selection.
   */
  const handleExport = useCallback(
    (format: ExportFormat) => {
      closeDropdown();
      onExport?.(format);
    },
    [closeDropdown, onExport]
  );

  /**
   * Handle click outside to close dropdown.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
        buttonRef.current?.focus();
      }
    },
    [closeDropdown]
  );

  return (
    <div className="export-button relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={isExporting}
        className={`
          export-button__trigger
          inline-flex items-center gap-2
          ${sizes.button}
          rounded-md
          text-muted-foreground
          hover:text-foreground hover:bg-muted
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
          transition-colors duration-150
          ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        aria-label="Export diagram"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {isExporting ? (
          <SpinnerIcon className={sizes.icon} />
        ) : (
          <DownloadIcon className={sizes.icon} />
        )}
        <span>Export</span>
      </button>

      {isOpen && !isExporting && (
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          className={`
            export-button__dropdown
            absolute right-0 mt-1 z-50
            w-56
            rounded-md shadow-lg
            bg-background
            border border-border
            ${sizes.dropdown}
          `}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="p-1">
            {enabledFormats.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => handleExport(format)}
                className="
                  w-full
                  flex items-center gap-3
                  px-3 py-2
                  rounded
                  text-left
                  text-foreground
                  hover:bg-muted
                  transition-colors
                "
                role="menuitem"
              >
                <FormatIcon format={format} className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{formatInfo[format].label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatInfo[format].description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ExportButton;
