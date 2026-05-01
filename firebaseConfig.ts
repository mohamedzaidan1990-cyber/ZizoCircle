import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-6U5Ovr2kBFkB9ykwrVCQg5moCpwG2b4",
  authDomain: "zizo-circle.firebaseapp.com",
  projectId: "zizo-circle",
  storageBucket: "zizo-circle.firebasestorage.app",
  messagingSenderId: "936433858949",
  appId: "1:936433858949:web:33e98af758dc0816c2acec",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;