/**
 * SVG export utilities for Mermaid diagrams.
 *
 * Provides functionality to export rendered SVG diagrams as downloadable files.
 * Handles SVG serialization, styling, and browser download mechanics.
 *
 * @module lib/export/exportSvg
 */

/**
 * Options for SVG export.
 */
export interface ExportSvgOptions {
  /** Filename for the downloaded file (without extension) */
  filename?: string;
  /** Whether to include inline styles in the exported SVG */
  includeStyles?: boolean;
  /** Whether to include a white background */
  includeBackground?: boolean;
  /** Background color (default: white for light theme, #1e1e1e for dark) */
  backgroundColor?: string;
  /** Padding around the diagram in pixels */
  padding?: number;
  /** Whether to preserve the original viewBox */
  preserveViewBox?: boolean;
  /** Custom CSS to inject into the SVG */
  customCss?: string;
}

/**
 * Result of SVG export operation.
 */
export interface ExportSvgResult {
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
  /** The exported SVG string (if not downloading) */
  svgString?: string;
  /** The filename used for download */
  filename?: string;
}

/**
 * Default export options.
 */
const DEFAULT_OPTIONS: Required<ExportSvgOptions> = {
  filename: 'diagram',
  includeStyles: true,
  includeBackground: true,
  backgroundColor: '#ffffff',
  padding: 20,
  preserveViewBox: true,
  customCss: '',
};

/**
 * Sanitizes a filename by removing invalid characters.
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file systems
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 200) || 'diagram';
}

/**
 * Extracts computed styles from an element and its children.
 *
 * @param element - The element to extract styles from
 * @returns CSS string with computed styles
 */
function extractComputedStyles(element: Element): string {
  const styles: string[] = [];
  const visited = new Set<string>();

  function processElement(el: Element): void {
    const tagName = el.tagName.toLowerCase();
    const className = el.getAttribute('class');
    const id = el.getAttribute('id');

    // Create a unique selector for this element
    let selector = tagName;
    if (id) {
      selector = `#${id}`;
    } else if (className) {
      selector = `.${className.split(' ').join('.')}`;
    }

    // Skip if we've already processed this selector
    if (visited.has(selector)) {
      return;
    }
    visited.add(selector);

    // Get computed styles for SVG-relevant properties
    const computed = window.getComputedStyle(el);
    const relevantProps = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'stroke-linecap',
      'stroke-linejoin',
      'opacity',
      'font-family',
      'font-size',
      'font-weight',
      'text-anchor',
      'dominant-baseline',
    ];

    const styleDeclarations: string[] = [];
    for (const prop of relevantProps) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== '') {
        styleDeclarations.push(`${prop}: ${value}`);
      }
    }

    if (styleDeclarations.length > 0) {
      styles.push(`${selector} { ${styleDeclarations.join('; ')}; }`);
    }

    // Process children
    for (const child of el.children) {
      processElement(child);
    }
  }

  processElement(element);
  return styles.join('\n');
}

/**
 * Clones an SVG element and prepares it for export.
 *
 * @param svg - The SVG element to clone
 * @param options - Export options
 * @returns Cloned and prepared SVG element
 */
function prepareSvgForExport(
  svg: SVGSVGElement,
  options: Required<ExportSvgOptions>
): SVGSVGElement {
  // Clone the SVG
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Get original dimensions
  const viewBox = svg.getAttribute('viewBox');
  const originalWidth = svg.getAttribute('width');
  const originalHeight = svg.getAttribute('height');

  let width: number;
  let height: number;

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4) {
      width = parts[2] + options.padding * 2;
      height = parts[3] + options.padding * 2;

      if (options.preserveViewBox) {
        clone.setAttribute(
          'viewBox',
          `${parts[0] - options.padding} ${parts[1] - options.padding} ${width} ${height}`
        );
      }
    } else {
      width = parseFloat(originalWidth || '800') + options.padding * 2;
      height = parseFloat(originalHeight || '600') + options.padding * 2;
    }
  } else {
    width = parseFloat(originalWidth || '800') + options.padding * 2;
    height = parseFloat(originalHeight || '600') + options.padding * 2;
  }

  // Set explicit dimensions
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // Add XML namespace if missing
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  // Add background if requested
  if (options.includeBackground) {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', options.backgroundColor);
    clone.insertBefore(bgRect, clone.firstChild);
  }

  // Add inline styles if requested
  if (options.includeStyles) {
    const existingStyle = clone.querySelector('style');
    const computedStyles = extractComputedStyles(svg);
    const allStyles = [computedStyles, options.customCss].filter(Boolean).join('\n');

    if (existingStyle) {
      existingStyle.textContent = allStyles + '\n' + (existingStyle.textContent || '');
    } else {
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = allStyles;
      clone.insertBefore(styleElement, clone.firstChild);
    }
  }

  // Remove any data attributes that might cause issues
  const dataElements = clone.querySelectorAll('[data-entity-click-handler]');
  dataElements.forEach((el) => {
    el.removeAttribute('data-entity-click-handler');
  });

  // Remove any event-related styles
  const clickableElements = clone.querySelectorAll('[style*="cursor"]');
  clickableElements.forEach((el) => {
    const style = (el as HTMLElement).style;
    style.cursor = '';
  });

  return clone;
}

