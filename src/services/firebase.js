// src/services/firebase.js
// Firebase Admin SDK — initializes once and exports sendNotification helper

const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return;

  try {
    // Option A: Use FIREBASE_SERVICE_ACCOUNT_JSON env var (recommended for Render)
    // Set this env var to the entire JSON content of your serviceAccountKey.json
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log('✅ Firebase Admin initialized');
    } else {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
    }
  } catch (err) {
    console.error('❌ Firebase Admin init error:', err.message);
  }
}

/**
 * Send a push notification to a single device.
 * Silently ignores errors so a bad FCM token never crashes the app.
 *
 * @param {string} fcmToken   - Recipient device token
 * @param {string} title      - Notification title
 * @param {string} body       - Notification body
 * @param {object} data       - Extra key-value data sent to the app
 */
async function sendNotification(fcmToken, title, body, data = {}) {
  if (!initialized || !fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'chat_messages' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
  } catch (err) {
    // Token invalid / app uninstalled — not a fatal error
    console.warn('[FCM] Failed to send notification:', err.message);
  }
}

module.exports = { initFirebase, sendNotification };
