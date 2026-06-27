import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIKnIinkq6FjHUVkCcrSOx95lmlLxLtk8",
  authDomain: "gerenciador-de-frequenci-e3fde.firebaseapp.com",
  projectId: "gerenciador-de-frequenci-e3fde",
  storageBucket: "gerenciador-de-frequenci-e3fde.firebasestorage.app",
  messagingSenderId: "475509498143",
  appId: "1:475509498143:web:898d146ed2f0437f67102a"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
