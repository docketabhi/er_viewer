/**
 * PNG export utilities for Mermaid diagrams.
 *
 * Provides functionality to export rendered SVG diagrams as PNG images
 * using HTML5 Canvas for conversion. Handles high-DPI displays and
 * maintains image quality.
 *
 * @module lib/export/exportPng
 */

import {
  exportSvgToString,
  sanitizeFilename,
  getSvgDimensions,
  type ExportSvgOptions,
} from './exportSvg';

/**
 * Options for PNG export.
 */
export interface ExportPngOptions extends ExportSvgOptions {
  /** Scale factor for high-DPI displays (default: 2 for retina) */
  scale?: number;
  /** Image quality for PNG compression (0-1, default: 1) */
  quality?: number;
}

/**
 * Result of PNG export operation.
 */
export interface ExportPngResult {
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
  /** The filename used for download */
  filename?: string;
  /** The PNG data URL (if not downloading) */
  dataUrl?: string;
  /** The exported dimensions */
  dimensions?: { width: number; height: number };
}

/**
 * Default PNG export options.
 */
const DEFAULT_PNG_OPTIONS: Required<Omit<ExportPngOptions, keyof ExportSvgOptions>> = {
  scale: 2,
  quality: 1,
};

/**
 * Converts an SVG string to a PNG data URL using canvas.
 *
 * @param svgString - The SVG string to convert
 * @param width - The width of the output image
 * @param height - The height of the output image
 * @param scale - Scale factor for high-DPI displays
 * @returns Promise resolving to PNG data URL
 */
async function svgToCanvas(
  svgString: string,
  width: number,
  height: number,
  scale: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas 2D context'));
      return;
    }

    // Set canvas dimensions with scale factor
    const scaledWidth = Math.ceil(width * scale);
    const scaledHeight = Math.ceil(height * scale);
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // Scale the context for high-DPI rendering
    ctx.scale(scale, scale);

    // Handle image load
    img.onload = () => {
      try {
        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      } catch (error) {
        reject(new Error(`Failed to draw image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG as image'));
    };

    // Create a blob URL from the SVG string
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;

    // Clean up blob URL after loading
    img.onload = function() {
      try {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to draw image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
  });
}

/**
 * Triggers a browser download for a canvas as PNG.
 *
 * @param canvas - The canvas element to download
 * @param filename - The filename for the download
 * @param quality - Image quality (0-1)
 */
function triggerCanvasDownload(canvas: HTMLCanvasElement, filename: string, quality: number): void {
  const dataUrl = canvas.toDataURL('image/png', quality);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports an SVG element as a PNG file.
 *
 * Converts the SVG to a canvas and then exports as PNG.
 * Supports high-DPI scaling for crisp images on retina displays.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Promise resolving to the result of the export operation
 *
 * @example
 * ```tsx
 * const svgElement = document.querySelector('svg');
 * const result = await exportPng(svgElement, {
 *   filename: 'my-diagram',
 *   scale: 2,
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
export async function exportPng(
  svg: SVGSVGElement | null,
  options: ExportPngOptions = {}
): Promise<ExportPngResult> {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    // Merge options with defaults
    const scale = options.scale ?? DEFAULT_PNG_OPTIONS.scale;
    const quality = options.quality ?? DEFAULT_PNG_OPTIONS.quality;

    // Get SVG as string using existing utility
    const svgResult = exportSvgToString(svg, options);
    if (!svgResult.success || !svgResult.svgString) {
      return {
        success: false,
        error: svgResult.error || 'Failed to serialize SVG',
      };
    }

    // Get dimensions
    const dimensions = getSvgDimensions(svg);
    if (!dimensions) {
      return {
        success: false,
        error: 'Could not determine SVG dimensions',
      };
    }

    // Add padding to dimensions if specified
    const padding = options.padding ?? 20;
    const width = dimensions.width + padding * 2;
    const height = dimensions.height + padding * 2;

    // Convert to canvas
    const canvas = await svgToCanvas(svgResult.svgString, width, height, scale);

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(options.filename || 'diagram');
    const fullFilename = `${sanitizedFilename}.png`;

    // Trigger download
    triggerCanvasDownload(canvas, fullFilename, quality);

    return {
      success: true,
      filename: fullFilename,
      dimensions: {
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PNG export',
    };
  }
}

/**
 * Exports an SVG element to a PNG data URL without downloading.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Promise resolving to result containing the data URL
 *
 * @example
 * ```tsx
 * const result = await exportPngToDataUrl(svgElement, { scale: 2 });
 * if (result.success && result.dataUrl) {
 *   // Use as image src or for other purposes
 *   img.src = result.dataUrl;
 * }
 * ```
 */
export async function exportPngToDataUrl(
  svg: SVGSVGElement | null,
  options: ExportPngOptions = {}
): Promise<ExportPngResult> {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    const scale = options.scale ?? DEFAULT_PNG_OPTIONS.scale;
    const quality = options.quality ?? DEFAULT_PNG_OPTIONS.quality;

    const svgResult = exportSvgToString(svg, options);
    if (!svgResult.success || !svgResult.svgString) {
      return {
        success: false,
        error: svgResult.error || 'Failed to serialize SVG',
      };
    }

    const dimensions = getSvgDimensions(svg);
    if (!dimensions) {
      return {
        success: false,
        error: 'Could not determine SVG dimensions',
      };
    }

    const padding = options.padding ?? 20;
    const width = dimensions.width + padding * 2;
    const height = dimensions.height + padding * 2;

    const canvas = await svgToCanvas(svgResult.svgString, width, height, scale);
    const dataUrl = canvas.toDataURL('image/png', quality);

    return {
      success: true,
      dataUrl,
      dimensions: {
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PNG export',
    };
  }
}
