'use client';

import { useCallback, memo } from 'react';

/**
 * Breadcrumb item data structure.
 */
export interface BreadcrumbItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label for the breadcrumb */
  label: string;
  /** Whether this is the current (active) item */
  isCurrent: boolean;
}

/**
 * Props for the Breadcrumb component.
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Callback fired when a breadcrumb item is clicked */
  onItemClick?: (index: number, item: BreadcrumbItem) => void;
  /** Whether to show the home icon for the first item */
  showHomeIcon?: boolean;
  /** Maximum number of items to show before truncating */
  maxItems?: number;
  /** Label for the home/root item */
  homeLabel?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Size configurations for breadcrumb variants.
 */
const sizeConfig = {
  sm: {
    container: 'text-xs gap-1',
    item: 'px-1.5 py-0.5',
    icon: 'w-3 h-3',
    separator: 'text-xs',
  },
  md: {
    container: 'text-sm gap-1.5',
    item: 'px-2 py-1',
    icon: 'w-4 h-4',
    separator: 'text-sm',
  },
  lg: {
    container: 'text-base gap-2',
    item: 'px-2.5 py-1.5',
    icon: 'w-5 h-5',
    separator: 'text-base',
  },
};

/**
 * Home icon component for the root breadcrumb.
 */
function HomeIcon({ className }: { className?: string }) {
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
        d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Chevron separator icon between breadcrumb items.
 */
function ChevronIcon({ className }: { className?: string }) {
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
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Ellipsis indicator for truncated breadcrumbs.
 */
function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  );
}

/**
 * Individual breadcrumb item component.
 */
const BreadcrumbItemComponent = memo(function BreadcrumbItemComponent({
  item,
  index,
  isFirst,
  showHomeIcon,
  onClick,
  sizes,
}: {
  item: BreadcrumbItem;
  index: number;
  isFirst: boolean;
  showHomeIcon: boolean;
  onClick?: (index: number, item: BreadcrumbItem) => void;
  sizes: (typeof sizeConfig)['md'];
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!item.isCurrent && onClick) {
        onClick(index, item);
      }
    },
    [index, item, onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !item.isCurrent && onClick) {
        e.preventDefault();
        onClick(index, item);
      }
    },
    [index, item, onClick]
  );

  // Current item (non-clickable)
  if (item.isCurrent) {
    return (
      <span
        className={`
          breadcrumb-item breadcrumb-item--current
          ${sizes.item}
          font-medium text-foreground
          truncate max-w-[200px]
        `}
        aria-current="page"
        title={item.label}
      >
        {isFirst && showHomeIcon ? (
          <span className="flex items-center gap-1">
            <HomeIcon className={sizes.icon} />
            <span className="sr-only">{item.label}</span>
          </span>
        ) : (
          item.label
        )}
      </span>
    );
  }

  // Clickable item
  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        breadcrumb-item breadcrumb-item--clickable
        ${sizes.item}
        text-muted-foreground
        hover:text-foreground hover:bg-muted/50
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
        rounded-md
        transition-colors duration-150
        truncate max-w-[200px]
      `}
      title={item.label}
      aria-label={`Navigate to ${item.label}`}
    >
      {isFirst && showHomeIcon ? (
        <span className="flex items-center gap-1">
          <HomeIcon className={sizes.icon} />
          <span className="sr-only">{item.label}</span>
        </span>
      ) : (
        item.label
      )}
    </button>
  );
});

/**
 * Breadcrumb component for hierarchical navigation display.
 *
 * Displays a trail of navigation items showing the current location
 * in the diagram hierarchy. Each item is clickable to navigate back
 * to that level.
 *
 * Features:
 * - Truncation for long breadcrumb trails
 * - Home icon for the root item
 * - Keyboard navigation support
 * - Responsive sizing variants
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { id: 'root', label: 'Main Diagram', isCurrent: false },
 *     { id: 'billing', label: 'Billing Module', isCurrent: false },
 *     { id: 'invoices', label: 'Invoices', isCurrent: true },
 *   ]}
 *   onItemClick={(index, item) => navigateTo(index)}
 *   showHomeIcon
 * />
 * ```
 */
export function Breadcrumb({
  items,
  onItemClick,
  showHomeIcon = true,
  maxItems = 5,
  homeLabel = 'Home',
  className = '',
  size = 'md',
}: BreadcrumbProps) {
  const sizes = sizeConfig[size];

  // Handle empty items
  if (!items || items.length === 0) {
    return null;
  }

  // If we have only one item, don't show breadcrumbs
  if (items.length === 1) {
    return (
      <nav
        className={`breadcrumb flex items-center ${sizes.container} ${className}`}
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-1">
          <li>
            <BreadcrumbItemComponent
              item={items[0]}
              index={0}
              isFirst
              showHomeIcon={showHomeIcon}
              onClick={onItemClick}
              sizes={sizes}
            />
          </li>
        </ol>
      </nav>
    );
  }

  // Determine if we need to truncate
  const shouldTruncate = items.length > maxItems;

  // Build the display items
  let displayItems: Array<BreadcrumbItem | 'ellipsis'>;

  if (shouldTruncate) {
    // Show: first, ellipsis, last (maxItems - 2) items
    const keepCount = maxItems - 2;
    const startItems = items.slice(0, 1);
    const endItems = items.slice(-keepCount);
    displayItems = [...startItems, 'ellipsis', ...endItems];
  } else {
    displayItems = items;
  }

  return (
    <nav
      className={`breadcrumb flex items-center ${sizes.container} ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1">
        {displayItems.map((item, displayIndex) => {
          // Handle ellipsis
          if (item === 'ellipsis') {
            return (
              <li key="ellipsis" className="flex items-center">
                <ChevronIcon
                  className={`${sizes.icon} text-muted-foreground/50 flex-shrink-0`}
                />
                <span
                  className={`${sizes.item} text-muted-foreground/50`}
                  aria-hidden="true"
                >
                  <EllipsisIcon className={sizes.icon} />
                </span>
              </li>
            );
          }

          // Calculate actual index for click handler
          let actualIndex: number;
          if (shouldTruncate) {
            if (displayIndex === 0) {
              actualIndex = 0;
            } else {
              // After ellipsis, items are from the end
              const keepCount = maxItems - 2;
              actualIndex = items.length - keepCount + (displayIndex - 2);
            }
          } else {
            actualIndex = displayIndex;
          }

          const isFirst = displayIndex === 0;

          return (
            <li key={item.id} className="flex items-center">
              {!isFirst && (
                <ChevronIcon
                  className={`${sizes.icon} text-muted-foreground/50 flex-shrink-0`}
                />
              )}
              <BreadcrumbItemComponent
                item={item}
                index={actualIndex}
                isFirst={isFirst}
                showHomeIcon={showHomeIcon}
                onClick={onItemClick}
                sizes={sizes}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Back button component for navigation.
 * Can be used alongside Breadcrumb for quick back navigation.
 */
export function BackButton({
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = sizeConfig[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        back-button
        inline-flex items-center gap-1
        ${sizes.item}
        ${sizes.container}
        text-muted-foreground
        hover:text-foreground hover:bg-muted/50
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
        rounded-md
        transition-colors duration-150
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label="Go back to previous diagram"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={sizes.icon}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
          clipRule="evenodd"
        />
      </svg>
      <span>Back</span>
    </button>
  );
}

export default Breadcrumb;
