import { VerificationType } from '@prisma/client';
import { BaseOrder, BaseUser, Channel, MessageType } from '../types/types';
import createHttpError from 'http-errors';
import { sendVerificationEmail } from '../service/confirm';
import { createVerificationToken } from './createVerificationToken';
import { findUserChannel } from './findUserChannel';

export const isInfoMessage = (type: MessageType) => {
  if (typeof type === 'object' && type.type === 'INFO') return true;
};

export const definishnChannelMessage = async ({
  user,
  type,
  order,
  inputData,
  channel,
  value,
  requestId,
}: {
  user: BaseUser;
  type: MessageType;
  order?: BaseOrder;
  inputData?: string;
  channel?: Channel;
  value?: string;
  requestId?: string;
}) => {
  let preferredChannel;

  if (channel) {
    preferredChannel = channel;
  } else {
    preferredChannel = findUserChannel(user);
  }

  const currentValue = value ? value : user[preferredChannel as keyof BaseUser];

  if (!currentValue || typeof currentValue !== 'string')
    throw createHttpError(404, 'Not found available channel value');

  let token;
  let code;

  if (!isInfoMessage(type)) {
    const result = await createVerificationToken({
      channel: preferredChannel as Channel,
      value: currentValue,
      type: type as VerificationType,
      ...(order ? { order } : {}),
      ...(inputData ? { inputData } : {}),
      ...(requestId ? { requestId } : {}),
    });
    token = result.token;
    code = result.code;
  }

  const isNotPhoneChannel = true;

  if (preferredChannel === 'email' || isNotPhoneChannel) {
    await sendVerificationEmail({
      user,
      type,
      ...(order ? { order } : {}),
      ...(token ? { token } : {}),
      ...(code ? { code } : {}),
    });
  } else if (preferredChannel === 'phone') {
    //
    //
    //
    console.log(
      `[SMS STUB] Sending SMS code to ${user.phone}. Code flow type: ${type}`,
    );
  } else if (preferredChannel === 'telegramId') {
    //
    //
    //
    console.log(
      `[TELEGRAM STUB] Sending message to TG ID ${(user as BaseUser).telegramId}. Type: ${type}`,
    );
  }

  // if (isInfoMessage(type) && order?.customerId) {
  //   await sendPushNotification({
  //     customerId: order.customerId,
  //     masterId: order.masterId,
  //     event: type.event,
  //     orderId: type.orderId,
  //   });
  // }
};
