self.onmessage = async ({ data: bitmap }: MessageEvent<ImageBitmap>) => {
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) {
      self.postMessage(null);
      return;
    }

    context.drawImage(bitmap, 0, 0);
    const png = await canvas.convertToBlob({ type: 'image/png' });
    self.postMessage(png);
  } catch {
    self.postMessage(null);
  } finally {
    bitmap.close();
  }
};
