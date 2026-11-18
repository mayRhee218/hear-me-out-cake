import type { CakePhoto } from './photos';

export const FROSTINGS = [
  { id: 'lavender', name: 'Lavender', swatch: '#c8a8eb', color: [211, 177, 219] },
  { id: 'strawberry', name: 'Strawberry', swatch: '#f1aac6', color: [242, 174, 198] },
  { id: 'vanilla', name: 'Vanilla', swatch: '#f2d798', color: [236, 211, 157] },
  { id: 'mint', name: 'Mint', swatch: '#aad8c1', color: [162, 209, 183] },
  { id: 'sky', name: 'Sky', swatch: '#a6ccec', color: [161, 196, 230] },
  { id: 'peach', name: 'Peach', swatch: '#f5bea7', color: [245, 186, 158] },
] as const;

export type Frosting = (typeof FROSTINGS)[number];

export const CAKE_SCENE = { width: 684, height: 536 };

type TopperPosition = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  tilt: number;
};

type FlagDimensions = { width: number; height: number; border: number; radius: number };
type TopperLayout = { positions: readonly TopperPosition[]; flag: FlagDimensions };

export const TOPPER_LAYOUT: TopperLayout = {
  flag: { width: 64, height: 54, border: 3.5, radius: 10 },
  positions: [
    // Fill the top first, beginning with the center and moving outward.
    { x: 0.5, y: 0.318, targetX: 0.5, targetY: 0.472, tilt: -3 },
    { x: 0.319, y: 0.216, targetX: 0.36, targetY: 0.427, tilt: -6 },
    { x: 0.681, y: 0.217, targetX: 0.64, targetY: 0.427, tilt: 5 },
    { x: 0.368, y: 0.331, targetX: 0.388, targetY: 0.481, tilt: -5 },
    { x: 0.631, y: 0.334, targetX: 0.618, targetY: 0.481, tilt: 6 },
    { x: 0.502, y: 0.072, targetX: 0.501, targetY: 0.376, tilt: 2 },
    { x: 0.352, y: 0.093, targetX: 0.368, targetY: 0.393, tilt: -7 },
    { x: 0.648, y: 0.094, targetX: 0.638, targetY: 0.392, tilt: 6 },
    { x: 0.498, y: 0.197, targetX: 0.5, targetY: 0.423, tilt: -2 },
    // Side sticks end in the buttercream, above the plate and stand.
    { x: 0.132, y: 0.427, targetX: 0.25, targetY: 0.469, tilt: -9 },
    { x: 0.871, y: 0.426, targetX: 0.751, targetY: 0.47, tilt: 7 },
    { x: 0.107, y: 0.545, targetX: 0.258, targetY: 0.549, tilt: -5 },
    { x: 0.891, y: 0.545, targetX: 0.742, targetY: 0.55, tilt: 6 },
    { x: 0.127, y: 0.674, targetX: 0.249, targetY: 0.643, tilt: 6 },
    { x: 0.868, y: 0.674, targetX: 0.751, targetY: 0.646, tilt: -5 },
  ],
};

export const TOPPER_COUNT = TOPPER_LAYOUT.positions.length;

const CAKE_BOUNDS = { x: 0.205, y: 0.29, width: 0.59, height: 0.64 };
const STAGE_COLOR = '#f3edf9';
const FROSTING_LIGHTNESS = 186;

type CakeTextures = {
  original: ImageData;
  recent: Map<Frosting['id'], HTMLCanvasElement>;
};

const textures = new WeakMap<HTMLImageElement, CakeTextures>();

function getTextures(image: HTMLImageElement): CakeTextures {
  const existing = textures.get(image);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Cake colors are unavailable in this browser.');

  context.drawImage(image, 0, 0);
  const result = {
    original: context.getImageData(0, 0, canvas.width, canvas.height),
    recent: new Map<Frosting['id'], HTMLCanvasElement>(),
  };
  textures.set(image, result);
  return result;
}

