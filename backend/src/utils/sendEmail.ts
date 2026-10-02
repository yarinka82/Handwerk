import { Resend } from 'resend';
import { configHandwerk } from '../configHandwerk';
import { resendQueue } from '../queues/resend.queue';

export const resend = new Resend(configHandwerk.resendApiKey);

const DEFAULT_FROM = configHandwerk.smtpFrom;

interface SendMailParams {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

// export async function sendEmail({
//   from = DEFAULT_FROM,
//   to,
//   subject,
//   html,
// }: SendMailParams) {
//   try {
//     const { data, error } = await resend.emails.send({
//       from,
//       to,
//       subject,
//       html,
//     });

//     if (error) {
//       console.error('Error Resend Api: ', error.message);
//       return { success: false, error };
//     }

//     return { success: true, id: data.id };
//   } catch (error) {
//     console.log(error);
//     return { success: false, error };
//   }
// }

export async function sendEmail({
  from = DEFAULT_FROM,
  to,
  subject,
  html,
}: SendMailParams) {
  await resendQueue.add('send-email', { from, to, subject, html });
}
