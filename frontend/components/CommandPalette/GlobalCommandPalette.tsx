'use client';

import { memo, useMemo, useCallback, useState } from 'react';
import { CommandPalette } from './CommandPalette';
import type { Command } from './CommandItem';
import { useTheme } from '@/contexts/ThemeContext';
import { useDiagram } from '@/contexts/DiagramContext';

/**
 * Default diagram commands for the application.
 */
function useDefaultCommands(): Command[] {
  const { toggleTheme, resolvedTheme } = useTheme();
  const { navigationStack } = useDiagram();

  return useMemo(() => {
    const commands: Command[] = [
      // Diagram commands
      {
        id: 'new-diagram',
        label: 'Create New Diagram',
        description: 'Create a new ER diagram',
        category: 'Diagram',
        icon: '📄',
        shortcut: { key: 'n', modifiers: { ctrlOrMeta: true } },
        action: () => {
          // Emit custom event for new diagram creation
          window.dispatchEvent(new CustomEvent('er-viewer:new-diagram'));
        },
        keywords: ['new', 'create', 'diagram', 'file'],
      },
      {
        id: 'create-subdiagram',
        label: 'Create Subdiagram from Selection',
        description: 'Create a new child diagram linked to selected entity',
        category: 'Diagram',
        icon: '🔗',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:create-subdiagram'));
        },
        keywords: ['subdiagram', 'child', 'nested', 'block', 'link'],
      },
      {
        id: 'duplicate-diagram',
        label: 'Duplicate Diagram',
        description: 'Create a copy of the current diagram',
        category: 'Diagram',
        icon: '📋',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:duplicate-diagram'));
        },
        keywords: ['copy', 'clone', 'duplicate'],
      },

      // Export commands
      {
        id: 'export-svg',
        label: 'Export as SVG',
        description: 'Download diagram as SVG file',
        category: 'Export',
        icon: '🖼️',
        shortcut: { key: 's', modifiers: { ctrlOrMeta: true, shift: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:export', { detail: { format: 'svg' } }));
        },
        keywords: ['export', 'save', 'svg', 'download', 'image'],
      },
      {
        id: 'export-png',
        label: 'Export as PNG',
        description: 'Download diagram as PNG image',
        category: 'Export',
        icon: '🖼️',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:export', { detail: { format: 'png' } }));
        },
        keywords: ['export', 'save', 'png', 'download', 'image'],
      },
      {
        id: 'export-pdf',
        label: 'Export as PDF',
        description: 'Download diagram as PDF document',
        category: 'Export',
        icon: '📑',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:export', { detail: { format: 'pdf' } }));
        },
        keywords: ['export', 'save', 'pdf', 'download', 'document'],
      },

      // View commands
      {
        id: 'toggle-theme',
        label: resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: 'Toggle between light and dark themes',
        category: 'View',
        icon: resolvedTheme === 'dark' ? '☀️' : '🌙',
        action: toggleTheme,
        keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      },
      {
        id: 'toggle-left-panel',
        label: 'Toggle Left Panel',
        description: 'Show or hide the file tree panel',
        category: 'View',
        icon: '◀️',
        shortcut: { key: 'b', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:toggle-panel', { detail: { panel: 'left' } }));
        },
        keywords: ['panel', 'sidebar', 'file', 'tree', 'toggle'],
      },
      {
        id: 'toggle-right-panel',
        label: 'Toggle Right Panel',
        description: 'Show or hide the properties panel',
        category: 'View',
        icon: '▶️',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:toggle-panel', { detail: { panel: 'right' } }));
        },
        keywords: ['panel', 'sidebar', 'properties', 'toggle'],
      },
      {
        id: 'fit-to-screen',
        label: 'Fit Diagram to Screen',
        description: 'Reset zoom and center the diagram',
        category: 'View',
        icon: '⊡',
        shortcut: { key: '0', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:fit-to-screen'));
        },
        keywords: ['fit', 'zoom', 'reset', 'center'],
      },
      {
        id: 'zoom-in',
        label: 'Zoom In',
        description: 'Increase diagram zoom level',
        category: 'View',
        icon: '🔍',
        shortcut: { key: '=', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:zoom', { detail: { direction: 'in' } }));
        },
        keywords: ['zoom', 'in', 'magnify', 'larger'],
      },
      {
        id: 'zoom-out',
        label: 'Zoom Out',
        description: 'Decrease diagram zoom level',
        category: 'View',
        icon: '🔍',
        shortcut: { key: '-', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:zoom', { detail: { direction: 'out' } }));
        },
        keywords: ['zoom', 'out', 'smaller'],
      },

      // Edit commands
      {
        id: 'undo',
        label: 'Undo',
        description: 'Undo last change',
        category: 'Edit',
        icon: '↩️',
        shortcut: { key: 'z', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:undo'));
        },
        keywords: ['undo', 'revert', 'back'],
      },
      {
        id: 'redo',
        label: 'Redo',
        description: 'Redo last undone change',
        category: 'Edit',
        icon: '↪️',
        shortcut: { key: 'z', modifiers: { ctrlOrMeta: true, shift: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:redo'));
        },
        keywords: ['redo', 'forward'],
      },
      {
        id: 'save-version',
        label: 'Save Version Snapshot',
        description: 'Create a named snapshot of the current diagram',
        category: 'Edit',
        icon: '💾',
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:save-version'));
        },
        keywords: ['save', 'version', 'snapshot', 'checkpoint'],
      },

      // Navigation commands
      {
        id: 'go-back',
        label: 'Go Back',
        description: 'Navigate to parent diagram',
        category: 'Navigation',
        icon: '⬅️',
        shortcut: { key: '[', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:navigate-back'));
        },
        keywords: ['back', 'parent', 'up', 'navigate'],
        disabled: navigationStack.length <= 1,
      },

      // Help commands
      {
        id: 'keyboard-shortcuts',
        label: 'Keyboard Shortcuts',
        description: 'View all keyboard shortcuts',
        category: 'Help',
        icon: '⌨️',
        shortcut: { key: '/', modifiers: { ctrlOrMeta: true } },
        action: () => {
          window.dispatchEvent(new CustomEvent('er-viewer:show-shortcuts'));
        },
        keywords: ['keyboard', 'shortcuts', 'keys', 'help'],
      },
      {
        id: 'documentation',
        label: 'Open Documentation',
        description: 'View ER Viewer documentation',
        category: 'Help',
        icon: '📚',
        action: () => {
          window.open('https://mermaid.js.org/syntax/entityRelationshipDiagram.html', '_blank');
        },
        keywords: ['docs', 'documentation', 'help', 'guide'],
      },
    ];

    return commands;
  }, [toggleTheme, resolvedTheme, navigationStack.length]);
}

/**
 * GlobalCommandPalette component provides an application-wide command palette.
 *
 * This component:
 * - Registers Cmd+Shift+P / Ctrl+Shift+P to open the palette
 * - Provides default commands for common actions
 * - Dispatches custom events that page components can listen for
 *
 * @example
 * ```tsx
 * // In providers.tsx
 * <ThemeProvider>
 *   <DiagramProvider>
 *     {children}
 *     <GlobalCommandPalette />
 *   </DiagramProvider>
 * </ThemeProvider>
 * ```
 */
export const GlobalCommandPalette = memo(function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const defaultCommands = useDefaultCommands();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <CommandPalette
      commands={defaultCommands}
      isOpen={isOpen}
      onOpen={handleOpen}
      onClose={handleClose}
      enableDefaultShortcut={true}
      placeholder="Type a command or search..."
    />
  );
});

export default GlobalCommandPalette;
