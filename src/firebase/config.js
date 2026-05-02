import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA8QyydQ7WkDutntp9yFXSiMAVH27xj9Z0",
  authDomain: "gerenciador-de-frequenci-cad59.firebaseapp.com",
  projectId: "gerenciador-de-frequenci-cad59",
  storageBucket: "gerenciador-de-frequenci-cad59.firebasestorage.app",
  messagingSenderId: "903172218182",
  appId: "1:903172218182:web:b8ce5928b988424da3d947"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);