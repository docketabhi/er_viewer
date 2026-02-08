/**
 * PDF export utilities for Mermaid diagrams.
 *
 * Provides functionality to export rendered SVG diagrams as PDF documents
 * using jsPDF. Handles page sizing, orientation, and maintains diagram quality.
 *
 * @module lib/export/exportPdf
 */

import {
  exportSvgToString,
  sanitizeFilename,
  getSvgDimensions,
  type ExportSvgOptions,
} from './exportSvg';

/**
 * Page orientation options for PDF export.
 */
export type PdfOrientation = 'portrait' | 'landscape';

/**
 * Page format options for PDF export.
 */
export type PdfFormat = 'a4' | 'a3' | 'letter' | 'legal' | 'auto';

/**
 * Options for PDF export.
 */
export interface ExportPdfOptions extends ExportSvgOptions {
  /** Page orientation (default: auto-detect based on diagram dimensions) */
  orientation?: PdfOrientation;
  /** Page format (default: auto - fits diagram) */
  format?: PdfFormat;
  /** Scale factor for the diagram (default: 1) */
  scale?: number;
  /** Margin around the diagram in mm (default: 10) */
  margin?: number;
  /** Whether to fit diagram to page (default: true) */
  fitToPage?: boolean;
  /** Document title for PDF metadata */
  title?: string;
}

/**
 * Result of PDF export operation.
 */
export interface ExportPdfResult {
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
  /** The filename used for download */
  filename?: string;
  /** The PDF blob (if not downloading) */
  blob?: Blob;
  /** The exported page dimensions in mm */
  pageDimensions?: { width: number; height: number };
}

/**
 * Default PDF export options.
 */
const DEFAULT_PDF_OPTIONS: Required<Omit<ExportPdfOptions, keyof ExportSvgOptions>> = {
  orientation: 'portrait',
  format: 'auto',
  scale: 1,
  margin: 10,
  fitToPage: true,
  title: '',
};

/**
 * Standard page sizes in mm (width x height in portrait orientation).
 */
const PAGE_SIZES: Record<Exclude<PdfFormat, 'auto'>, [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
};

/**
 * Converts pixels to millimeters at 96 DPI.
 */
function pxToMm(px: number): number {
  return (px * 25.4) / 96;
}

/**
 * Converts an SVG string to a PNG data URL using canvas.
 * This is needed because jsPDF works better with raster images for complex SVGs.
 *
 * @param svgString - The SVG string to convert
 * @param width - The width of the output image
 * @param height - The height of the output image
 * @param scale - Scale factor for quality
 * @returns Promise resolving to PNG data URL
 */
async function svgToPngDataUrl(
  svgString: string,
  width: number,
  height: number,
  scale: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas 2D context'));
      return;
    }

    // Set canvas dimensions with scale factor for better quality
    const scaledWidth = Math.ceil(width * scale);
    const scaledHeight = Math.ceil(height * scale);
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // Scale the context for high-quality rendering
    ctx.scale(scale, scale);

    // Create a blob URL from the SVG string
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to draw image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };

    img.src = url;
  });
}

/**
 * Dynamically imports jsPDF to keep it out of the main bundle.
 */
async function getJsPdf(): Promise<typeof import('jspdf')> {
  const jspdfModule = await import('jspdf');
  return jspdfModule;
}

/**
 * Calculates optimal page dimensions for a diagram.
 *
 * @param diagramWidth - Diagram width in pixels
 * @param diagramHeight - Diagram height in pixels
 * @param options - PDF options
 * @returns Page dimensions and orientation
 */
