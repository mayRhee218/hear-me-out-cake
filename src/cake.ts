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

const starterLayout: TopperLayout = {
  flag: { width: 70, height: 63, border: 4, radius: 12 },
  positions: [
    { x: 0.5, y: 0.173, targetX: 0.5, targetY: 0.397, tilt: -4 },
    { x: 0.416, y: 0.315, targetX: 0.416, targetY: 0.487, tilt: -7 },
    { x: 0.584, y: 0.315, targetX: 0.584, targetY: 0.487, tilt: 5 },
    { x: 0.334, y: 0.214, targetX: 0.334, targetY: 0.418, tilt: -7 },
    { x: 0.666, y: 0.214, targetX: 0.666, targetY: 0.418, tilt: 8 },
    { x: 0.255, y: 0.342, targetX: 0.255, targetY: 0.443, tilt: -9 },
    { x: 0.745, y: 0.342, targetX: 0.745, targetY: 0.443, tilt: 8 },
  ],
};

const fullLayout: TopperLayout = {
  flag: { width: 52, height: 44, border: 3, radius: 9 },
  // Stagger card heights and pin the sticks to different parts of the cake's top.
  // Slot order fills the center and both sides before filling the gaps.
  positions: [
    { x: 0.505, y: 0.06, targetX: 0.50, targetY: 0.378, tilt: -3 },
    { x: 0.396, y: 0.369, targetX: 0.397, targetY: 0.494, tilt: -6 },
    { x: 0.632, y: 0.386, targetX: 0.627, targetY: 0.492, tilt: 5 },
    { x: 0.365, y: 0.166, targetX: 0.369, targetY: 0.415, tilt: -6 },
    { x: 0.638, y: 0.169, targetX: 0.629, targetY: 0.415, tilt: 3 },
    { x: 0.219, y: 0.313, targetX: 0.265, targetY: 0.455, tilt: -8 },
    { x: 0.779, y: 0.321, targetX: 0.738, targetY: 0.459, tilt: 8 },
    { x: 0.515, y: 0.366, targetX: 0.514, targetY: 0.503, tilt: 4 },
    { x: 0.487, y: 0.159, targetX: 0.491, targetY: 0.408, tilt: 4 },
    { x: 0.337, y: 0.277, targetX: 0.351, targetY: 0.454, tilt: -4 },
    { x: 0.602, y: 0.28, targetX: 0.611, targetY: 0.454, tilt: -5 },
    { x: 0.46, y: 0.263, targetX: 0.464, targetY: 0.453, tilt: 3 },
    { x: 0.278, y: 0.097, targetX: 0.291, targetY: 0.397, tilt: -7 },
    { x: 0.729, y: 0.103, targetX: 0.711, targetY: 0.4, tilt: 9 },
    { x: 0.218, y: 0.202, targetX: 0.259, targetY: 0.434, tilt: -9 },
    { x: 0.775, y: 0.211, targetX: 0.741, targetY: 0.444, tilt: 6 },
    { x: 0.287, y: 0.394, targetX: 0.306, targetY: 0.473, tilt: -7 },
    { x: 0.716, y: 0.407, targetX: 0.685, targetY: 0.483, tilt: 6 },
    { x: 0.391, y: 0.072, targetX: 0.397, targetY: 0.38, tilt: 3 },
    { x: 0.618, y: 0.076, targetX: 0.611, targetY: 0.374, tilt: 5 },
  ],
};

export const TOPPER_COUNT = fullLayout.positions.length;

export function getTopperLayout(occupiedExtent: number): TopperLayout {
  return occupiedExtent <= starterLayout.positions.length ? starterLayout : fullLayout;
}

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

  const occupiedExtent = photos.reduce((extent, photo, index) => photo ? index + 1 : extent, 0);
  const layout = getTopperLayout(occupiedExtent);
  const toppers = await Promise.all(layout.positions.map(async (position, index) => {
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
  for (const { position, flag } of visibleToppers) drawFlag(context, position, flag, layout.flag);
  return canvas;
}
