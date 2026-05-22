import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();
let currentTab = "login";

getRedirectResult(auth).catch((err) => console.error("Redirect error:", err.code));

window.switchTab = function(tab) {
  currentTab = tab;
  document.getElementById("tab-login").classList.toggle("active",  tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("name-field").classList.toggle("hidden", tab === "login");
  document.getElementById("auth-submit").textContent = tab === "login" ? "Login" : "Create Account";
  document.getElementById("auth-error").classList.add("hidden");
};

window.handleAuth = async function(e) {
  e.preventDefault();
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const name     = document.getElementById("auth-name").value.trim();
  document.getElementById("auth-error").classList.add("hidden");
  try {
    if (currentTab === "signup") {
      if (!name) { showErr("auth-error", "Please enter your name."); return; }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) { showErr("auth-error", friendly(err.code)); }
};

window.loginWithGoogle = async function() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (["auth/popup-blocked","auth/popup-closed-by-user","auth/cancelled-popup-request"].includes(err.code)) {
      await signInWithRedirect(auth, provider);
    } else {
      showErr("auth-error", friendly(err.code));
    }
  }
};

window.logout = () => signOut(auth);

window.saveName = function() {
  const val = document.getElementById("nickname-input").value.trim();
  if (!val) { showErr("name-error", "Please enter a name."); return; }
  localStorage.setItem(`nickname_${auth.currentUser.uid}`, val);
  launchApp(val);
};

function launchApp(nickname) {
  ["auth-screen","name-screen","add-screen"].forEach(id =>
    document.getElementById(id).classList.remove("active"));
  document.getElementById("app-screen").classList.add("active");
  document.getElementById("user-greeting").textContent = `Hey, ${nickname} 👋`;
  window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: { uid: auth.currentUser.uid } }));
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    const nick = localStorage.getItem(`nickname_${user.uid}`);
    if (!nick) {
      document.getElementById("auth-screen").classList.remove("active");
      document.getElementById("name-screen").classList.add("active");
    } else {
      launchApp(nick);
    }
  } else {
    document.getElementById("auth-screen").classList.add("active");
    ["name-screen","app-screen","add-screen"].forEach(id =>
      document.getElementById(id).classList.remove("active"));
    window.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}

function friendly(code) {
  return ({
    "auth/email-already-in-use": "Email already registered. Try logging in.",
    "auth/invalid-email":         "Invalid email address.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/user-not-found":        "No account found. Sign up first.",
    "auth/wrong-password":        "Wrong password. Try again.",
    "auth/invalid-credential":    "Wrong email or password.",
    "auth/too-many-requests":     "Too many attempts. Wait and retry.",
    "auth/popup-closed-by-user":  "Google sign-in cancelled.",
  }[code] || "Something went wrong. Try again.");
}
