import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { configHandwerk } from '../configHandwerk';

export let messaging: Messaging | null = null;

const projectId = configHandwerk.firebase.projectId;
const clientEmail = configHandwerk.firebase.clientEmail;
const privateKey = configHandwerk.firebase.privateKey;

if (projectId && clientEmail && privateKey) {
  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });

    messaging = getMessaging();
  } catch (error) {
    console.error("Firebase Admin initialization error:', error");
  }
} else {
  console.warn(
    'Firebase settings are missing in .env. Push notifications will not work!',
  );
}
