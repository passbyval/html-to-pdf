export {}

declare global {
  interface RendererContextSettings2D {
    /**
     * A boolean value that indicates if the canvas contains an alpha channel. If set to false, the browser now knows that the backdrop is always opaque, which can speed up drawing of transparent content and images.
     */
    alpha?: boolean
    /**
     * Specifies the color space of the rendering context. Possible values are:
     *   - `srgb` selects the sRGB color space. This is the default value.
     *   - `display-p3` selects the display-p3 color space.
     */
    colorSpace?: 'srgb' | 'display-p3'
    /**
     * Specifies the color type of the rendering context. Possible values are:
     *   - `unorm8` sets the color channels to 8 bit unsigned values. This is the default value.
     *   - `float16` sets the color channels to 16-bit floating-point values.
     */
    colorType?: 'unorm8' | 'float16'
    /**
     * A boolean value that hints the user agent to reduce the latency by desynchronizing the canvas paint cycle from the event loop.
     */
    desynchronized?: boolean
    /**
     * A boolean value that indicates whether or not a lot of read-back operations are planned. This will force the use of a software (instead of hardware accelerated) 2D canvas and can save memory when calling {@link CanvasImageData.getImageData getImageData()} frequently.
     */
    willReadFrequently?: boolean
  }

  interface RendererContextSettingsBitmap {
    /**
     * A boolean value that indicates if the canvas contains an alpha channel. If set to false, the browser now knows that the backdrop is always opaque, which can speed up drawing of transparent content and images.
     */
    alpha?: boolean
  }

  interface HTMLCanvasElement {
    getContext(
      contextId: '2d',
      options?: RendererContextSettings2D
    ): CanvasRenderingContext2D | null

    getContext(
      contextId: 'bitmaprenderer',
      options?: RendererContextSettingsBitmap
    ): ImageBitmapRenderingContext | null

    getContext(contextId: string, options?: any): RenderingContext | null
  }

  interface OffscreenCanvas {
    getContext(
      contextId: '2d',
      options?: RendererContextSettings2D
    ): OffscreenCanvasRenderingContext2D | null

    getContext(
      contextId: 'bitmaprenderer',
      options?: RendererContextSettingsBitmap
    ): ImageBitmapRenderingContext | null

    getContext(contextId: string, options?: any): RenderingContext | null
  }
}
