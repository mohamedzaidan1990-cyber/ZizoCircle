// Firebase waitlist client for the Zizo Circle marketing site.
// Writes signups to the `waitlist` Firestore collection in the same
// `zizo-circle` project the app uses.
//
// Security: see ../firestore.rules — anonymous create-only with
// shape validation. The Web API key is public by design; access is
// controlled by rules, not the key.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC-6U5Ovr2kBFkB9ykwrVCQg5moCpwG2b4',
  authDomain: 'zizo-circle.firebaseapp.com',
  projectId: 'zizo-circle',
  storageBucket: 'zizo-circle.firebasestorage.app',
  messagingSenderId: '936433858949',
  appId: '1:936433858949:web:33e98af758dc0816c2acec',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist({ email, lang = 'en', source = 'landing' }) {
  const cleaned = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleaned) || cleaned.length > 200) {
    throw new Error('invalid-email');
  }
  return addDoc(collection(db, 'waitlist'), {
    email: cleaned,
    lang,
    source,
    userAgent: (navigator.userAgent || '').slice(0, 200),
    referrer: document.referrer || null,
    createdAt: serverTimestamp(),
  });
}

// Wire up a <form> with an <input type="email"> and <button>.
// Shows inline loading + error state, then redirects to /thank-you.html.
export function wireWaitlistForm(form, { lang = 'en', source = 'landing' } = {}) {
  if (!form) return;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  if (!input || !button) return;

  const labels = lang === 'ar'
    ? { submitting: 'جاري التسجيل…', invalid: 'بريد غير صحيح', failed: 'حدث خطأ، حاول مرة أخرى' }
    : { submitting: 'Joining…', invalid: 'Please enter a valid email', failed: 'Something went wrong — try again' };

  const originalLabel = button.textContent;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    button.textContent = labels.submitting;

    try {
      await joinWaitlist({ email: input.value, lang, source });
      const params = new URLSearchParams({ lang, email: input.value.trim().toLowerCase() });
      const target = lang === 'ar' ? '../thank-you.html' : 'thank-you.html';
      location.href = `${target}?${params.toString()}`;
    } catch (err) {
      console.error('[waitlist]', err);
      button.disabled = false;
      button.textContent = err.message === 'invalid-email' ? labels.invalid : labels.failed;
      setTimeout(() => { button.textContent = originalLabel; }, 3000);
    }
  });
}