function calculatePageDimensions(
  diagramWidth: number,
  diagramHeight: number,
  options: Required<Omit<ExportPdfOptions, keyof ExportSvgOptions>>
): { width: number; height: number; orientation: PdfOrientation } {
  const diagramWidthMm = pxToMm(diagramWidth);
  const diagramHeightMm = pxToMm(diagramHeight);
  const margin = options.margin;

  if (options.format === 'auto') {
    // Create a page that fits the diagram plus margins
    const width = diagramWidthMm + margin * 2;
    const height = diagramHeightMm + margin * 2;
    const orientation: PdfOrientation = width > height ? 'landscape' : 'portrait';
    return { width, height, orientation };
  }

  // Use specified format
  const [formatWidth, formatHeight] = PAGE_SIZES[options.format];

  // Determine orientation
  let orientation = options.orientation;
  if (options.fitToPage) {
    // Auto-detect orientation based on diagram aspect ratio
    const diagramAspect = diagramWidthMm / diagramHeightMm;
    const pageAspect = formatWidth / formatHeight;
    orientation = diagramAspect > pageAspect ? 'landscape' : 'portrait';
  }

  const width = orientation === 'landscape' ? formatHeight : formatWidth;
  const height = orientation === 'landscape' ? formatWidth : formatHeight;

  return { width, height, orientation };
}

/**
 * Exports an SVG element as a PDF file.
 *
 * Converts the SVG to a high-quality PNG and embeds it in a PDF document.
 * Supports auto-sizing, standard page formats, and custom margins.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Promise resolving to the result of the export operation
 *
 * @example
 * ```tsx
 * const svgElement = document.querySelector('svg');
 * const result = await exportPdf(svgElement, {
 *   filename: 'my-diagram',
 *   format: 'a4',
 *   orientation: 'landscape',
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
export async function exportPdf(
  svg: SVGSVGElement | null,
  options: ExportPdfOptions = {}
): Promise<ExportPdfResult> {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    // Merge options with defaults
    const pdfOptions: Required<Omit<ExportPdfOptions, keyof ExportSvgOptions>> = {
      orientation: options.orientation ?? DEFAULT_PDF_OPTIONS.orientation,
      format: options.format ?? DEFAULT_PDF_OPTIONS.format,
      scale: options.scale ?? DEFAULT_PDF_OPTIONS.scale,
      margin: options.margin ?? DEFAULT_PDF_OPTIONS.margin,
      fitToPage: options.fitToPage ?? DEFAULT_PDF_OPTIONS.fitToPage,
      title: options.title ?? DEFAULT_PDF_OPTIONS.title,
    };

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
    const diagramWidth = dimensions.width + padding * 2;
    const diagramHeight = dimensions.height + padding * 2;

    // Convert SVG to PNG data URL for better PDF rendering
    // Use scale of 3 for high-quality print output
    const pngDataUrl = await svgToPngDataUrl(
      svgResult.svgString,
      diagramWidth,
      diagramHeight,
      3
    );

    // Calculate page dimensions
    const pageDims = calculatePageDimensions(diagramWidth, diagramHeight, pdfOptions);

    // Dynamically import jsPDF
    const { jsPDF } = await getJsPdf();

    // Create PDF document
    const pdf = new jsPDF({
      orientation: pageDims.orientation,
      unit: 'mm',
      format: pdfOptions.format === 'auto'
        ? [pageDims.width, pageDims.height]
        : pdfOptions.format,
    });

    // Set document properties
    const docTitle = pdfOptions.title || options.filename || 'diagram';
    pdf.setProperties({
      title: docTitle,
      creator: 'ER Viewer',
    });

    // Calculate image placement
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = pdfOptions.margin;

    // Available space for the diagram
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    // Convert diagram dimensions to mm
    const diagramWidthMm = pxToMm(diagramWidth) * pdfOptions.scale;
    const diagramHeightMm = pxToMm(diagramHeight) * pdfOptions.scale;

    // Calculate scale to fit if needed
    let finalWidth = diagramWidthMm;
    let finalHeight = diagramHeightMm;

    if (pdfOptions.fitToPage && pdfOptions.format !== 'auto') {
      const scaleX = availableWidth / diagramWidthMm;
      const scaleY = availableHeight / diagramHeightMm;
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

      finalWidth = diagramWidthMm * fitScale;
      finalHeight = diagramHeightMm * fitScale;
    }

    // Center the diagram on the page
    const x = margin + (availableWidth - finalWidth) / 2;
    const y = margin + (availableHeight - finalHeight) / 2;

    // Add the image to the PDF
    pdf.addImage(
      pngDataUrl,
      'PNG',
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      'FAST'
    );

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(options.filename || 'diagram');
    const fullFilename = `${sanitizedFilename}.pdf`;

    // Save the PDF (triggers download)
    pdf.save(fullFilename);

    return {
      success: true,
      filename: fullFilename,
      pageDimensions: {
        width: pageWidth,
        height: pageHeight,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF export',
    };
  }
}

/**
 * Exports an SVG element to a PDF blob without downloading.
 *
 * @param svg - The SVG element to export
 * @param options - Export options
 * @returns Promise resolving to result containing the PDF blob
 *
 * @example
 * ```tsx
 * const result = await exportPdfToBlob(svgElement, { format: 'a4' });
 * if (result.success && result.blob) {
 *   // Use blob for upload or other purposes
 *   const url = URL.createObjectURL(result.blob);
 * }
 * ```
 */
