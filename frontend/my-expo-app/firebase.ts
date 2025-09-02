import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB0IGo_1gUi8l6hixXN4NI-iI9yOdg0zIQ",
  authDomain: "swipevibes-31667.firebaseapp.com",
  projectId: "swipevibes-31667",
  storageBucket: "swipevibes-31667.firebasestorage.app",
  messagingSenderId: "843665882662",
  appId: "1:843665882662:web:71168e8ac4b1c03c4730e7",
  measurementId: "G-VRZN199B4Q"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);