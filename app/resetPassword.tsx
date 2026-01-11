import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from "../firebase";
import { updatePassword } from "firebase/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in both fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character.'
      );
    }

    // Get current user
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "No user is logged in.");
      return;
    }

    try {
      await updatePassword(user, password);
      Alert.alert("Success", "Password updated successfully!");
      router.back();
    } catch (error: any) {
      console.log("Password update error:", error);

      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Login Required",
          "Please log in again to update your password."
        );
        router.push("/login");
      } else {
        Alert.alert("Failed", "Could not update password.");
      }
    }
  };


  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        Create a new password. Make sure it differs from previous ones for security.
      </Text>

      <Text style={styles.label}>Password:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your new password"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Confirm password:</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter password"
        placeholderTextColor="#666"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
        <Text style={styles.buttonText}>Update Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 6,
  },
  subtitle: {
    color: '#555',
    marginBottom: 25,
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 20,
    color: '#000',
  },
  button: {
    backgroundColor: '#B02020',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
