import { Stack } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Delay splash screen redirect by 2 seconds
      setTimeout(async () => {
        if (user) {
          if (!user.emailVerified) {
            // Email not verified → go to login
            router.replace("/login");
            return;
          }

          try {
            // Fetch role from Firestore
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
              router.replace("/login");
              return;
            }

            const role = userSnap.data().role?.toLowerCase();

            // Redirect based on role
            if (role === "member") router.replace("/(member)/home");
            else if (role === "staff") router.replace("/(staff)/home");
            else if (role === "admin") router.replace("/(admin)/home");
            else router.replace("/login");
          } catch (error) {
            console.log("Error fetching user role:", error);
            router.replace("/login");
          }
        } else {
          // Not logged in → go to login
          router.replace("/login");
        }
      }, 2000); // 2-second delay
    });

    return () => unsubscribe();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
