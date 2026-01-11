import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function MemberProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  
    // Fetch user data from Firestore
     const loadProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProfile(snap.data());
      }
    } catch (err) {
      console.log("Error loading profile:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B02020" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back + Logout */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(member)/home")}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => router.push('/logout')}>
          <Ionicons name="log-out-outline" size={26} color="#B02020" />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Image
          source={
            profile.photo
              ? { uri: profile.photo }
              : require("@/assets/images/cutie.jpg") // <-- your fallback image
          }
          style={styles.profileImage}
        />
         <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{profile.role}</Text>
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={20} color="#B02020" />
          <Text style={styles.infoText}>Matric No: {profile.matric}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={20} color="#B02020" />
          <Text style={styles.infoText}>Faculty: {profile.faculty}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color="#B02020" />
          <Text style={styles.infoText}>Email: {profile.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color="#B02020" />
          <Text style={styles.infoText}>Phone: {profile.phone}</Text>
        </View>
      </View>
 
      {/* Update Button */}
      <TouchableOpacity style={styles.updateButton} onPress={() => router.push('/memberUpdateProfile')}>
        <Text style={styles.updateText}>Update Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => router.push('/resetPassword')}
      >
        <Text style={styles.resetText}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: 50,
    alignItems: 'center',
  },
  loadingContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#fff",
},
  header: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 30,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EEE',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#222',
  },
  role: {
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  updateButton: {
    marginTop: 30,
    backgroundColor: '#B02020',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 60,
    elevation: 3,
  },
  updateText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
   resetButton: {
    marginTop: 15,
    backgroundColor: 'white',
    borderColor: '#B02020',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 50,
  },
  resetText: {
    color: '#B02020',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
