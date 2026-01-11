import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; 

export default function EditUser() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // user id from route

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [faculty, setFaculty] = useState("");
  const [matric, setMatric] = useState("");

  // Fetch user data by ID
  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "users", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setFaculty(data.faculty || "");
          setMatric(data.matric || "");
        } else {
          Alert.alert("Error", "User not found.");
          router.back();
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    loadUser();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!name || !email || !faculty || !matric) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
    const docRef = doc(db, "users", id as string);
      await updateDoc(docRef, {
        name,
        email,
        phone: phone || null,
        faculty,
        matric,
      });
      Alert.alert("Success", "User updated successfully!");
      router.back();
    } catch (err) {
      console.error("Error updating user:", err);
      Alert.alert("Error", "Failed to update user. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit User</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Form */}
      <View style={styles.formWrapper}>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
        

          <Text style={styles.label}>Faculty</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter faculty"
            value={faculty}
            onChangeText={setFaculty}
          />

          <Text style={styles.label}>Matric No</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter matric number"
            value={matric}
            onChangeText={setMatric}
          />

          {/* Buttons */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    backgroundColor: "#B02020",
    paddingVertical: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },

  formWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  form: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  input: {
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    color: "#000",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 25,
  },
  saveButton: {
    backgroundColor: "#B02020",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
  cancelButton: {
    backgroundColor: "#3C3A3A",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
