'use client';

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { CommandItem, type Command } from './CommandItem';

/**
 * Props for the CommandPalette component.
 */
export interface CommandPaletteProps {
  /** Array of available commands */
  commands: Command[];
  /** Whether the palette is open (controlled mode) */
  isOpen?: boolean;
  /** Callback when the palette should close */
  onClose?: () => void;
  /** Callback when the palette opens */
  onOpen?: () => void;
  /** Whether to show the default open shortcut (Cmd+Shift+P) */
  enableDefaultShortcut?: boolean;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Empty state text when no commands match */
  emptyText?: string;
  /** Additional CSS class for the palette */
  className?: string;
}

/**
 * Filters commands based on a search query.
 * Matches against label, description, category, and keywords.
 */
function filterCommands(commands: Command[], query: string): Command[] {
  if (!query || query.trim().length === 0) {
    return commands;
  }

  const lowerQuery = query.toLowerCase().trim();

  return commands.filter((command) => {
    // Check label
    if (command.label.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check description
    if (command.description?.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check category
    if (command.category?.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check keywords
    if (command.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    return false;
  });
}

/**
 * Groups commands by category.
 */
function groupCommandsByCategory(commands: Command[]): Map<string, Command[]> {
  const groups = new Map<string, Command[]>();

  for (const command of commands) {
    const category = command.category ?? '';
    const existing = groups.get(category) ?? [];
    existing.push(command);
    groups.set(category, existing);
  }

  return groups;
}

/**
 * Search icon component.
 */
function SearchIcon({ className }: { className?: string }) {
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
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * CommandPalette component provides a searchable command launcher.
 *
 * Opens with Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows) by default.
 * Supports keyboard navigation with arrow keys and Enter to select.
 *
 * Features:
 * - Fuzzy search across label, description, and keywords
 * - Category grouping
 * - Keyboard shortcut display
 * - Accessible keyboard navigation
 * - Portal rendering for proper stacking
 *
 * @example
 * ```tsx
 * const commands: Command[] = [
 *   {
 *     id: 'new-diagram',
 *     label: 'Create New Diagram',
 *     category: 'Diagram',
 *     action: () => createDiagram(),
 *   },
 *   {
 *     id: 'export-svg',
 *     label: 'Export as SVG',
 *     category: 'Export',
 *     shortcut: { key: 's', modifiers: { ctrlOrMeta: true, shift: true } },
 *     action: () => exportSvg(),
 *   },
 * ];
 *
 * <CommandPalette commands={commands} />
 * ```
 */
export const CommandPalette = memo(function CommandPalette({
  commands,
  isOpen: controlledIsOpen,
  onClose,
  onOpen,
  enableDefaultShortcut = true,
  placeholder = 'Search commands...',
  emptyText = 'No commands found',
  className = '',
}: CommandPaletteProps) {
  // Internal open state for uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  // Ensure we're in the browser for portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter and flatten commands
  const filteredCommands = useMemo(() => {
    return filterCommands(commands, searchQuery);
  }, [commands, searchQuery]);

  // Group commands by category (only when no search query)
  const groupedCommands = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return null; // Show flat list when searching
    }
    return groupCommandsByCategory(filteredCommands);
  }, [filteredCommands, searchQuery]);

  // Flat list for keyboard navigation
  const flatCommands = useMemo(() => {
    if (groupedCommands) {
      const flat: Command[] = [];
      for (const cmds of groupedCommands.values()) {
        flat.push(...cmds);
      }
      return flat;
    }
    return filteredCommands;
  }, [groupedCommands, filteredCommands]);

  // Open the palette
  const open = useCallback(() => {
    setInternalIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(0);
    onOpen?.();
  }, [onOpen]);

  // Close the palette
  const close = useCallback(() => {
    setInternalIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
    onClose?.();
  }, [onClose]);

  // Execute a command
  const executeCommand = useCallback(
    (command: Command) => {
      if (command.disabled) return;
      close();
      // Execute after closing to ensure clean state
      requestAnimationFrame(() => {
        command.action();
      });
    },
    [close]
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the dialog is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedRef = itemRefs.current[selectedIndex];
    if (selectedRef && listRef.current) {
      selectedRef.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard shortcut to open palette
  useKeyboardShortcut({
    key: 'p',
    modifiers: { ctrlOrMeta: true, shift: true },
    callback: () => {
      if (!isOpen) {
        open();
      }
    },
    enabled: enableDefaultShortcut && !isOpen,
    preventDefault: true,
  });

  // Handle keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatCommands.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case 'Enter':
          event.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;

        case 'Escape':
          event.preventDefault();
          close();
          break;

        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setSelectedIndex(flatCommands.length - 1);
          break;
      }
    },
    [flatCommands, selectedIndex, executeCommand, close]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        close();
      }
    },
    [close]
  );

  // Handle command selection
  const handleSelect = useCallback(
    (command: Command) => {
      executeCommand(command);
    },
    [executeCommand]
  );

  // Handle item hover
  const handleHover = useCallback(
    (command: Command) => {
      const index = flatCommands.indexOf(command);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    },
    [flatCommands]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    []
  );

  // Track item refs for scrolling
  const setItemRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  // Don't render if not open or not mounted (SSR safety)
  if (!mounted || !isOpen) {
    return null;
  }

  // Render the palette in a portal for proper z-index stacking
  return createPortal(
    <div
      className="command-palette-backdrop fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={`
          command-palette
          w-full max-w-lg
          bg-background
          rounded-lg
          shadow-2xl
          border border-border
          overflow-hidden
          animate-in fade-in zoom-in-95 duration-150
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <SearchIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-activedescendant={
              flatCommands[selectedIndex]
                ? `command-${flatCommands[selectedIndex].id}`
                : undefined
            }
          />
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-[60vh] overflow-y-auto p-2"
          role="listbox"
        >
          {flatCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              {emptyText}
            </div>
          ) : groupedCommands ? (
            // Grouped view (no search query)
            Array.from(groupedCommands.entries()).map(([category, cmds]) => {
              // Calculate the starting index for this category
              let startIndex = 0;
              for (const [cat, group] of groupedCommands.entries()) {
                if (cat === category) break;
                startIndex += group.length;
              }

              return (
                <div key={category || 'uncategorized'} className="mb-2 last:mb-0">
                  {category && (
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                  )}
                  {cmds.map((command, idx) => {
                    const globalIndex = startIndex + idx;
                    return (
                      <CommandItem
                        key={command.id}
                        ref={setItemRef(globalIndex)}
                        command={command}
                        isSelected={selectedIndex === globalIndex}
                        onSelect={handleSelect}
                        onHover={handleHover}
                        searchQuery={searchQuery}
                      />
                    );
                  })}
                </div>
              );
            })
          ) : (
            // Flat view (search results)
            flatCommands.map((command, index) => (
              <CommandItem
                key={command.id}
                ref={setItemRef(index)}
                command={command}
                isSelected={selectedIndex === index}
                onSelect={handleSelect}
                onHover={handleHover}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1 py-0.5 rounded border border-border/50 font-mono">↑</kbd>
              <kbd className="bg-muted px-1 py-0.5 rounded border border-border/50 font-mono">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1 py-0.5 rounded border border-border/50 font-mono">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {flatCommands.length} command{flatCommands.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default CommandPalette;
