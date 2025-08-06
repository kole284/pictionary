import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC0xN6RbwK9yfWlaCStD1GGANvNVoXtlYI",
  authDomain: "pictionary-b38c4.firebaseapp.com",
  databaseURL: "https://pictionary-b38c4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pictionary-b38c4",
  storageBucket: "pictionary-b38c4.appspot.com",
  messagingSenderId: "313679665716",
  appId: "1:313679665716:web:f11e6716def207fed34861",
  measurementId: "G-P1LF41WCB2"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const analytics = getAnalytics(app);