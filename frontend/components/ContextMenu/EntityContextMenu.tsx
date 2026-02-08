'use client';

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { BlockDirective } from '@/lib/mermaid/types';

/**
 * Action item for the entity context menu.
 */
export interface EntityContextMenuAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Optional tooltip when disabled */
  disabledReason?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Callback when the action is selected */
  onSelect: () => void;
  /** Whether this is a danger action (destructive) */
  danger?: boolean;
  /** Separator after this item */
  hasSeparator?: boolean;
}

/**
 * Props for the EntityContextMenu component.
 */
export interface EntityContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** X position (left) */
  x: number;
  /** Y position (top) */
  y: number;
  /** Entity name the menu is for */
  entityName: string;
  /** Block directive associated with this entity, if any */
  block?: BlockDirective;
  /** Whether the entity has an existing block */
  hasExistingBlock: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Callback when "Link to subdiagram" is selected */
  onLinkToSubdiagram?: (entityName: string) => void;
  /** Callback when "Create subdiagram" is selected */
  onCreateSubdiagram?: (entityName: string) => void;
  /** Callback when "Edit block" is selected */
  onEditBlock?: (entityName: string, block: BlockDirective) => void;
  /** Callback when "Remove block" is selected */
  onRemoveBlock?: (entityName: string, block: BlockDirective) => void;
  /** Callback when "Go to subdiagram" is selected */
  onGoToSubdiagram?: (block: BlockDirective) => void;
  /** Callback when "Copy entity name" is selected */
  onCopyEntityName?: (entityName: string) => void;
  /** Additional custom actions */
  customActions?: EntityContextMenuAction[];
  /** Additional CSS class */
  className?: string;
}

/**
 * Link icon component.
 */
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
      <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
    </svg>
  );
}

/**
 * Plus icon component.
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

/**
 * Navigate icon component.
 */
