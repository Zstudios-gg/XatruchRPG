import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyApcXkpenbsGTJmQRP7Nm036EvE7-ZeOZQ",
  authDomain: "xatruchrpg.firebaseapp.com",
  projectId: "xatruchrpg",
  storageBucket: "xatruchrpg.firebasestorage.app",
  messagingSenderId: "401804955301",
  appId: "1:401804955301:web:e18833d2387cb66c69874c"
}

const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const db       = getFirestore(app)
export const provider = new GoogleAuthProvider()