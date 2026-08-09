import { useEffect, useState } from 'react';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

type Status = 'checking' | 'ready' | 'requesting' | 'success' | 'ios' | 'unsupported' | 'denied' | 'error';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

let firebaseApp: FirebaseApp | undefined;

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = getApps().find((app) => app.name === '[DEFAULT]') ||
      (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
  }
  return firebaseApp;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function NotificationOptIn() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let active = true;

    async function checkSupport() {
      if (isIosDevice() && !isInstalledPwa()) {
        setStatus('ios');
        return;
      }

      const supported = 'Notification' in window && 'serviceWorker' in navigator &&
        'PushManager' in window && await isSupported().catch(() => false);
      if (active) setStatus(supported ? 'ready' : 'unsupported');
    }

    checkSupport();
    return () => { active = false; };
  }, []);

  async function enableNotifications() {
    setStatus('requesting');

    try {
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'ready');
        return;
      }

      const configEntries = Object.entries(firebaseConfig);
      if (configEntries.some(([, value]) => !value) || !import.meta.env.PUBLIC_FIREBASE_VAPID_KEY) {
        throw new Error('Firebase no está configurado');
      }

      const registrationUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
      Object.entries(firebaseConfig).forEach(([key, value]) => registrationUrl.searchParams.set(key, value));
      const registration = await navigator.serviceWorker.register(registrationUrl.toString(), { scope: '/' });
      const messaging = getMessaging(getFirebaseApp());
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) throw new Error('No se obtuvo un token de notificaciones');

      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token, platform: 'web' })
      });
      if (!response.ok) throw new Error('No se pudo registrar el dispositivo');
      setStatus('success');
    } catch (error) {
      console.error('Notification opt-in failed', error);
      setStatus('error');
    }
  }

  if (status === 'checking' || status === 'unsupported') return null;

  const messages: Record<Exclude<Status, 'checking' | 'unsupported'>, string> = {
    ready: 'Recibe avisos cuando haya novedades sísmicas importantes.',
    requesting: 'Activando las notificaciones en este dispositivo...',
    success: 'Las notificaciones sísmicas están activadas en este dispositivo.',
    ios: 'En iPhone, instala Telurify en la pantalla de inicio para activar las notificaciones.',
    denied: 'Las notificaciones están bloqueadas. Actívalas desde la configuración del navegador.',
    error: 'No pudimos activar las notificaciones. Comprueba la configuración e inténtalo de nuevo.'
  };
  const canEnable = status === 'ready' || status === 'error';

  return (
    <section className="tf-card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Alertas sísmicas</h2>
        <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', fontWeight: 500, margin: 0 }}>{messages[status]}</p>
      </div>
      {canEnable && <button type="button" className="tf-button-primary" onClick={enableNotifications}>Activar alertas</button>}
    </section>
  );
}