function ArrowRightIcon({ className }: { className?: string }) {
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
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Edit icon component.
 */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

/**
 * Trash icon component.
 */
function TrashIcon({ className }: { className?: string }) {
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
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Copy icon component.
 */
function ClipboardIcon({ className }: { className?: string }) {
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
        d="M13.887 3.182c.396.037.79.08 1.183.128C16.194 3.45 17 4.414 17 5.517V16.75A2.25 2.25 0 0114.75 19h-9.5A2.25 2.25 0 013 16.75V5.517c0-1.103.806-2.068 1.93-2.207.393-.048.787-.09 1.183-.128A3.001 3.001 0 019 1h2c1.373 0 2.531.923 2.887 2.182zM7.5 4A1.5 1.5 0 019 2.5h2A1.5 1.5 0 0112.5 4v.5h-5V4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Menu item component with consistent styling.
 */
const MenuItem = memo(function MenuItem({
  action,
  onClose,
  isSelected,
  onMouseEnter,
}: {
  action: EntityContextMenuAction;
  onClose: () => void;
  isSelected: boolean;
  onMouseEnter: () => void;
}) {
  const handleClick = useCallback(() => {
    if (action.disabled) return;
    action.onSelect();
    onClose();
  }, [action, onClose]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={onMouseEnter}
        disabled={action.disabled}
        className={`
          context-menu-item
          w-full flex items-center gap-3 px-3 py-2 text-left text-sm
          transition-colors duration-100
          ${isSelected ? 'bg-accent' : ''}
          ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${action.danger ? 'text-red-500 hover:text-red-600' : 'text-foreground'}
          hover:bg-accent focus:bg-accent focus:outline-none
        `}
        role="menuitem"
        aria-disabled={action.disabled}
        title={action.disabled ? action.disabledReason : undefined}
      >
        {action.icon && (
          <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>
        )}
        <span className="flex-1">{action.label}</span>
        {action.shortcut && (
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {action.shortcut}
          </span>
        )}
      </button>
      {action.hasSeparator && (
        <div className="my-1 border-t border-border" role="separator" />
      )}
    </>
  );
});

/**
 * EntityContextMenu component provides a right-click menu for entities in ER diagrams.
 *
 * Displays contextual actions like:
 * - Link to subdiagram (for entities without blocks)
 * - Create new subdiagram (for entities without blocks)
 * - Go to subdiagram (for entities with blocks)
 * - Edit block (for entities with blocks)
 * - Remove block (for entities with blocks)
 * - Copy entity name
 *
 * @example
 * ```tsx
 * const { state, openMenu, closeMenu, menuRef } = useContextMenu<string>();
 *
 * // Handle context menu on entity
 * const handleEntityContextMenu = (entityName: string, event: MouseEvent) => {
 *   openMenu(event, entityName);
 * };
 *
 * <EntityContextMenu
 *   isOpen={state.isOpen}
 *   x={state.position.x}
 *   y={state.position.y}
 *   entityName={state.targetData ?? ''}
 *   hasExistingBlock={false}
 *   onClose={closeMenu}
 *   onLinkToSubdiagram={(name) => console.log('Link:', name)}
 *   onCreateSubdiagram={(name) => console.log('Create:', name)}
 * />
 * ```
 */
export const EntityContextMenu = memo(function EntityContextMenu({
  isOpen,
  x,
  y,
  entityName,
  block,
  hasExistingBlock,
  onClose,
  onLinkToSubdiagram,
  onCreateSubdiagram,
  onEditBlock,
  onRemoveBlock,
  onGoToSubdiagram,
  onCopyEntityName,
  customActions = [],
  className = '',
}: EntityContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Ensure we're in the browser for portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Build list of actions based on entity state
  const actions: EntityContextMenuAction[] = [];

  // If entity has a block, show navigation options
  if (hasExistingBlock && block) {
    if (onGoToSubdiagram) {
      actions.push({
        id: 'go-to-subdiagram',
        label: 'Go to subdiagram',
        icon: <ArrowRightIcon className="w-4 h-4" />,
        onSelect: () => onGoToSubdiagram(block),
      });
    }
    if (onEditBlock) {
      actions.push({
        id: 'edit-block',
        label: 'Edit block link',
        icon: <PencilIcon className="w-4 h-4" />,
        onSelect: () => onEditBlock(entityName, block),
      });
    }
    if (onRemoveBlock) {
      actions.push({
        id: 'remove-block',
        label: 'Remove block link',
        icon: <TrashIcon className="w-4 h-4" />,
        danger: true,
        onSelect: () => onRemoveBlock(entityName, block),
        hasSeparator: true,
      });
    }
  } else {
    // Entity doesn't have a block, show create options
    if (onLinkToSubdiagram) {
      actions.push({
        id: 'link-to-subdiagram',
        label: 'Link to subdiagram',
        icon: <LinkIcon className="w-4 h-4" />,
        onSelect: () => onLinkToSubdiagram(entityName),
      });
    }
    if (onCreateSubdiagram) {
      actions.push({
        id: 'create-subdiagram',
        label: 'Create new subdiagram',
        icon: <PlusIcon className="w-4 h-4" />,
        onSelect: () => onCreateSubdiagram(entityName),
        hasSeparator: true,
      });
    }
  }

  // Always show copy entity name
  if (onCopyEntityName) {
    actions.push({
      id: 'copy-entity-name',
      label: 'Copy entity name',
      icon: <ClipboardIcon className="w-4 h-4" />,
      shortcut: isMac() ? '⌘C' : 'Ctrl+C',
      onSelect: () => onCopyEntityName(entityName),
    });
  }

  // Add custom actions
  actions.push(...customActions);

  // Reset selection when menu opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const padding = 8;

    let newX = x;
    let newY = y;

    // Adjust X if menu would overflow right edge
    if (x + rect.width + padding > window.innerWidth) {
      newX = Math.max(padding, window.innerWidth - rect.width - padding);
    }

    // Adjust Y if menu would overflow bottom edge
    if (y + rect.height + padding > window.innerHeight) {
      newY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [isOpen, x, y]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev < actions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (actions[selectedIndex] && !actions[selectedIndex].disabled) {
            actions[selectedIndex].onSelect();
            onClose();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setSelectedIndex(actions.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actions, selectedIndex, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Don't render if not open or not mounted
  if (!mounted || !isOpen) {
    return null;
  }

  // Don't render if no actions available
  if (actions.length === 0) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className={`
        entity-context-menu
        fixed z-50
        min-w-[200px] max-w-[280px]
        bg-popover
        border border-border
        rounded-lg
        shadow-lg
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-100
        ${className}
      `}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      aria-label={`Actions for ${entityName}`}
    >
      {/* Header with entity name */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Entity
        </div>
        <div className="text-sm font-medium truncate">{entityName}</div>
        {hasExistingBlock && block?.label && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            Block: {block.label}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="py-1" role="presentation">
        {actions.map((action, index) => (
          <MenuItem
            key={action.id}
            action={action}
            onClose={onClose}
            isSelected={selectedIndex === index}
            onMouseEnter={() => setSelectedIndex(index)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
});

/**
 * Helper to detect Mac platform.
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export default EntityContextMenu;
