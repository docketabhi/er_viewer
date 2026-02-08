'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';

/**
 * Props for the SettingsTab component.
 */
export interface SettingsTabProps {
  /** Current settings */
  settings?: DiagramSettings;
  /** Callback when settings change */
  onSettingsChange?: (settings: Partial<DiagramSettings>) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Diagram settings structure.
 */
export interface DiagramSettings {
  /** Editor font size */
  fontSize: number;
  /** Editor tab size */
  tabSize: number;
  /** Enable word wrap */
  wordWrap: boolean;
  /** Enable minimap */
  minimap: boolean;
  /** Enable line numbers */
  lineNumbers: boolean;
  /** Auto-save interval in seconds (0 = disabled) */
  autoSaveInterval: number;
  /** Mermaid theme */
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
  /** Preview update debounce in ms */
  previewDebounce: number;
  /** Show block indicators on hover */
  showBlockIndicators: boolean;
}

/**
 * Default settings.
 */
const DEFAULT_SETTINGS: DiagramSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  autoSaveInterval: 30,
  mermaidTheme: 'default',
  previewDebounce: 300,
  showBlockIndicators: true,
};

/**
 * Mermaid theme options.
 */
const MERMAID_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'neutral', label: 'Neutral' },
] as const;

/**
 * Setting group component.
 */
const SettingGroup = memo(function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
});

/**
 * Toggle setting component.
 */
const ToggleSetting = memo(function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`
          relative
          w-10 h-6
          rounded-full
          transition-colors
          ${value ? 'bg-primary' : 'bg-muted'}
        `}
      >
        <span
          className={`
            absolute
            top-1 left-1
            w-4 h-4
            rounded-full
            bg-white
            shadow-sm
            transition-transform
            ${value ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
});

/**
 * Number input setting component.
 */
const NumberSetting = memo(function NumberSetting({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-xs text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full
          h-2
          bg-muted
          rounded-full
          appearance-none
          cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow
        "
      />
    </div>
  );
});

/**
 * Select setting component.
 */
const SelectSetting = memo(function SelectSetting<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="
          px-2 py-1.5
          text-sm
          bg-background
          border border-border
          rounded
          focus:outline-none
          focus:ring-2
          focus:ring-primary/50
          focus:border-primary
        "
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

/**
 * Reset button component.
 */
const ResetButton = memo(function ResetButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full
        px-3 py-2
        text-sm font-medium
        text-muted-foreground
        hover:text-foreground
        hover:bg-muted
        border border-border
        rounded-lg
        transition-colors
      "
    >
      Reset to Defaults
    </button>
  );
});

/**
 * SettingsTab component for configuring editor and preview settings.
 *
 * Features:
 * - Editor settings (font size, tab size, word wrap, etc.)
 * - Preview settings (Mermaid theme, debounce, indicators)
 * - Auto-save configuration
 * - Reset to defaults
 *
 * @example
 * ```tsx
 * <SettingsTab
 *   settings={currentSettings}
 *   onSettingsChange={(changes) => updateSettings(changes)}
 * />
 * ```
 */
export const SettingsTab = memo(function SettingsTab({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  className = '',
}: SettingsTabProps) {
  const [localSettings, setLocalSettings] = useState<DiagramSettings>({
    ...DEFAULT_SETTINGS,
    ...settings,
  });

  const handleChange = useCallback(
    <K extends keyof DiagramSettings>(key: K, value: DiagramSettings[K]) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
      onSettingsChange?.({ [key]: value });
    },
    [onSettingsChange]
  );

  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSettingsChange?.(DEFAULT_SETTINGS);
  }, [onSettingsChange]);

  return (
    <div
      className={`
        settings-tab
        h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
    >
      <div className="flex-1 overflow-auto p-3 space-y-6">
        {/* Editor Settings */}
        <SettingGroup title="Editor">
          <NumberSetting
            label="Font Size"
            value={localSettings.fontSize}
            min={10}
            max={24}
            unit="px"
            onChange={(v) => handleChange('fontSize', v)}
          />
          <NumberSetting
            label="Tab Size"
            value={localSettings.tabSize}
            min={2}
            max={8}
            unit="spaces"
            onChange={(v) => handleChange('tabSize', v)}
          />
          <ToggleSetting
            label="Word Wrap"
            description="Wrap long lines in the editor"
            value={localSettings.wordWrap}
            onChange={(v) => handleChange('wordWrap', v)}
          />
          <ToggleSetting
            label="Line Numbers"
            description="Show line numbers in the editor"
            value={localSettings.lineNumbers}
            onChange={(v) => handleChange('lineNumbers', v)}
          />
          <ToggleSetting
            label="Minimap"
            description="Show code minimap on the right"
            value={localSettings.minimap}
            onChange={(v) => handleChange('minimap', v)}
          />
        </SettingGroup>

        {/* Preview Settings */}
        <SettingGroup title="Preview">
          <SelectSetting
            label="Mermaid Theme"
            description="Color theme for diagram rendering"
            value={localSettings.mermaidTheme}
            options={MERMAID_THEMES}
            onChange={(v) => handleChange('mermaidTheme', v)}
          />
          <NumberSetting
            label="Preview Delay"
            description="Delay before updating preview"
            value={localSettings.previewDebounce}
            min={100}
            max={1000}
            step={50}
            unit="ms"
            onChange={(v) => handleChange('previewDebounce', v)}
          />
          <ToggleSetting
            label="Block Indicators"
            description="Show visual indicators for nested blocks"
            value={localSettings.showBlockIndicators}
            onChange={(v) => handleChange('showBlockIndicators', v)}
          />
        </SettingGroup>

        {/* Auto-Save Settings */}
        <SettingGroup title="Auto-Save">
          <NumberSetting
            label="Auto-Save Interval"
            description="0 to disable auto-save"
            value={localSettings.autoSaveInterval}
            min={0}
            max={120}
            step={5}
            unit="sec"
            onChange={(v) => handleChange('autoSaveInterval', v)}
          />
        </SettingGroup>

        {/* Reset */}
        <ResetButton onClick={handleReset} />
      </div>
    </div>
  );
});

export default SettingsTab;