/**
 * Serializes an SVG element to a string.
 *
 * @param svg - The SVG element to serialize
 * @returns XML string representation of the SVG
 */
function serializeSvg(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svg);

  // Add XML declaration if missing
  if (!svgString.startsWith('<?xml')) {
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
  }

  return svgString;
}

/**
 * Triggers a browser download for the given content.
 *
 * @param content - The content to download
 * @param filename - The filename for the download
 * @param mimeType - The MIME type of the content
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the URL after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Exports an SVG element as a downloadable file.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Result of the export operation
 *
 * @example
 * ```tsx
 * const svgElement = document.querySelector('svg');
 * const result = exportSvg(svgElement, {
 *   filename: 'my-diagram',
 *   includeBackground: true,
 *   backgroundColor: '#ffffff',
 * });
 *
 * if (result.success) {
 *   console.log('Downloaded:', result.filename);
 * } else {
 *   console.error('Export failed:', result.error);
 * }
 * ```
 */
export function exportSvg(
  svg: SVGSVGElement | null,
  options: ExportSvgOptions = {}
): ExportSvgResult {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    // Merge options with defaults
    const mergedOptions: Required<ExportSvgOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(mergedOptions.filename);
    const fullFilename = `${sanitizedFilename}.svg`;

    // Prepare SVG for export
    const preparedSvg = prepareSvgForExport(svg, mergedOptions);

    // Serialize to string
    const svgString = serializeSvg(preparedSvg);

    // Trigger download
    triggerDownload(svgString, fullFilename, 'image/svg+xml');

    return {
      success: true,
      svgString,
      filename: fullFilename,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during SVG export',
    };
  }
}

/**
 * Exports an SVG element and returns the SVG string without downloading.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Result containing the SVG string
 *
 * @example
 * ```tsx
 * const result = exportSvgToString(svgElement, { includeStyles: true });
 * if (result.success) {
 *   // Use result.svgString for further processing
 * }
 * ```
 */
export function exportSvgToString(
  svg: SVGSVGElement | null,
  options: ExportSvgOptions = {}
): ExportSvgResult {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    const mergedOptions: Required<ExportSvgOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const preparedSvg = prepareSvgForExport(svg, mergedOptions);
    const svgString = serializeSvg(preparedSvg);

    return {
      success: true,
      svgString,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during SVG export',
    };
  }
}

/**
 * Gets the SVG element from a container.
 *
 * @param container - The container element or ref
 * @returns The SVG element or null
 */
export function getSvgFromContainer(
  container: Element | HTMLElement | null
): SVGSVGElement | null {
  if (!container) {
    return null;
  }
  return container.querySelector('svg') as SVGSVGElement | null;
}

/**
 * Creates a data URL from an SVG element.
 *
 * @param svg - The SVG element
 * @param options - Export options
 * @returns Data URL string or null on error
 *
 * @example
 * ```tsx
 * const dataUrl = createSvgDataUrl(svgElement);
 * if (dataUrl) {
 *   // Use as image src or for other purposes
 *   img.src = dataUrl;
 * }
 * ```
 */
export function createSvgDataUrl(
  svg: SVGSVGElement | null,
  options: ExportSvgOptions = {}
): string | null {
  const result = exportSvgToString(svg, options);
  if (!result.success || !result.svgString) {
    return null;
  }

  const base64 = btoa(unescape(encodeURIComponent(result.svgString)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Gets the dimensions of an SVG element.
 *
 * @param svg - The SVG element
 * @returns Object with width and height, or null if unavailable
 */
export function getSvgDimensions(
  svg: SVGSVGElement | null
): { width: number; height: number } | null {
  if (!svg) {
    return null;
  }

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const width = parseFloat(svg.getAttribute('width') || '0');
  const height = parseFloat(svg.getAttribute('height') || '0');

  if (width > 0 && height > 0) {
    return { width, height };
  }

  // Try getBBox as fallback
  try {
    const bbox = svg.getBBox();
    return { width: bbox.width, height: bbox.height };
  } catch {
    return null;
  }
}
