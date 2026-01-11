import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView, Dimensions, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase"; 
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const { width } = Dimensions.get("window");

interface SidebarMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SidebarMenu({ visible, onClose }: SidebarMenuProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");

  useEffect(() => {
    // 1. Listen for Auth State changes first
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 2. Once we have a user, set up a real-time listener for their Firestore doc
        const userRef = doc(db, "users", user.uid);
        
        const unsubscribeDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserName(snap.data().name || "User");
          } else {
            setUserName("User");
          }
        }, (error) => {
          console.log("Firestore error:", error);
          setUserName("User");
        });

        return () => unsubscribeDoc();
      } else {
        setUserName("User");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 18) return "Good Afternoon,";
    return "Good Evening,";
  };

  const handlePress = (path: string) => {
    if (typeof onClose === 'function') {
      onClose();
    }
    router.push(path as any);
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={() => onClose?.()}
    >
      <View style={styles.menuOverlay}>
        <TouchableOpacity 
          style={styles.menuCloser} 
          activeOpacity={1} 
          onPress={() => onClose?.()} 
        />
        
        <View style={styles.sideMenu}>
          <View style={styles.drawerHeader}>
            <Image 
              source={require("../assets/images/Logo.png")} 
              style={styles.drawerHeaderBg} 
              resizeMode="cover"
            />
            <View style={styles.headerOverlay} />
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            {/* Displaying the fetched userName here */}
            <Text style={styles.userNameText}>{userName}</Text>
          </View>

          <ScrollView style={styles.menuList}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/(member)/home")}>
              <Ionicons name="home-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/(member)/event")}>
              <Ionicons name="calendar-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Event</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/(member)/memberList")}>
              <Ionicons name="people-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Member List</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/(member)/communication")}>
              <Ionicons name="chatbubble-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Communication</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/(member)/attendance")}>
              <Ionicons name="qr-code-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/memberProfile")}>
              <Ionicons name="person-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handlePress("/faqchat")}>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
              <Text style={styles.menuItemText}>FAQ Chat</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.drawerFooter}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => handlePress("/logout")}
            >
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "row" },
  menuCloser: { flex: 1 }, 
  sideMenu: { width: width * 0.8, height: "100%", backgroundColor: "white" },
  drawerHeader: { height: 180, justifyContent: "center", paddingHorizontal: 20, backgroundColor: "#B02020" },
  drawerHeaderBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.4 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  greetingText: { color: "#FFD700", fontSize: 16, fontWeight: "500" },
  userNameText: { color: "white", fontSize: 20, fontWeight: "bold", marginTop: 5 },
  menuList: { flex: 1, marginTop: 10 },
  menuItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 15, 
    paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0"
  },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: "500", marginLeft: 15, color: "#333" },
  drawerFooter: { borderTopWidth: 1, borderTopColor: "#eee", padding: 20 },
  logoutButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoutText: { fontSize: 16, color: "#333", fontWeight: "600" },
});