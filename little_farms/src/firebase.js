// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl1SVibNfsh84hqK1YNF1NsyjVIf2n0bk",
  authDomain: "little-farms-3e5a7.firebaseapp.com",
  projectId: "little-farms-3e5a7",
  storageBucket: "little-farms-3e5a7.firebasestorage.app",
  messagingSenderId: "337943219537",
  appId: "1:337943219537:web:e00f8a693f6ef7234b5770",
  measurementId: "G-TCCR70KH5B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);