function tintCake(image: HTMLImageElement, frosting: Frosting): CanvasImageSource {
  if (frosting.id === 'lavender') return image;

  const { original, recent } = getTextures(image);
  const existing = recent.get(frosting.id);
  if (existing) {
    recent.delete(frosting.id);
    recent.set(frosting.id, existing);
    return existing;
  }

  const { width, height } = original;
  const fresh = new ImageData(new Uint8ClampedArray(original.data), width, height);
  const pixels = fresh.data;
  const [frostingRed, frostingGreen, frostingBlue] = frosting.color;

  for (let index = 0; index < pixels.length; index += 4) {
    if (!pixels[index + 3]) continue;

    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const chroma = Math.max(red, blue) - green;
    if (green >= Math.min(red, blue) || chroma <= 7) continue;

    // The frosting is violet, between the pink rosettes and neutral stand in hue.
    // A soft mask preserves their edges and the frosting's original light and texture.
    const hue = blue >= red ? 4 + (red - green) / chroma : 6 - (blue - green) / chroma;
    const edge = Math.min(1, (hue - 4.54) / 0.16, (5.46 - hue) / 0.22, (chroma - 7) / 10);
    if (edge <= 0) continue;

    const lightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const shade = lightness - FROSTING_LIGHTNESS;
    pixels[index] = red + (frostingRed + shade - red) * edge;
    pixels[index + 1] = green + (frostingGreen + shade - green) * edge;
    pixels[index + 2] = blue + (frostingBlue + shade - blue) * edge;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return image;

  context.putImageData(fresh, 0, 0);
  // Keep recent switches immediate without retaining a full-size texture per color.
  if (recent.size >= 2) {
    const oldest = recent.keys().next().value;
    if (oldest) recent.delete(oldest);
  }
  recent.set(frosting.id, canvas);
  return canvas;
}

function drawCakeArt(context: CanvasRenderingContext2D, image: HTMLImageElement, frosting: Frosting) {
  const { width, height } = CAKE_SCENE;

  context.save();
  context.translate(width / 2, height * 0.921);
  context.scale(1, 0.15);
  const shadow = context.createRadialGradient(0, 0, 8, 0, 0, 147);
  shadow.addColorStop(0, 'rgba(66, 36, 93, 0.23)');
  shadow.addColorStop(0.55, 'rgba(66, 36, 93, 0.09)');
  shadow.addColorStop(1, 'rgba(66, 36, 93, 0)');
  context.fillStyle = shadow;
  context.fillRect(-147, -147, 294, 294);
  context.restore();

  context.imageSmoothingQuality = 'high';
  context.drawImage(
    tintCake(image, frosting),
    CAKE_BOUNDS.x * width,
    CAKE_BOUNDS.y * height,
    CAKE_BOUNDS.width * width,
    CAKE_BOUNDS.height * height,
  );
}

export function drawCake(canvas: HTMLCanvasElement, image: HTMLImageElement, frosting: Frosting): void {
  const context = canvas.getContext('2d');
  if (!context || !image.naturalWidth) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / CAKE_SCENE.width, canvas.height / CAKE_SCENE.height);
  drawCakeArt(context, image, frosting);
  context.restore();
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawStick(context: CanvasRenderingContext2D, position: TopperPosition) {
  const x = position.x * CAKE_SCENE.width;
  const top = position.y * CAKE_SCENE.height;
  const targetX = position.targetX * CAKE_SCENE.width;
  const bottom = position.targetY * CAKE_SCENE.height;

  context.fillStyle = 'rgba(87, 48, 72, 0.2)';
  context.beginPath();
  context.ellipse(targetX + 0.7, bottom, 5.4, 2, -0.15, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(x, top);
  context.rotate(Math.atan2(x - targetX, bottom - top));
  const stick = context.createLinearGradient(-2, 0, 2, 0);
  stick.addColorStop(0, '#a98465');
  stick.addColorStop(0.36, '#edd4ad');
  stick.addColorStop(0.68, '#fff4d9');
  stick.addColorStop(1, '#c49c77');

  context.fillStyle = stick;
  roundedRect(context, -1.8, 0, 3.6, Math.hypot(x - targetX, bottom - top), 1.8);
  context.fill();
  context.restore();
}

function drawFlag(
  context: CanvasRenderingContext2D,
  position: TopperPosition,
  photo: HTMLImageElement,
  { width, height, border, radius }: FlagDimensions,
) {
  const cropWidth = width - border * 2;
  const cropHeight = height - border * 2;
  const zoom = Math.max(cropWidth / photo.naturalWidth, cropHeight / photo.naturalHeight);
  const imageWidth = photo.naturalWidth * zoom;
  const imageHeight = photo.naturalHeight * zoom;

  context.save();
  context.translate(position.x * CAKE_SCENE.width, position.y * CAKE_SCENE.height);
  context.rotate(position.tilt * Math.PI / 180);
  context.shadowColor = 'rgba(59, 30, 84, 0.34)';
  context.shadowBlur = 13;
  context.shadowOffsetY = 5;
  context.fillStyle = '#fffdfc';
  roundedRect(context, -width / 2, -height / 2, width, height, radius);
  context.fill();
  context.shadowColor = 'transparent';
  roundedRect(context, -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight, radius - border);
  context.clip();
  context.drawImage(photo, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
  context.restore();
}

export async function renderCakeExport(
  image: HTMLImageElement,
  frosting: Frosting,
  photos: readonly (CakePhoto | null)[],
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const { width, height } = CAKE_SCENE;
  canvas.width = width * 2;
  canvas.height = height * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Cake downloads are unavailable in this browser.');

  const toppers = await Promise.all(TOPPER_LAYOUT.positions.map(async (position, index) => {
    const photo = photos[index];
    if (!photo) return null;

    const flag = new Image();
    flag.src = photo.source;
    await flag.decode();
    return { position, flag };
  }));
  const visibleToppers = toppers.filter((topper) => topper !== null)
    .sort((first, second) => first.position.targetY - second.position.targetY);

  context.scale(2, 2);
  context.fillStyle = STAGE_COLOR;
  context.fillRect(0, 0, width, height);
  drawCakeArt(context, image, frosting);
  for (const { position } of visibleToppers) drawStick(context, position);
  for (const { position, flag } of visibleToppers) drawFlag(context, position, flag, TOPPER_LAYOUT.flag);
  return canvas;
}
