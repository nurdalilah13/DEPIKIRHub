import React, { useState, useEffect } from "react";
import {  View,  Text,  TextInput,  TouchableOpacity,  FlatList, StyleSheet,  KeyboardAvoidingView,  Platform,  Image,  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../firebase";
import {  deleteDoc, doc, updateDoc, collection,  addDoc,  getDocs,  orderBy,  query,  DocumentData,} from "firebase/firestore";


interface Announcement {
  id: string;
  title: string;
  content: string;
  image?: string | null;
  status: "visible" | "hidden";
}

export default function AdminHome() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Load announcements from Firebase
  const loadAnnouncements = async () => {
    try {
      const q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const list: Announcement[] = snapshot.docs.map((docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title,
    content: data.content,
    image: data.image || null,
    status: data.status || "visible", // default visible
  };
});


      setAnnouncements(list);
    } catch (err) {
      console.log("Error loading announcements:", err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Pick Image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };
  const removeImage = () => {
    Alert.alert("Remove Image", "Remove attached image?", [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => setImageUri(null) },
    ]);
  };

  // Add or Update Announcement
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in title and content");
      return;
    }

    try {
      if (editingId) {
        // UPDATE
        await updateDoc(doc(db, "announcements", editingId), {
          title,
          content,
          image: imageUri,
          status: announcements.find(a => a.id === editingId)?.status || "visible",
        });

        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, title, content, image: imageUri }
              : item
          )
        );
      } else {
        // ADD NEW
        const docRef = await addDoc(collection(db, "announcements"), {
          title,
          content,
          image: imageUri,
          status: "visible",
          createdAt: new Date(),
        });

        setAnnouncements([
          {
            id: docRef.id,
            title,
            content,
            image: imageUri,
            status: "visible",
          },
          ...announcements,
        ]);
      }

      resetForm();
    } catch (err) {
      console.log("Error saving:", err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageUri(null);
    setEditingId(null);
  };

  const deleteAnnouncement = async (id: string) => {
  Alert.alert("Delete Announcement", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          // DELETE FROM FIRESTORE
          await deleteDoc(doc(db, "announcements", id));

          // DELETE FROM UI LIST
          setAnnouncements((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
          console.log("Delete error:", err);
          Alert.alert("Error", "Failed to delete announcement.");
        }
      },
    },
  ]);
};

const toggleStatus = async (item: Announcement) => {
  const newStatus = item.status === "visible" ? "hidden" : "visible";

  try {
    await updateDoc(doc(db, "announcements", item.id), {
      status: newStatus,
    });

    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === item.id ? { ...a, status: newStatus } : a
      )
    );
  } catch (err) {
    console.log("Status update error:", err);
    Alert.alert("Error", "Failed to update status");
  }
};


  const handleEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setImageUri(item.image || null);
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <View style={styles.circle}>
        <Text style={styles.circleText}>{item.title.charAt(0)}</Text>
      </View>
<Text
        style={{
          color: item.status === "visible" ? "green" : "red",
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {item.status === "visible" ? "Visible to users" : "Hidden from users"}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        
        <Text style={styles.cardContent}>{item.content}</Text>

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.announcementImage} />
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color="white" />
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
          style={[
            styles.statusBtn,
            { backgroundColor: item.status === "visible" ? "#777" : "#28A745" },
          ]}
          onPress={() => toggleStatus(item)}
        >
          <Ionicons
            name={item.status === "visible" ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="white"
          />
          <Text style={styles.btnText}>
            {item.status === "visible" ? "Hide" : "Show"}
          </Text>
        </TouchableOpacity>

          <TouchableOpacity
            onPress={() => deleteAnnouncement(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color="white" />
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>

          
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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

      <View style={styles.sectionHeaderRow}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Ionicons name="notifications-outline" size={22} color="black" />
    <Text style={styles.sectionAddTitle}>
      {editingId ? " Edit Announcement" : " Add Announcement"}
    </Text>
  </View>

  {editingId && (
    <TouchableOpacity style={styles.addNewSmallBtn} onPress={resetForm}>
      <Ionicons name="add-circle-outline" size={18} color="white" />
      <Text style={styles.addNewSmallText}>Add New</Text>
    </TouchableOpacity>
  )}
</View>


      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Title"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Content"
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          style={[styles.input, styles.contentInput]}
        />

        <View style={styles.attachmentRow}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={20} color="#B02020" />
            <Text style={styles.attachText}>Add Image</Text>
          </TouchableOpacity>
        </View>

       {imageUri && (
         <View style={styles.previewWrapper}>
           <Image source={{ uri: imageUri }} style={styles.previewImage} />
           <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
             <Ionicons name="trash-outline" size={20} color="white" />
           </TouchableOpacity>
         </View>
       )}

        {/* Post/Update Button */}
        <TouchableOpacity style={styles.sendButton} onPress={handleSave}>
          <Ionicons name={editingId ? "save-outline" : "send-outline"} size={22} color="white" />
          <Text style={styles.sendText}>{editingId ? "Update" : "Post"}</Text>
        </TouchableOpacity>
      </View>

      {/* Announcement List */}
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
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
  headerTitle: {color: "white", fontSize: 18, fontWeight: "bold" },
  sectionAddTitle: { fontSize: 16, fontWeight: "bold", marginVertical: 10, paddingHorizontal: 5 },
  inputContainer: { backgroundColor: "white", borderRadius: 12, padding: 15, marginHorizontal: 10 },
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  sectionHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 10,
  marginTop: 10,
},
addNewSmallBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#0077CC",
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
},
addNewSmallText: {
  color: "white",
  fontWeight: "600",
  marginLeft: 5,
  fontSize: 13,
},
  contentInput: { height: 80, textAlignVertical: "top" },
  attachmentRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#B02020",
  },
  attachText: { color: "#B02020", fontWeight: "600", marginLeft: 6 },
  previewImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 10 },
  previewDoc: { fontSize: 14, color: "#555", marginBottom: 8 },
  previewWrapper: { position: "relative", marginBottom: 10 },
removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(176,32,32,0.9)", padding: 8, borderRadius: 20, elevation: 4 },
docRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
removeDocBtn: { marginLeft: 8, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: "#B02020" },
  
  sendButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B02020",
    borderRadius: 10,
    paddingVertical: 12,
  },
  sendText: { color: "white", fontWeight: "600", marginLeft: 6 },
  addNewBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0077CC",
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  addNewText: { color: "white", fontWeight: "600", marginLeft: 6 },
  card: { backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B02020",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  circleText: { color: "white", fontWeight: "bold", fontSize: 16 },
  cardTitle: { color: "#000", fontWeight: "600", fontSize: 15 },
  cardContent: { color: "#555", fontSize: 13, marginTop: 3 },
  announcementImage: { width: "100%", height: 120, borderRadius: 8, marginTop: 8 },
  docText: { marginTop: 6, color: "#333", fontSize: 13, fontStyle: "italic" },
  actionRow: { flexDirection: "row", marginTop: 10, gap: 10 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0077CC",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B02020",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnText: { color: "white", marginLeft: 5, fontWeight: "600" },
    statusBtn: { padding: 8, borderRadius: 8, flexDirection: "row" },

});
