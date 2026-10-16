import { FirebaseError } from 'firebase-admin';
import { prisma } from '../prisma';
import { messaging } from './firebase';
import { Message } from 'firebase-admin/messaging';

type SendPushNotification = {
  customerId?: string;
  masterId?: string;
  event: string;
  orderId?: string;
};

export const getNotificationContent = (event: string, orderId?: string) => {
  switch (event) {
    case 'ORDER_CREATED':
      return {
        title: 'Neue Ordnung! 🛠️',
        body: `Neue Bestellung erstellt #${orderId?.slice(0, 6) ?? ''}. Zum Anzeigen klicken.`,
      };
    case 'ORDER_COMPLETED':
      return {
        title: 'Bestellung abgeschlossen!✅',
        body: `Bestellung  #${orderId?.slice(0, 6) ?? ''} erfolgreich abgeschlossen.`,
      };
    default:
      return {
        title: 'Aktualisierung auf Bestellung',
        body: `Der Status Ihrer Bestellung hat sich geändert.`,
      };
  }
};

export const sendPushNotification = async (payload: SendPushNotification) => {
  if (!messaging) {
    console.error('Firebase messaging not initialized');
    return;
  }

  const targetUserId = payload.customerId ?? payload.masterId;
  if (!targetUserId) return;

  const user = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      pushToken: true,
    },
  });

  if (!user || !user.pushToken) {
    console.log(`[Push Bypass] Current user ${targetUserId} not pushToken.`);
    return;
  }

  const { title, body } = getNotificationContent(
    payload.event,
    payload.orderId,
  );

  const message: Message = {
    token: user.pushToken,
    notification: {
      title,
      body,
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      orderId: payload.orderId ?? '',
      event: payload.event,
    },
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        channelId: 'hight_importance_channel',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await messaging.send(message);
    console.log('Successfully sent push message:', response);
  } catch (error: unknown) {
    const fbError = error as FirebaseError;
    if (fbError.code === 'messaging/registration-token-not-registered') {
      await prisma.user.update({
        where: {
          id: targetUserId,
        },
        data: {
          pushToken: null,
        },
      });
    } else {
      console.error('Error send push message');
    }
  }
};
