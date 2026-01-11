import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { db } from "../../firebase";
import {  deleteDoc, doc, updateDoc, collection,  addDoc,  getDocs,  orderBy,  query,  DocumentData, onSnapshot} from "firebase/firestore";


interface User {
  id: string;
  name: string;
  role: string;
}

export default function UserManagement() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
  

  // Load users from Firebase
  useEffect(() => {
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

  return () => unsubscribe(); // cleanup on unmount
}, []);

  // Delete user
  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "users", id));
            setUsers(users.filter((u) => u.id !== id));
          } catch (err) {
            console.log("Error deleting user:", err);
          }
        },
      },
    ]);
  };

  // Update user role
  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", id), { role: newRole });
      setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.log("Error updating role:", err);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.row}>
      {/* Name */}
      <View style={styles.nameCol}>
        <Ionicons name="person-outline" size={18} color="#000" />
        <Text style={styles.nameText}>{item.name}</Text>
      </View>

      {/* Role picker */}
      {editingRoleId === item.id ? (
        <Picker
          selectedValue={item.role}
          style={styles.rolePicker}
          onValueChange={(value) => handleRoleChange(item.id, value)}
        >
          <Picker.Item label="Admin" value="Admin" />
          <Picker.Item label="Member" value="Member" />
          <Picker.Item label="Staff" value="Staff" />
        </Picker>
      ) : (
        <Text style={styles.roleText}>{item.role}</Text>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() =>
            setEditingRoleId(editingRoleId === item.id ? null : item.id)
          }
        >
          <Ionicons
            name="swap-horizontal"
            size={20}
            color="#B02020"
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>

        {editingRoleId === item.id ? (
          <TouchableOpacity onPress={() => setEditingRoleId(null)}>
            <Ionicons name="checkmark-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push(`/adminEditUser?id=${item.id}`)}
          >
            <Ionicons name="create-outline" size={20} color="#B02020" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons
            name="trash-outline"
            size={20}
            color="#B02020"
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/adminMenu")}>
          <Ionicons name="menu" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPIKIRHub</Text>
        <TouchableOpacity onPress={() => router.push("/adminProfile")}>
          <Ionicons name="person-circle-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Page title and add button */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>User Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/adminAddUser")}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#888" style={{ marginRight: 5 }} />
                <TextInput
                  placeholder="Search"
                  placeholderTextColor="#999"
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Role</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Action</Text>
      </View>

      {/* Users List */}
      <FlatList
        data={users
        .filter(u => u.role !== "Admin") // exclude admins
        .filter(
          (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase())
      )}
    keyExtractor={(item) => item.id}
    renderItem={renderItem}
    contentContainerStyle={{ paddingBottom: 100 }}
    />

    </View>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  // Header
  header: {
    backgroundColor: "#B02020",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },

  // Page Header
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginHorizontal: 15,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B02020",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: { color: "white", fontWeight: "600", marginLeft: 5 },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 8,
    color: "#000",
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#6B5E5E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 6,
  },
  tableHeaderText: { color: "white", fontWeight: "bold", fontSize: 14 },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 15,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },
  nameCol: { flex: 2, flexDirection: "row", alignItems: "center" },
  nameText: { marginLeft: 6, color: "#000", fontSize: 15 },
  roleText: { flex: 1, color: "#333", fontSize: 14 },
  rolePicker: {
    flex: 1,
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
  },
  actions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
});
