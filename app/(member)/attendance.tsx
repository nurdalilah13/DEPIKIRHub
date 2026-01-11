import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

import { db } from "../../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";

export default function Attendance() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setCurrentUserData(userSnap.data());
        } else {
          Alert.alert("Error", "User data not found in database.");
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleQRScan = async ({ data }: any) => {
    if (!data) return;
    setScanned(true);

    if (!data.startsWith("ATT-")) {
      Alert.alert("Invalid QR", "This QR is not an attendance QR.");
      setScanned(false);
      return;
    }

    try {
      const q = query(
        collection(db, "attendanceRecords"),
        where("userId", "==", user?.uid),
        where("qrCode", "==", data)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        Alert.alert("Info", "You already scanned this QR.");
        setScanned(false);
        return;
      }

      await addDoc(collection(db, "attendanceRecords"), {
        userId: user?.uid,
        name: currentUserData?.name,
        faculty: currentUserData?.faculty,
        matric: currentUserData?.matric,
        qrCode: data,
        time: serverTimestamp(),
      });

      Alert.alert("Success", "Attendance recorded!");
    } catch (error) {
      console.error("Attendance recording error:", error);
      Alert.alert("Error", "Failed to record attendance.");
    }

    setTimeout(() => setScanned(false), 2000);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.qrButton}>
          <Text style={styles.qrButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentUserData) {
    return (
      <View style={styles.center}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleQRScan}
      />

      <View style={styles.overlay}>
        <Ionicons name="qr-code-outline" size={90} color="white" />
        <Text style={styles.scanText}>Scan Attendance QR</Text>
        <Text style={styles.userInfoText}>
          Logged in as: {currentUserData.name}
        </Text>

        <TouchableOpacity
          style={[styles.qrButton, { marginTop: 20 }]}
          onPress={() => router.push('/memberAttendance')}
        >
          <Ionicons name="eye-outline" size={20} color="white" />
          <Text style={styles.qrButtonText}>View My Attendance History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanText: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 10 },
  userInfoText: { color: "white", fontSize: 14, marginTop: 5 },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B02020",
    padding: 10,
    borderRadius: 8,
  },
  qrButtonText: { color: "white", fontWeight: "600", marginLeft: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
