import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const signupUser = async (email: string, password: string, role: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    role,
  });

  return cred.user;
};

export const loginUser = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  const ref = doc(db, "users", cred.user.uid);
  const snap = await getDoc(ref);

  return {
    user: cred.user,
    role: snap.data()?.role || "member",
  };
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};
