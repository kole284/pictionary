// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0xN6RbwK9yfWlaCStD1GGANvNVoXtlYI",
  authDomain: "pictionary-b38c4.firebaseapp.com",
  projectId: "pictionary-b38c4",
  storageBucket: "pictionary-b38c4.firebasestorage.app",
  messagingSenderId: "313679665716",
  appId: "1:313679665716:web:f11e6716def207fed34861",
  measurementId: "G-P1LF41WCB2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);