import PngWorker from './png.worker?worker&inline';

export type CakePhoto = {
  name: string;
  source: string;
};

const MAX_PHOTO_EDGE = 720;
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function isHeif(file: File): Promise<boolean> {
  if (/\.hei[cf]$/i.test(file.name) || /^image\/hei[cf](?:-sequence)?$/i.test(file.type)) {
    return true;
  }

  const header = await file.slice(0, 128).arrayBuffer();
  if (header.byteLength < 16) return false;

  // An ISO Base Media File starts with an ftyp box containing its format brands.
  const box = new DataView(header);
  const brands = new TextDecoder('windows-1252').decode(new Uint8Array(header));
  if (brands.slice(4, 8) !== 'ftyp') return false;

  const majorBrand = brands.slice(8, 12);
  if (majorBrand === 'avif' || majorBrand === 'avis') return false;
  if (HEIF_BRANDS.has(majorBrand)) return true;

  const end = Math.min(box.getUint32(0), header.byteLength);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    if (HEIF_BRANDS.has(brands.slice(offset, offset + 4))) return true;
  }
  return false;
}

async function decodeNativeImage(file: File, source: string): Promise<HTMLImageElement | ImageBitmap> {
  try {
    return await loadImage(source);
  } catch {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    throw new Error('Image decoding is unavailable.');
  }
}

async function decodeImage(file: File, source: string): Promise<HTMLImageElement | ImageBitmap> {
  try {
    return await decodeNativeImage(file, source);
  } catch {
    if (!(await isHeif(file))) {
      throw new Error('This photo couldn’t be opened. Try another image, such as a JPEG or PNG.');
    }
  }

  try {
    const { heicTo } = await import('heic-to/csp');
    const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
    const jpegUrl = URL.createObjectURL(jpeg);
    try {
      return await loadImage(jpegUrl);
    } finally {
      URL.revokeObjectURL(jpegUrl);
    }
  } catch {
    throw new Error('This HEIC photo couldn’t be opened. Try a JPEG or PNG copy.');
  }
}

export async function preparePhoto(file: File): Promise<CakePhoto> {
  if (!file.size) {
    throw new Error('This photo is empty. Choose another image.');
  }

  const objectUrl = URL.createObjectURL(file);
  let image: HTMLImageElement | ImageBitmap | undefined;

  try {
    image = await decodeImage(file, objectUrl);
    const width = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const height = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!width || !height) {
      throw new Error('The image has no visible pixels.');
    }

    const ratio = Math.min(1, MAX_PHOTO_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Image resizing is unavailable.');
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const source = canvas.toDataURL('image/jpeg', 0.88);
    if (source === 'data:,') {
      throw new Error('The resized image could not be saved.');
    }

    return { name: file.name || 'Photo', source };
  } finally {
    if (image && 'close' in image) {
      image.close();
    }
    URL.revokeObjectURL(objectUrl);
  }
}

async function encodePngInWorker(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const bitmap = await createImageBitmap(canvas);
  try {
    const worker = new PngWorker();
    try {
      return await new Promise<Blob | null>((resolve) => {
        worker.onmessage = ({ data }) => resolve(data instanceof Blob ? data : null);
        worker.onmessageerror = () => resolve(null);
        worker.onerror = (event) => {
          event.preventDefault();
          resolve(null);
        };
        worker.postMessage(bitmap, [bitmap]);
      });
    } finally {
      worker.terminate();
    }
  } finally {
    bitmap.close();
  }
}

export async function downloadCake(canvas: HTMLCanvasElement): Promise<void> {
  let png: Blob | null = null;
  if (window.parent !== window && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function') {
    try {
      // HTML canvas encoding can be delayed while a framed document waits for idle time.
      png = await encodePngInWorker(canvas);
    } catch {
      // Use the standard encoder when the browser cannot start the inline worker.
    }
  }

  png ??= await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!png) {
    throw new Error('The cake image couldn’t be saved.');
  }

  const objectUrl = URL.createObjectURL(png);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'hear-me-out-cake.png';
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }
}
