import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

export default function MemberUpdateProfile() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState(""); // BASE64 image

  const [loading, setLoading] = useState(true);

  // Load current profile
  const loadProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setMatric(data.matric || "");
        setFaculty(data.faculty || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setPhoto(data.photo || "");
      }
    } catch (err) {
      console.log("Error loading profile:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      base64: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      const base64Img = result.assets[0].base64;
      setPhoto(`data:image/jpeg;base64,${base64Img}`);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!name || !matric || !faculty || !phone) {
      return Alert.alert("Error", "Please fill in all fields.");
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const ref = doc(db, "users", currentUser.uid);

      await updateDoc(ref, {
        name,
        matric,
        faculty,
        phone,
        photo, // save base64 photo
      });

      Alert.alert("Success", "Profile updated.");
      router.push("/memberProfile");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile</Text>
        <View style={{ width: 26 }}></View>
      </View>

      {/* Profile Image */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Image
          source={
            photo
              ? { uri: photo }
              : require("@/assets/images/cutie.jpg") // <--- Replace with your default avatar
          }
          style={styles.profileImage}
        />

        <TouchableOpacity style={styles.changeImgBtn} onPress={pickImage}>
          <Text style={styles.changeImgText}>Change Profile Picture</Text>
        </TouchableOpacity>
      </View>

      {/* Update Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Full Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Faculty:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your faculty"
          value={faculty}
          onChangeText={setFaculty}
        />

        <Text style={styles.label}>Email:</Text>
        <TextInput
            style={[styles.input, { backgroundColor: "#d6d6d6" }]}
            value={email}
            editable={false}
        />

        <Text style={styles.label}>Phone Number:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 25,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ddd",
  },
  changeImgBtn: {
    marginTop: 10,
    backgroundColor: "#B02020",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  changeImgText: {
    color: "white",
    fontWeight: "600",
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#B02020',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
