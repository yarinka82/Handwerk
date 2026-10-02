import { cloudinaryDeleteQueue } from '../queues/cloudinary.queue';

export const deleteFileFromCloudinary = async (
  publicId: string,
  mimeType: string,
) => {
  const isImage = mimeType.startsWith('image');
  const resourceType = isImage ? 'image' : 'raw';

  await cloudinaryDeleteQueue.add('delete-file', { publicId, resourceType });
};

