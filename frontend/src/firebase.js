import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyBaVy7snQW0L-Rr-Tet3hrfd4f5V4A2tR8',
  authDomain: 'wordday-fire.firebaseapp.com',
  projectId: 'wordday-fire',
  storageBucket: 'wordday-fire.firebasestorage.app',
  messagingSenderId: '586335381962',
  appId: '1:586335381962:web:721ce9e5ea7cb6142bc733',
  measurementId: 'G-GHBF54GP8K',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
