import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from "expo-router";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword,sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);


  // Handle Firebase login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    try {
      // Firebase login
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      // Check if email is verified
    if (!user.emailVerified) {
      Alert.alert(
        "Email Not Verified",
        "Please verify your email before logging in.\n\nCheck your inbox or spam folder."
      );
      return;
    }

    // Fetch user role
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      Alert.alert("Error", "User data not found in Firestore.");
      return;
    }

    const userData = userSnap.data();
    const role = userData.role?.toLowerCase();

    if (role === "member") router.push("/(member)/home");
    else if (role === "staff") router.push("/(staff)/home");
    else if (role === "admin") router.push("/(admin)/home");
    else Alert.alert("Error", "Invalid role assigned to this account.");
  } catch (err: any) {
    console.log("Login error:", err.code);

  if (err.code === "auth/user-not-found") {
    Alert.alert("Login Failed", "Email not found.");
    return;
  }

  if (err.code === "auth/wrong-password") {
    Alert.alert("Login Failed", "Wrong password.");
    return;
  }

  Alert.alert("Login Failed", "Invalid email or password.");
}
};

  return (
    <View style={styles.container}>
      <Text style={styles.signInTitle}>SIGN IN</Text>
      <View style={styles.inputContainer}>
         <Text style={styles.label}>Email:</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            placeholder="Enter your password"
            placeholderTextColor="#aaa"
          />

  <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
    <Ionicons
      name={passwordVisible ? "eye" : "eye-off"}
      size={22}
      color="#555"
      style={{ marginRight: 10 }}
    />
  </TouchableOpacity>
</View>
</View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>LOGIN</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Haven’t registered?{' '}
        <Text style={styles.link} onPress={() => router.push('/signup')}>
          Tap here to sign up
        </Text>
      </Text>
      <Text style={[styles.link, { marginTop: 8 }]} onPress={() => router.push('/forgotPassword')}>
          Forgot Password
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B02020',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  signInTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: 'white',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    color: 'black',
  },
  passwordContainer: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "white",
  borderRadius: 10,
  paddingRight: 10,
},

passwordInput: {
  flex: 1,
  padding: 10,
  color: "black",
},

  loginButton: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 40,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#B02020',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerText: {
    color: 'white',
    marginTop: 20,
  },
  link: {
    color: '#FFD700',
    textDecorationLine: 'underline',
  },
});
