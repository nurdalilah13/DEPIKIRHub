import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically navigate to login after 6 seconds
    const timer = setTimeout(() => {
      router.push("/login");
    }, 40000); // 6000ms = 6 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/Logo.png")} style={styles.logo} />
      <Text style={styles.title}>DEPIKIRHub</Text>
      <Text style={styles.subtitle}>"Fueling Critical Minds of UTM"</Text>

      {/* LOGIN BUTTON */}
      <TouchableOpacity style={styles.button} onPress={() => router.push("/login")}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {/* REGISTER BUTTON */}
      <TouchableOpacity style={[styles.button, { marginTop: 15 }]} onPress={() => router.push("/signup")}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.note}>You will be redirected to Login shortly...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B02020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 35,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: '#B02020',
    fontWeight: 'bold',
    fontSize: 16,
  },
  note: {
    marginTop: 20,
    color: 'white',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
