export const CONFIG = Object.freeze({
  /**
   * OCR (Optical Character Recognition) related configuration
   */
  OCR: Object.freeze({
    /**
     * Minimum confidence threshold for OCR text recognition (0-100)
     * Lower values = more permissive (may include uncertain text)
     * Higher values = more strict (only high-confidence text)
     * @range 0-100
     */
    CONFIDENCE_THRESHOLD: 30,

    /**
     * Page segmentation mode for Tesseract OCR
     * Determines how Tesseract analyzes the page layout
     * @options
     * - "6": Uniform block of text
     * - "7": Single text line
     * - "8": Single word
     * - "13": Raw line (treat image as single text line, bypassing hacks)
     */
    PAGE_SEG_MODE: '8',

    /**
     * OCR engine mode for Tesseract
     * Controls which OCR engine to use
     * @options
     * - "0": Legacy engine only
     * - "1": Neural nets LSTM engine only (recommended)
     * - "2": Legacy + LSTM engines
     * - "3": Default based on what's available
     */
    ENGINE_MODE: '1',

    /**
     * Base delay (in milliseconds) between retry attempts
     * Actual delay increases exponentially: baseDelay * (2 ^ attemptNumber)
     * @unit milliseconds
     */
    RETRY_DELAY: 1000,

    /**
     * Confidence threshold below which words are considered "low confidence"
     * Used for analytics and quality reporting
     * @range 0-100
     */
    LOW_CONFIDENCE_THRESHOLD: 70
  }),

  /**
   * PDF generation and output configuration
   */
  PDF: Object.freeze({
    /**
     * Image format for embedding images in PDF
     * JPEG provides smaller file sizes, PNG provides better quality
     * @default "JPEG"
     * @options "JPEG" | "PNG" | "WEBP"
     */
    IMAGE_FORMAT: 'JPEG' as const,

    /**
     * Image quality when converting to the specified format (0-1)
     * Higher values = better quality but larger file size
     * @range 0-1
     */
    IMAGE_QUALITY: 1,

    /**
     * Enable PDF compression to reduce file size
     */
    COMPRESSION: true,

    /**
     * Color for page numbers in generated PDFs
     * @format CSS color (hex, rgb, named)
     */
    PAGE_NUMBER_COLOR: '#999'
  }),

  /**
   * Performance optimization settings
   */
  PERFORMANCE: Object.freeze({
    /**
     * Maximum retry attempts for any performance-critical operation
     * @range 1-10
     */
    MAX_RETRIES: 3,

    /**
     * Number of pages to process before triggering garbage collection
     * Helps prevent memory buildup during large document processing
     * @range 1-20
     */
    BATCH_SIZE: 5,

    /**
     * Interval (in milliseconds) for automatic memory cleanup
     * Triggers garbage collection and cache cleanup
     * @unit milliseconds
     */
    MEMORY_CLEANUP_INTERVAL: 5000,

    /**
     * Enable OffscreenCanvas for better performance in web workers
     * Note: In web worker contexts, OffscreenCanvas is the only option
     * as document.createElement is not available
     * @default true
     */
    ENABLE_OFFSCREEN_CANVAS: true
  }),

  /**
   * User interface and user experience settings
   */
  UI: Object.freeze({
    /**
     * Minimum interval (in milliseconds) between progress updates
     * Prevents UI spam during rapid progress changes
     * @default 100
     * @unit milliseconds
     */
    PROGRESS_UPDATE_INTERVAL: 100,

    /**
     * Duration (in milliseconds) for CSS transitions and animations
     * Provides consistent animation timing across the application
     * @default 300
     * @unit milliseconds
     */
    ANIMATION_DURATION: 300,

    /**
     * Debounce delay (in milliseconds) for user input and events
     * Prevents excessive function calls during rapid user interactions
     * @default 300
     * @unit milliseconds
     */
    DEBOUNCE_DELAY: 300
  })
} as const)

export type ConfigType = typeof CONFIG

/**
 * OCR processing settings interface
 * Allows partial override of default OCR configuration
 */
export interface OCRSettings {
  /**
   * Override for OCR_PARAMS.CONFIDENCE_THRESHOLD
   * @see CONFIG.OCR.CONFIDENCE_THRESHOLD
   */
  readonly confidenceThreshold?: number

  /**
   * Override for OCR_PARAMS.PAGE_SEG_MODE
   * @see CONFIG.OCR.PAGE_SEG_MODE
   */
  readonly pageSegMode?: string

  /**
   * Override for OCR_PARAMS.ENGINE_MODE
   * @see CONFIG.OCR.ENGINE_MODE
   */
  readonly engineMode?: string
}

/**
 * Processing stage definition for progress tracking
 * Each stage has a weight that determines its portion of total progress
 */
export interface ProcessingStage {
  /**
   * Human-readable name of the processing stage
   */
  readonly name: string

  /**
   * Weight of this stage in overall progress (0-1)
   * All stage weights should sum to 1.0
   */
  readonly weight: number

  /**
   * Detailed description shown to users during processing
   */
  readonly description: string
}

/**
 * Predefined processing stages with their weights and descriptions
 * Used for granular progress reporting during document generation
 */
export const PROCESSING_STAGES = Object.freeze({
  /**
   * Initial setup phase
   * Includes worker initialization and basic preparation
   */
  SETUP: Object.freeze({
    weight: 0.1,
    name: 'Setup',
    description: 'Preparing document...'
  }),

  /**
   * Canvas processing phase
   * Includes HTML-to-canvas conversion and image preparation
   */
  CANVAS: Object.freeze({
    weight: 0.15,
    name: 'Canvas',
    description: 'Converting to canvas...'
  }),

  /**
   * OCR processing phase (heaviest workload)
   * Includes text recognition and analysis
   */
  OCR: Object.freeze({
    weight: 0.6,
    name: 'OCR',
    description: 'Processing text recognition...'
  }),

  /**
   * PDF generation phase
   * Includes final PDF assembly and output
   */
  PDF: Object.freeze({
    weight: 0.15,
    name: 'PDF',
    description: 'Generating PDF...'
  })
} as const)
