import fs from 'fs';
import path from 'path';

export function getFile (path: string) {
  return fs.readFileSync(path, 'utf-8');
}

export function writeOutputToFile (outFileName: string, code: string) {
  const outputDir = path.resolve('src', 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, outFileName);
  fs.writeFileSync(outputPath, code, 'utf-8');
}
