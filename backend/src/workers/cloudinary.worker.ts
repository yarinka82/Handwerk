import { Job, Worker } from 'bullmq';
import { redisConnection } from '../utils/redis.js';
import { v2 as cloudinary } from 'cloudinary';

export const cloudinaryWorker = new Worker(
  'cloudinary',
  async (job: Job) => {
    if (job.name === 'delete-file') {
      const [publicId, resourceType] = job.data;
      console.log(`[Worker] start deleted file ${publicId} from cloudinary`);

      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      console.log(
        `[Worker] file ${publicId} successfully deleted from cloudinary`,
      );
    }
  },
  { connection: redisConnection },
);
