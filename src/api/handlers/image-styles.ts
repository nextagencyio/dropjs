import * as path from 'node:path';
import * as fs from 'node:fs';
import sharp from 'sharp';
import { getUploadsDir } from './files.js';

export interface ImageStyleConfig {
  width: number;
  height: number;
  fit: keyof sharp.FitEnum;
}

const IMAGE_STYLES: Record<string, ImageStyleConfig> = {
  thumbnail: { width: 150, height: 150, fit: 'cover' },
  medium: { width: 480, height: 480, fit: 'inside' },
  large: { width: 1024, height: 1024, fit: 'inside' },
};

export async function generateImageStyle(
  originalPath: string,
  style: string
): Promise<string> {
  const config = IMAGE_STYLES[style];
  if (!config) {
    throw new Error(`Unknown image style: ${style}`);
  }

  const uploadsDir = getUploadsDir();
  const relative = path.relative(uploadsDir, originalPath);
  const outputPath = path.resolve(uploadsDir, 'styles', style, relative);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await sharp(originalPath)
    .resize(config.width, config.height, { fit: config.fit, withoutEnlargement: true })
    .toFile(outputPath);

  return outputPath;
}

export async function generateAllStyles(originalPath: string): Promise<void> {
  for (const style of Object.keys(IMAGE_STYLES)) {
    await generateImageStyle(originalPath, style);
  }
}
