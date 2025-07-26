// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "kisan-copilot",
  "appId": "1:304093674904:web:6e1069f3911b39441effed",
  "storageBucket": "kisan-copilot.firebasestorage.app",
  "apiKey": "AIzaSyDBWDY7Fg0hoaT_5xeKn5vtYDRkGA6CGXc",
  "authDomain": "kisan-copilot.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "304093674904"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
