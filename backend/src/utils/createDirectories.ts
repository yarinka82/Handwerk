import fs from 'node:fs';
import { TEMP_UPLOAD_DIR, UPLOAD_DIR } from '../constants';

export const createDirectories = () => {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};
