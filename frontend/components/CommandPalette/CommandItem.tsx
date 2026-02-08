'use client';

import { memo, forwardRef, useCallback } from 'react';
import { formatShortcut, type KeyboardShortcut } from '@/hooks/useKeyboardShortcut';

/**
 * Represents a command that can be executed from the palette.
 */
export interface Command {
  /** Unique identifier for the command */
  id: string;
  /** Display label for the command */
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** Category for grouping commands */
  category?: string;
  /** Icon to display (React element or string for emoji) */
  icon?: React.ReactNode;
  /** Keyboard shortcut configuration */
  shortcut?: KeyboardShortcut;
  /** Action to execute when the command is selected */
  action: () => void;
  /** Whether the command is disabled */
  disabled?: boolean;
  /** Optional keywords for search matching */
  keywords?: string[];
}

/**
 * Props for the CommandItem component.
 */
export interface CommandItemProps {
  /** The command to display */
  command: Command;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Callback when the command is clicked */
  onSelect?: (command: Command) => void;
  /** Callback when the item is hovered */
  onHover?: (command: Command) => void;
  /** Search query to highlight in the label */
  searchQuery?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Highlights matching text in a string based on a search query.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length === 0) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

/**
 * CommandItem component displays a single command in the palette.
 *
 * Features:
 * - Visual indicator for selected state
 * - Keyboard shortcut display
 * - Search query highlighting
 * - Icon support
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <CommandItem
 *   command={{
 *     id: 'new-diagram',
 *     label: 'Create New Diagram',
 *     icon: <PlusIcon />,
 *     shortcut: { key: 'n', modifiers: { ctrlOrMeta: true } },
 *     action: () => createNewDiagram(),
 *   }}
 *   isSelected={selectedIndex === 0}
 *   onSelect={handleSelect}
 * />
 * ```
 */
export const CommandItem = memo(
  forwardRef<HTMLButtonElement, CommandItemProps>(function CommandItem(
    {
      command,
      isSelected = false,
      onSelect,
      onHover,
      searchQuery,
      className = '',
    },
    ref
  ) {
    const handleClick = useCallback(() => {
      if (command.disabled) return;
      onSelect?.(command);
    }, [command, onSelect]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (command.disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(command);
        }
      },
      [command, onSelect]
    );

    const handleMouseEnter = useCallback(() => {
      onHover?.(command);
    }, [command, onHover]);

    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-disabled={command.disabled}
        className={`
          command-item
          w-full flex items-center gap-3 px-3 py-2
          text-left
          rounded-md
          transition-colors duration-100
          ${isSelected
            ? 'bg-primary/10 text-foreground'
            : 'text-foreground/80 hover:bg-muted/50'
          }
          ${command.disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
          }
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
          ${className}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        disabled={command.disabled}
      >
        {/* Icon */}
        {command.icon && (
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground">
            {typeof command.icon === 'string' ? (
              <span className="text-base">{command.icon}</span>
            ) : (
              command.icon
            )}
          </span>
        )}

        {/* Label and description */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {highlightMatch(command.label, searchQuery ?? '')}
          </div>
          {command.description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {command.description}
            </div>
          )}
        </div>

        {/* Keyboard shortcut */}
        {command.shortcut && (
          <kbd className="flex-shrink-0 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 font-mono">
            {formatShortcut(command.shortcut)}
          </kbd>
        )}
      </button>
    );
  })
);

export default CommandItem;
