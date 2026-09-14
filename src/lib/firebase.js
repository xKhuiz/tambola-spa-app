import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHYDE3szxnGHJiEmSrQg_ZQ20bXwWefag",
  authDomain: "tao-housie.firebaseapp.com",
  projectId: "tao-housie",
  storageBucket: "tao-housie.firebasestorage.app",
  messagingSenderId: "504061161518",
  appId: "1:504061161518:web:214ab5d711cb6a2048afbf",
  measurementId: "G-W1S5NBLPRZ",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
