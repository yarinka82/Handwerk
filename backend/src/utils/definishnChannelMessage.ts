import {
  BaseOrder,
  BaseUser,
  Channel,
  InfoMessage,
  MessageType,
} from '../types/types';
import createHttpError from 'http-errors';
import { sendVerificationEmail } from '../service/confirm';
import {
  CreateVerificationToken,
  createVerificationToken,
} from './createVerificationToken';
import { findUserChannel } from './findUserChannel';
import { sendPushNotification } from './sendPushNotification';

export const isInfoMessage = (type: MessageType): type is InfoMessage => {
  return typeof type === 'object' && type.type === 'INFO';
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
  order?: BaseOrder | Omit<BaseOrder, 'customerId'>;
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

  if (isInfoMessage(type)) {
    if (order && 'customerId' in order && order.customerId) {
      await sendPushNotification({
        customerId: order.customerId,
        masterId: order.masterId,
        event: type.event,
        ...(type.orderId ? { orderId: type.orderId } : {}),
      });
    }
  }

  if (!isInfoMessage(type)) {
    const result = await createVerificationToken({
      ...(user.id ? { userId: user.id } : {}),
      ...(preferredChannel ? { channel: preferredChannel as Channel } : {}),
      ...(currentValue ? { value: currentValue } : {}),
      type,
      ...(order ? { order } : {}),
      ...(inputData ? { inputData } : {}),
      ...(requestId ? { requestId } : {}),
    } as CreateVerificationToken);

    token = result.token;
    code = result.code;
  }

  const isNotPhoneChannel = true;

  if (preferredChannel === 'email' || isNotPhoneChannel) {
    let email;

    if (type === 'EMAIL_CHANGE') {
      email = currentValue;
    }

    await sendVerificationEmail({
      user,
      type,
      ...(email ? { email } : {}),
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
};
