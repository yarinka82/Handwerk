import { Prisma, VerificationType } from '@prisma/client';
import { configHandwerk } from '../configHandwerk';
import { buildTemplate } from '../utils/buildTemplate';
import { sendEmail } from '../utils/sendEmail';
import { verificationConfig } from '../utils/verificationConfig';
import { BaseOrder, BaseUser, MessageType } from '../types/types';
import createHttpError from 'http-errors';
import { isInfoMessage } from '../utils/definishnChannelMessage';

export type OrderWithRelations = Prisma.OrderGetPayload<{
  select: {
    id: true;
    description: true;
    customer: { select: { id: true } };
    master: {
      select: {
        id: true;
        speciality: true;
        user: { select: { id: true; name: true } };
      };
    };
  };
}>;

const subjectByType: Record<VerificationType, string> = {
  REGISTER: 'Wellcom',
  LOGIN: 'Der Code ist für den Zugriff auf das Konto bestimmt',
  EMAIL_CONFIRM: 'Bestätigen Sie Ihre E-Mail-Adresse',
  PASSWORD_CHANGE: 'Anfrage zur Passwortänderung',
  PASSWORD_RESET: 'Anfrage zum Zurücksetzen Ihres Kontopassworts',
  REQUEST_CONFIRM: 'Bestätigung Ihrer Anfrage',
  ORDER_CONFIRM: 'Bestätigung Ihrer Bestellung',
  PHONE_CONFIRM: 'Bitte um Änderung der Telefonnummer',
};

export const sendVerificationEmail = async ({
  user,
  type,
  order,
  token,
  code,
}: {
  user: BaseUser;
  type: MessageType;
  order?: BaseOrder;
  token?: string;
  code?: string;
}) => {
  const expires = 15;

  if (!user.email) throw createHttpError(400, 'For send email to be required');
  let config;

  if (!isInfoMessage(type)) {
    config = verificationConfig[type as VerificationType];
  }
  const link = config?.useLink
    ? `${configHandwerk.domain}/confirm?token=${token}`
    : undefined;

  const html = await buildTemplate({
    templateSource: 'confirm-email.html',
    user,
    ...(link ? { link } : {}),
    expires,
    type,
    ...(order ? order : {}),
    ...(code ? { code } : {}),
  });

  const subject = subjectByType[type as VerificationType];

  await sendEmail({
    to: user.email,
    subject,
    html,
  });
};
