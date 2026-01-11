import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert, // Added for error feedback
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase"; // Ensure paths are correct
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function LogoutPage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade-in effect when the screen mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500, // half a second fade
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.replace("/login");
      return;
    }

    try {
      // 1. Identify and delete documents
      const chatRef = collection(db, "chats");
      const q = query(chatRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit(); 
      }

      // 2. Instead of signOut, we just redirect
      // Using .replace ensures they can't 'back button' into the chat
      router.replace("/login"); 
      
    } catch (error) {
      console.error("Error during data cleanup:", error);
      // Even if cleanup fails, we redirect the user
      router.replace("/login");
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <Text style={styles.title}>See You Soon...</Text>

        <View style={styles.messageBox}>
          <Text style={styles.message}>You are about to logout.</Text>
          <Text style={styles.message}>Are you sure you want to logout?</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#B02020",
    borderRadius: 20,
    width: "80%",
    paddingVertical: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  messageBox: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    width: "85%",
    alignItems: "center",
    marginBottom: 20,
  },
  message: {
    color: "#000",
    textAlign: "center",
    fontSize: 15,
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%",
  },
  button: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#3C3A3A",
  },
  logoutButton: {
    backgroundColor: "white",
  },
  cancelText: {
    color: "white",
    fontWeight: "bold",
  },
  logoutText: {
    color: "#B02020",
    fontWeight: "bold",
  },
});