export async function exportPdfToBlob(
  svg: SVGSVGElement | null,
  options: ExportPdfOptions = {}
): Promise<ExportPdfResult> {
  if (!svg) {
    return {
      success: false,
      error: 'No SVG element provided',
    };
  }

  try {
    // Merge options with defaults
    const pdfOptions: Required<Omit<ExportPdfOptions, keyof ExportSvgOptions>> = {
      orientation: options.orientation ?? DEFAULT_PDF_OPTIONS.orientation,
      format: options.format ?? DEFAULT_PDF_OPTIONS.format,
      scale: options.scale ?? DEFAULT_PDF_OPTIONS.scale,
      margin: options.margin ?? DEFAULT_PDF_OPTIONS.margin,
      fitToPage: options.fitToPage ?? DEFAULT_PDF_OPTIONS.fitToPage,
      title: options.title ?? DEFAULT_PDF_OPTIONS.title,
    };

    // Get SVG as string
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

    const padding = options.padding ?? 20;
    const diagramWidth = dimensions.width + padding * 2;
    const diagramHeight = dimensions.height + padding * 2;

    // Convert SVG to PNG
    const pngDataUrl = await svgToPngDataUrl(
      svgResult.svgString,
      diagramWidth,
      diagramHeight,
      3
    );

    // Calculate page dimensions
    const pageDims = calculatePageDimensions(diagramWidth, diagramHeight, pdfOptions);

    // Dynamically import jsPDF
    const { jsPDF } = await getJsPdf();

    // Create PDF
    const pdf = new jsPDF({
      orientation: pageDims.orientation,
      unit: 'mm',
      format: pdfOptions.format === 'auto'
        ? [pageDims.width, pageDims.height]
        : pdfOptions.format,
    });

    // Set document properties
    const docTitle = pdfOptions.title || options.filename || 'diagram';
    pdf.setProperties({
      title: docTitle,
      creator: 'ER Viewer',
    });

    // Calculate image placement
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = pdfOptions.margin;

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const diagramWidthMm = pxToMm(diagramWidth) * pdfOptions.scale;
    const diagramHeightMm = pxToMm(diagramHeight) * pdfOptions.scale;

    let finalWidth = diagramWidthMm;
    let finalHeight = diagramHeightMm;

    if (pdfOptions.fitToPage && pdfOptions.format !== 'auto') {
      const scaleX = availableWidth / diagramWidthMm;
      const scaleY = availableHeight / diagramHeightMm;
      const fitScale = Math.min(scaleX, scaleY, 1);

      finalWidth = diagramWidthMm * fitScale;
      finalHeight = diagramHeightMm * fitScale;
    }

    const x = margin + (availableWidth - finalWidth) / 2;
    const y = margin + (availableHeight - finalHeight) / 2;

    pdf.addImage(
      pngDataUrl,
      'PNG',
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      'FAST'
    );

    // Get blob
    const blob = pdf.output('blob');

    return {
      success: true,
      blob,
      pageDimensions: {
        width: pageWidth,
        height: pageHeight,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF export',
    };
  }
}
