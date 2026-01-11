import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Menu, Button, Provider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword,sendEmailVerification  } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";


export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [matric, setMatric] = useState('');
  const [faculty, setFaculty] = useState('');
  const [role, setRole] = useState('Member');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);


  const handleRegister = async () => {
    try {
      // Basic field validation
      if (!email || !password) {
        return Alert.alert('Error', 'Email, and password are required.');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return Alert.alert('Invalid Email', 'Please enter a valid email address.');
      }

      // Password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return Alert.alert(
          'Weak Password',
          'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.'
        );
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // REGISTER USER in Firebase
       await setDoc(doc(db, "users", uid), {
        name,
        matric,
        faculty,
        phone,
        role,
        email,
      });

      await sendEmailVerification(userCred.user);

      Alert.alert("Verify Your Email",
      "A verification link has been sent to your email. Please verify before logging in.");
      router.push('/login');

    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to register user.');
    }
  };

  return (
    <Provider>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>REGISTER</Text>

        <TextInput
          placeholder="Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Email Address"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordContainer}>
  <TextInput
    placeholder="Password"
    secureTextEntry={!showConfirm}
    style={styles.passwordInput}
    value={password}
    onChangeText={setPassword}
  />

  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
    <Ionicons
      name={showConfirm ? "eye" : "eye-off"}
      size={22}
      color="#555"
      style={{ marginRight: 15 }}
    />
  </TouchableOpacity>
</View>
        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          placeholder="Matric Number"
          style={styles.input}
          value={matric}
          onChangeText={setMatric}
        />
        <TextInput
          placeholder="Faculty"
          style={styles.input}
          value={faculty}
          onChangeText={setFaculty}
        />

        {/* Modern Dropdown Menu */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              style={styles.dropdownButton}
              onPress={() => setMenuVisible(true)}
              textColor="black"
            >
              Role: {role}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              setRole('Member');
              setMenuVisible(false);
            }}
            title="Member"
          />
          <Menu.Item
            onPress={() => {
              setRole('Staff');
              setMenuVisible(false);
            }}
            title="Staff"
          />
        </Menu>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => router.push('/login')}>
            Click here
          </Text>
        </Text>
      </ScrollView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    backgroundColor: '#C62828',
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  dropdownButton: {
    width: '100%',
    borderRadius: 25,
    borderColor: '#ccc',
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#C62828',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordContainer: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 25,
  backgroundColor: "#F5F5F5",
  marginVertical: 8,
},

passwordInput: {
  flex: 1,
  padding: 12,
  paddingLeft: 15,
},

  footer: {
    marginTop: 15,
    fontSize: 14,
  },
  link: {
    color: '#1E88E5',
    textDecorationLine: 'underline',
  },
});
