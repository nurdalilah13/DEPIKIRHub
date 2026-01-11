import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../firebase"; 
import { collection, onSnapshot, deleteDoc, doc, DocumentData } from "firebase/firestore";

interface User {
  id: string;
  name: string;
  role: string;
}

export default function StaffListScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  // 1. Load users from Firebase
  useEffect(() => {
    // You might want to filter this query for role == 'staff' if needed
    const q = collection(db, "users"); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: User[] = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          name: data.name,
          role: data.role,
        };
      });
      setUsers(list);
    });

    return () => unsubscribe();
  }, []);

  // 2. Delete Function
  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", id));
            } catch (err) {
              console.log("Error deleting:", err);
              Alert.alert("Error", "Could not delete user.");
            }
          },
        },
      ]
    );
  };

  // 3. Filter based on search
  const filteredUsers = users
    .filter((user) => user.role === "Member" || user.role === "Staff")
    .filter((user) => user.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)
  );

  const renderItem = ({ item }: { item: User }) => (
  <View style={styles.row}>
    {/* Left Side: Icon & Name */}
    <View style={styles.rowLeft}>
      <Ionicons
        name="person-outline"
        size={20}
        color="#555"
        style={{ marginRight: 15 }}
      />

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.nameText}>{item.name}</Text>

        {/* STAFF BADGE */}
        {item.role === "Staff" && (
          <View style={styles.staffBadge}>
            <Text style={styles.staffBadgeText}>STAFF</Text>
          </View>
        )}
      </View>
    </View>

    {/* Right Side: Actions */}
    <View style={styles.rowRight}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/adminEditUser",
            params: { id: item.id },
          } as any)
        }
        style={styles.actionButton}
      >
        <Ionicons name="create-outline" size={22} color="#555" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleDelete(item.id)}
        style={styles.actionButton}
      >
        <Ionicons name="trash-outline" size={22} color="#555" />
      </TouchableOpacity>
    </View>
  </View>
);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/staffMenu")}>
          <Ionicons name="menu" size={26} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DEPIKIRHub</Text>

        <TouchableOpacity onPress={() => router.push("/adminProfile" as any)}>
          <Ionicons name="person-circle-outline" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#888" style={{ marginRight: 5 }} />
          <TextInput
            placeholder="Search staff..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Big White Card Container */}
        <View style={styles.bigCardContainer}>
            
            {/* Card Title */}
            <View style={styles.listHeader}>
                <Ionicons name="people" size={22} color="#333" style={{ marginRight: 10 }} />
                <Text style={styles.listHeaderTitle}>List of Members</Text>
            </View>

            {/* List */}
            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }} 
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>

      </View>

      {/* Floating Chat Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push("/staffFaqchat" as any)}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: { 
    flex: 1, 
    backgroundColor: "#F1F1F1" 
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "white",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "bold",
    color: "black"
  },

  // Content Area
  contentContainer: { 
    flex: 1, 
    padding: 15 
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEDED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
  },
  searchInput: { 
    flex: 1, 
    color: "#333",
    marginLeft: 5,
    fontSize: 15
  },

  // Big White Card
  bigCardContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 80, 
  },
  
  // List Header
  listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#F0F0F0",
      marginBottom: 5
  },
  listHeaderTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333"
  },

  // Row Item
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Pushes actions to the right
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  rowLeft: {
      flexDirection: "row",
      alignItems: "center",
  },
  rowRight: {
      flexDirection: "row",
      alignItems: "center",
  },
  nameText: { 
    fontSize: 15, 
    fontWeight: "500", 
    color: "#333" 
  },
  actionButton: {
      marginLeft: 15, // Space between icons
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 15,
  },

  // Floating Action Button (Red Chat)
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B02020",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  staffBadge: {
  backgroundColor: "#B02020",
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
  marginLeft: 8,
},

staffBadgeText: {
  color: "white",
  fontSize: 11,
  fontWeight: "700",
},

});