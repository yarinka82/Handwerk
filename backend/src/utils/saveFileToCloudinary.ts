import cloudinary from 'cloudinary';
import fs from 'node:fs/promises';
import { configHandwerk } from '../configHandwerk';
import createHttpError from 'http-errors';

cloudinary.v2.config({
  secure: true,
  cloud_name: configHandwerk.cloudinary.name,
  api_key: configHandwerk.cloudinary.key,
  api_secret: configHandwerk.cloudinary.secret,
});

export const saveFileToCloudinary = async (file: Express.Multer.File) => {
  try {
    if (!file?.path) {
      throw createHttpError(400, 'File path is missing');
    }
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';

    const response = await cloudinary.v2.uploader.upload(file.path, {
      folder: 'master_docs',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      resource_type: resourceType,
    });
    await fs.unlink(file.path).catch(() => {});
    return { secure_url: response.secure_url, public_id: response.public_id };
  } catch (error) {
    if (file?.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    throw createHttpError(500, 'File upload to Cloudinary failed', {
      cause: error,
    });
  }
};
