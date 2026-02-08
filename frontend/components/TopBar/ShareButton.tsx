'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';

/**
 * Share mode options.
 */
export type ShareMode = 'view' | 'edit';

/**
 * Props for the ShareButton component.
 */
export interface ShareButtonProps {
  /** Current diagram ID for generating share link */
  diagramId?: string;
  /** Callback when share link is copied */
  onShareLinkCopied?: (link: string, mode: ShareMode) => void;
  /** Callback when share settings are opened */
  onShareSettingsOpen?: () => void;
  /** Whether the diagram is saved (required for sharing) */
  isSaved?: boolean;
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
 * Share icon component.
 */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.366A2.52 2.52 0 0113 4.5z" />
    </svg>
  );
}

/**
 * Copy icon component.
 */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
    </svg>
  );
}

/**
 * Check icon component (shown after successful copy).
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
 * ShareButton component for sharing diagram links.
 *
 * Features:
 * - Dropdown with view/edit sharing options
 * - Copy link to clipboard functionality
 * - Visual feedback on successful copy
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <ShareButton
 *   diagramId="abc123"
 *   onShareLinkCopied={(link, mode) => console.log('Copied:', link)}
 *   isSaved
 * />
 * ```
 */
export const ShareButton = memo(function ShareButton({
  diagramId,
  onShareLinkCopied,
  onShareSettingsOpen,
  isSaved = false,
  size = 'md',
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedMode, setCopiedMode] = useState<ShareMode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sizes = sizeConfig[size];

  /**
   * Toggle dropdown visibility.
   */
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  /**
   * Close dropdown.
   */
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setCopiedMode(null);
  }, []);

  /**
   * Generate share link based on mode.
   */
  const generateShareLink = useCallback(
    (mode: ShareMode): string => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const path = mode === 'edit' ? `/diagram/${diagramId}/edit` : `/diagram/${diagramId}`;
      return `${baseUrl}${path}`;
    },
    [diagramId]
  );

  /**
   * Copy share link to clipboard.
   */
  const handleCopyLink = useCallback(
    async (mode: ShareMode) => {
      if (!diagramId) return;

      const link = generateShareLink(mode);

      try {
        await navigator.clipboard.writeText(link);
        setCopiedMode(mode);
        onShareLinkCopied?.(link, mode);

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopiedMode(null);
        }, 2000);
      } catch {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedMode(mode);
        onShareLinkCopied?.(link, mode);

        setTimeout(() => {
          setCopiedMode(null);
        }, 2000);
      }
    },
    [diagramId, generateShareLink, onShareLinkCopied]
  );

  /**
   * Handle settings click.
   */
  const handleSettingsClick = useCallback(() => {
    closeDropdown();
    onShareSettingsOpen?.();
  }, [closeDropdown, onShareSettingsOpen]);

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

  const canShare = isSaved && diagramId;

  return (
    <div className="share-button relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={!canShare}
        className={`
          share-button__trigger
          inline-flex items-center gap-2
          ${sizes.button}
          rounded-md
          bg-primary text-primary-foreground
          hover:bg-primary/90
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
          transition-colors duration-150
          ${!canShare ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        aria-label="Share diagram"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ShareIcon className={sizes.icon} />
        <span>Share</span>
      </button>

      {isOpen && canShare && (
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          className={`
            share-button__dropdown
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
            {/* Copy view link */}
            <button
              type="button"
              onClick={() => handleCopyLink('view')}
              className="
                w-full
                flex items-center gap-2
                px-3 py-2
                rounded
                text-left
                text-foreground
                hover:bg-muted
                transition-colors
              "
              role="menuitem"
            >
              {copiedMode === 'view' ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
              <span className="flex-1">
                {copiedMode === 'view' ? 'Copied!' : 'Copy view link'}
              </span>
            </button>

            {/* Copy edit link */}
            <button
              type="button"
              onClick={() => handleCopyLink('edit')}
              className="
                w-full
                flex items-center gap-2
                px-3 py-2
                rounded
                text-left
                text-foreground
                hover:bg-muted
                transition-colors
              "
              role="menuitem"
            >
              {copiedMode === 'edit' ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
              <span className="flex-1">
                {copiedMode === 'edit' ? 'Copied!' : 'Copy edit link'}
              </span>
            </button>

            {/* Share settings */}
            {onShareSettingsOpen && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={handleSettingsClick}
                  className="
                    w-full
                    flex items-center gap-2
                    px-3 py-2
                    rounded
                    text-left
                    text-muted-foreground
                    hover:text-foreground hover:bg-muted
                    transition-colors
                  "
                  role="menuitem"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Share settings</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ShareButton;
