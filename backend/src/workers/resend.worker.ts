import { Job, Worker } from 'bullmq';
import { redisConnection } from '../utils/redis';
import { resend } from '../utils/sendEmail';

export const resendWorker = new Worker(
  'resend',
  async (job: Job) => {
    if (job.name === 'send-email') {
      const {from, to, subject, html } = job.data;
      console.log(`[Worker] start send email ${subject} to ${to} from cloudinary`);

     await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

      console.log(
        `[Worker] send email  ${subject} to ${to} successfully `,
      );
    }
  },
  { connection: redisConnection },
);
