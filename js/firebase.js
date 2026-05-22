import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCwJnSquU8mo6SOz7oV5zw-YMR_R493XH4",
  authDomain:        "taskflow-e1878.firebaseapp.com",
  projectId:         "taskflow-e1878",
  databaseURL:       "https://taskflow-e1878-default-rtdb.firebaseio.com",
  storageBucket:     "taskflow-e1878.firebasestorage.app",
  messagingSenderId: "50694115772",
  appId:             "1:50694115772:web:3a703b3d9602eab9d91bb9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);
