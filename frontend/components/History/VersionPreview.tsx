'use client';

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useId,
  useRef,
} from 'react';
import { type DiagramVersion, formatDateTime } from './VersionItem';

/**
 * Props for the VersionPreview component.
 */
export interface VersionPreviewProps {
  /** The version to preview */
  version: DiagramVersion | null;
  /** The current source content for comparison */
  currentSource?: string;
  /** Whether the preview is open */
  isOpen: boolean;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Callback when restore is confirmed */
  onRestore: (version: DiagramVersion) => void;
  /** Whether restore is currently in progress */
  isRestoring?: boolean;
  /** Whether to show the diff view */
  showDiff?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Format line count for display.
 */
function formatLineCount(source: string | undefined): number {
  if (!source) return 0;
  return source.split('\n').length;
}

/**
 * Calculate simple diff statistics between two sources.
 */
function calculateDiffStats(
  currentSource: string | undefined,
  versionSource: string | undefined
): { added: number; removed: number; changed: boolean } {
  if (!currentSource || !versionSource) {
    return { added: 0, removed: 0, changed: false };
  }

  const currentLines = currentSource.split('\n');
  const versionLines = versionSource.split('\n');

  const currentSet = new Set(currentLines);
  const versionSet = new Set(versionLines);

  let added = 0;
  let removed = 0;

  // Lines in current but not in version (will be added back)
  currentLines.forEach((line) => {
    if (!versionSet.has(line)) {
      removed++;
    }
  });

  // Lines in version but not in current (will be restored)
  versionLines.forEach((line) => {
    if (!currentSet.has(line)) {
      added++;
    }
  });

  return {
    added,
    removed,
    changed: currentSource !== versionSource,
  };
}

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
 * Restore icon component.
 */
function RestoreIcon({ className }: { className?: string }) {
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
        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Warning icon component.
 */
function WarningIcon({ className }: { className?: string }) {
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
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Simple diff line component for showing differences.
 */
const DiffLine = memo(function DiffLine({
  line,
  type,
  lineNumber,
}: {
  line: string;
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
}) {
  const bgClass =
    type === 'added'
      ? 'bg-green-500/10'
      : type === 'removed'
        ? 'bg-red-500/10'
        : '';
  const textClass =
    type === 'added'
      ? 'text-green-600 dark:text-green-400'
      : type === 'removed'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground/70';
  const prefix = type === 'added' ? '+' : type === 'removed' ? '-' : ' ';

  return (
    <div className={`flex ${bgClass}`}>
      <span className="w-8 flex-shrink-0 text-xs text-muted-foreground text-right pr-2 select-none">
        {lineNumber}
      </span>
      <span className="w-4 flex-shrink-0 text-xs font-mono text-center select-none">
        {prefix}
      </span>
      <span className={`flex-1 text-xs font-mono whitespace-pre ${textClass}`}>
        {line || ' '}
      </span>
    </div>
  );
});

/**
 * Source preview component showing the version's content.
 */
const SourcePreview = memo(function SourcePreview({
  source,
  label,
  showLineNumbers = true,
}: {
  source: string | undefined;
  label: string;
  showLineNumbers?: boolean;
}) {
  const lines = useMemo(() => (source || '').split('\n'), [source]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 overflow-auto p-2 bg-background">
        <pre className="text-xs font-mono">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              {showLineNumbers && (
                <span className="w-8 flex-shrink-0 text-muted-foreground text-right pr-2 select-none">
                  {index + 1}
                </span>
              )}
              <span className="flex-1 whitespace-pre text-foreground/80">
                {line || ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
});

/**
 * Simple diff view component comparing two sources.
 */
const SimpleDiffView = memo(function SimpleDiffView({
  currentSource,
  versionSource,
}: {
  currentSource: string | undefined;
  versionSource: string | undefined;
}) {
  // Simple line-by-line diff
  const diffLines = useMemo(() => {
    const current = (currentSource || '').split('\n');
    const version = (versionSource || '').split('\n');
    const maxLines = Math.max(current.length, version.length);
    const lines: Array<{ line: string; type: 'added' | 'removed' | 'unchanged'; lineNumber: number }> = [];

    for (let i = 0; i < maxLines; i++) {
      const currentLine = current[i];
      const versionLine = version[i];

      if (currentLine === versionLine) {
        lines.push({ line: versionLine || '', type: 'unchanged', lineNumber: i + 1 });
      } else {
        if (currentLine !== undefined && versionLine === undefined) {
          // Line exists in current but not in version - will be removed
          lines.push({ line: currentLine, type: 'removed', lineNumber: i + 1 });
        } else if (currentLine === undefined && versionLine !== undefined) {
          // Line exists in version but not in current - will be added
          lines.push({ line: versionLine, type: 'added', lineNumber: i + 1 });
        } else {
          // Line changed
          lines.push({ line: currentLine!, type: 'removed', lineNumber: i + 1 });
          lines.push({ line: versionLine!, type: 'added', lineNumber: i + 1 });
        }
      }
    }

    return lines;
  }, [currentSource, versionSource]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">
          Changes (restoring will apply these changes)
        </span>
      </div>
      <div className="flex-1 overflow-auto p-2 bg-background">
        <div className="text-xs font-mono">
          {diffLines.map((item, index) => (
            <DiffLine
              key={`${index}-${item.type}-${item.lineNumber}`}
              line={item.line}
              type={item.type}
              lineNumber={item.lineNumber}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Mermaid preview component for rendering the version diagram.
 * Uses dynamic import to avoid SSR issues.
 */
const MermaidPreviewPanel = memo(function MermaidPreviewPanel({
  source,
}: {
  source: string | undefined;
}) {
  const containerId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!source?.trim()) {
      setSvg(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        const renderId = `version-preview-${containerId.replace(/:/g, '-')}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(renderId, source);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setSvg(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [source, containerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Rendering preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <WarningIcon className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="text-xs text-muted-foreground">
            Preview unavailable: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-muted-foreground">No diagram to preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full p-4 overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

/**
 * Tab button component for switching views.
 */
const TabButton = memo(function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-1.5
        text-xs font-medium
        rounded
        transition-colors
        ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }
      `}
    >
      {label}
    </button>
  );
});

/**
 * VersionPreview component displays a preview of a version before restoring.
 *
 * Features:
 * - Source code preview with line numbers
 * - Simple diff view showing changes
 * - Mermaid diagram preview
 * - Restore confirmation with warning
 * - Loading state during restore
 * - Keyboard navigation (Escape to close)
 *
 * @example
 * ```tsx
 * <VersionPreview
 *   version={selectedVersion}
 *   currentSource={currentSource}
 *   isOpen={isPreviewOpen}
 *   onClose={() => setIsPreviewOpen(false)}
 *   onRestore={(version) => handleRestore(version)}
 * />
 * ```
 */
export const VersionPreview = memo(function VersionPreview({
  version,
  currentSource,
  isOpen,
  onClose,
  onRestore,
  isRestoring = false,
  showDiff = true,
  className = '',
}: VersionPreviewProps) {
  const [activeTab, setActiveTab] = useState<'source' | 'diff' | 'preview'>('source');
  const [confirmRestore, setConfirmRestore] = useState(false);

  // Calculate diff stats
  const diffStats = useMemo(
    () => calculateDiffStats(currentSource, version?.mermaidSource),
    [currentSource, version?.mermaidSource]
  );

  // Format version info
  const versionInfo = useMemo(() => {
    if (!version) return null;
    const { date, time } = formatDateTime(version.createdAt);
    return {
      label: version.label || `Version from ${date}`,
      date,
      time,
      createdBy: version.createdBy,
      lineCount: formatLineCount(version.mermaidSource),
    };
  }, [version]);

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmRestore) {
          setConfirmRestore(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, confirmRestore]
  );

  // Set up keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setConfirmRestore(false);
      setActiveTab('source');
    }
  }, [isOpen]);

  /**
   * Handle restore button click.
   */
  const handleRestoreClick = useCallback(() => {
    if (!diffStats.changed) {
      // No changes, just close
      onClose();
      return;
    }
    setConfirmRestore(true);
  }, [diffStats.changed, onClose]);

  /**
   * Handle restore confirmation.
   */
  const handleConfirmRestore = useCallback(() => {
    if (version) {
      onRestore(version);
    }
  }, [version, onRestore]);

  /**
   * Handle cancel confirmation.
   */
  const handleCancelConfirm = useCallback(() => {
    setConfirmRestore(false);
  }, []);

  // Don't render if not open or no version
  if (!isOpen || !version) {
    return null;
  }

  return (
    <div
      className={`
        version-preview
        fixed inset-0
        z-50
        flex items-center justify-center
        bg-background/80 backdrop-blur-sm
        ${className}
      `}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-preview-title"
    >
      <div
        className="
          bg-background
          border border-border
          rounded-lg
          shadow-xl
          w-[90vw] max-w-4xl
          h-[80vh]
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <RestoreIcon className="w-5 h-5 text-primary" />
            <div>
              <h2 id="version-preview-title" className="text-sm font-semibold">
                {versionInfo?.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {versionInfo?.time} {versionInfo?.date}
                {versionInfo?.createdBy && <> by {versionInfo.createdBy}</>}
                {' · '}
                {versionInfo?.lineCount} lines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Diff stats badge */}
            {diffStats.changed && (
              <div className="flex items-center gap-2 text-xs">
                {diffStats.added > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    +{diffStats.added}
                  </span>
                )}
                {diffStats.removed > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    -{diffStats.removed}
                  </span>
                )}
              </div>
            )}
            {!diffStats.changed && (
              <span className="text-xs text-muted-foreground">No changes</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="
                p-1.5
                text-muted-foreground
                hover:text-foreground
                hover:bg-muted
                rounded
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
              "
              aria-label="Close preview"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
          <TabButton
            label="Source"
            isActive={activeTab === 'source'}
            onClick={() => setActiveTab('source')}
          />
          {showDiff && diffStats.changed && (
            <TabButton
              label="Diff"
              isActive={activeTab === 'diff'}
              onClick={() => setActiveTab('diff')}
            />
          )}
          <TabButton
            label="Preview"
            isActive={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'source' && (
            <SourcePreview
              source={version.mermaidSource}
              label="Version Content"
            />
          )}
          {activeTab === 'diff' && (
            <SimpleDiffView
              currentSource={currentSource}
              versionSource={version.mermaidSource}
            />
          )}
          {activeTab === 'preview' && (
            <MermaidPreviewPanel source={version.mermaidSource} />
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          {!confirmRestore ? (
            <>
              <p className="text-xs text-muted-foreground">
                {diffStats.changed
                  ? 'Restoring will replace the current content with this version.'
                  : 'This version is identical to the current content.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    px-3 py-1.5
                    text-sm font-medium
                    text-muted-foreground
                    hover:text-foreground
                    hover:bg-muted
                    rounded
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary/50
                  "
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreClick}
                  disabled={isRestoring || !diffStats.changed}
                  className={`
                    flex items-center gap-1.5
                    px-3 py-1.5
                    text-sm font-medium
                    bg-primary
                    text-primary-foreground
                    rounded
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary/50
                    ${
                      isRestoring || !diffStats.changed
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-primary/90'
                    }
                  `}
                >
                  {isRestoring ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <RestoreIcon className="w-4 h-4" />
                      Restore Version
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <WarningIcon className="w-4 h-4" />
                <p className="text-xs font-medium">
                  Are you sure? Current unsaved changes will be lost.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  className="
                    px-3 py-1.5
                    text-sm font-medium
                    text-muted-foreground
                    hover:text-foreground
                    hover:bg-muted
                    rounded
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary/50
                  "
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className={`
                    flex items-center gap-1.5
                    px-3 py-1.5
                    text-sm font-medium
                    bg-amber-600
                    text-white
                    rounded
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-amber-500/50
                    ${isRestoring ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-700'}
                  `}
                >
                  {isRestoring ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    'Confirm Restore'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default VersionPreview;
