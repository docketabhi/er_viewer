'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

/**
 * Props for the SearchInput component.
 */
export interface SearchInputProps {
  /** Current search value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Callback when search value changes */
  onChange?: (value: string) => void;
  /** Callback when search is submitted (Enter key) */
  onSubmit?: (value: string) => void;
  /** Callback when search is cleared */
  onClear?: () => void;
  /** Whether to show the clear button */
  showClearButton?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Debounce delay in milliseconds (0 for no debounce) */
  debounceMs?: number;
  /** Additional CSS class */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Aria label for accessibility */
  'aria-label'?: string;
}

/**
 * Size configurations for the search input.
 */
const SIZE_CLASSES = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-9 text-sm px-3',
  lg: 'h-10 text-base px-4',
};

const ICON_SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * SearchInput component for searching diagrams.
 *
 * Features:
 * - Debounced input for performance
 * - Clear button
 * - Keyboard navigation (Enter to submit, Escape to clear)
 * - Multiple size variants
 *
 * @example
 * ```tsx
 * <SearchInput
 *   placeholder="Search diagrams..."
 *   onChange={(value) => setSearchQuery(value)}
 *   onSubmit={(value) => handleSearch(value)}
 *   debounceMs={300}
 * />
 * ```
 */
export const SearchInput = memo(function SearchInput({
  value: controlledValue,
  placeholder = 'Search...',
  onChange,
  onSubmit,
  onClear,
  showClearButton = true,
  autoFocus = false,
  debounceMs = 0,
  className = '',
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');

  // Use controlled value if provided
  const currentValue = controlledValue ?? internalValue;

  /**
   * Handle input change with optional debounce.
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Apply debounce if configured
      if (debounceMs > 0) {
        debounceTimerRef.current = setTimeout(() => {
          onChange?.(newValue);
        }, debounceMs);
      } else {
        onChange?.(newValue);
      }
    },
    [onChange, debounceMs]
  );

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit?.(currentValue);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInternalValue('');
        onChange?.('');
        onClear?.();
        inputRef.current?.blur();
      }
    },
    [currentValue, onChange, onSubmit, onClear]
  );

  /**
   * Handle clear button click.
   */
  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // Sync internal value with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Auto-focus on mount if configured
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const hasValue = currentValue.length > 0;

  return (
    <div
      className={`
        search-input
        relative
        ${className}
      `}
    >
      {/* Search icon */}
      <div
        className={`
          absolute left-3 top-1/2 -translate-y-1/2
          text-muted-foreground
          pointer-events-none
        `}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={ICON_SIZES[size]}
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`
          w-full
          ${SIZE_CLASSES[size]}
          pl-9
          ${showClearButton && hasValue ? 'pr-8' : 'pr-3'}
          rounded-md
          border border-border
          bg-background
          text-foreground
          placeholder:text-muted-foreground
          focus:outline-none
          focus:ring-2
          focus:ring-primary/50
          focus:border-primary
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-colors
        `}
      />

      {/* Clear button */}
      {showClearButton && hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            p-0.5
            rounded
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted
            focus:outline-none
            focus:ring-2
            focus:ring-primary/50
            transition-colors
          `}
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={ICON_SIZES[size]}
          >
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

export default SearchInput;
