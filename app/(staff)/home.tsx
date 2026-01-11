import React, { useState, useEffect } from "react";
import {  Alert, View,  Text,  TextInput,  TouchableOpacity,  FlatList,  StyleSheet,  KeyboardAvoidingView,  Platform,  Image,  Modal,  ScrollView,  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../firebase";
import {  collection,  addDoc,  getDocs,  orderBy,  query,  DocumentData, where} from "firebase/firestore";

interface Announcement {
  id: string;
  title: string;
  content: string;
  image?: string | null;
  status: "visible" | "hidden";
}

export default function StaffHome() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);


  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load announcements from Firebase
  const loadAnnouncements = async () => {
  try {
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    // 🔹 Filter visible announcements on the client
    const list: Announcement[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          image: data.image || null,
          status: data.status || "visible",
        };
      })
      .filter((item) => item.status === "visible");

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
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };
  const removeImage = () => {
  Alert.alert("Remove Image", "Remove attached image?", [
  { text: "Cancel", style: "cancel" },
  { text: "Remove", style: "destructive", onPress: () => setImageUri(null) },
  ]);
};
 


  // Add announcement
  const addAnnouncement = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        content: content.trim(),
        image: imageUri || null,
        status: "visible",
        createdAt: new Date(),
      });

      setAnnouncements([
        { id: docRef.id, title, content, image: imageUri, status: "visible", },
        ...announcements,
      ]);

      setTitle("");
      setContent("");
      setImageUri(null);
    } catch (err) {
      console.log("Error adding announcement:", err);
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedAnnouncement(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.circle}>
        <Text style={styles.circleText}>{item.title.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardContent}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/staffMenu")}>
          <Ionicons name="menu" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPIKIRHub</Text>
        <TouchableOpacity onPress={() => router.push("/staffProfile")}>
          <Ionicons name="person-circle-outline" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Add Announcement */}
      <Text style={styles.sectionAddTitle}>Add Announcement</Text>
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
        <TouchableOpacity style={styles.sendButton} onPress={addAnnouncement}>
          <Ionicons name="send-outline" size={22} color="white" />
          <Text style={styles.sendText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Announcements List */}
      <View style={styles.sectionHeader}>
        <Ionicons name="notifications-outline" size={22} color="black" />
        <Text style={styles.sectionTitle}>Announcements</Text>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      {/* Modal for details */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selectedAnnouncement?.title}</Text>
              <Text style={styles.modalContent}>{selectedAnnouncement?.content}</Text>

              {selectedAnnouncement?.image && (
                <Image
                  source={{ uri: selectedAnnouncement.image }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              )}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => router.push("/staffFaqchat")}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// Styles (add modal styles too)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 0.3,
    borderColor: "#ddd",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  sectionAddTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    marginHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginLeft: 6 },
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
  contentInput: { height: 80, textAlignVertical: "top" },
  attachmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
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
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B02020",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  circleText: { color: "white", fontWeight: "bold", fontSize: 16 },
  cardTitle: { color: "#000", fontWeight: "600", fontSize: 15 },
  cardContent: { color: "#555", fontSize: 13, marginTop: 3 },
  chatButton: {
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
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalContent: { fontSize: 14, marginBottom: 12 },
  modalImage: { width: "100%", height: 200, borderRadius: 8, marginBottom: 12 },
  modalDocBtn: {
    backgroundColor: "#EEE",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalDocText: { color: "#333" },
  modalCloseBtn: {
    backgroundColor: "#B02020",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseText: { color: "white", fontWeight: "bold" },
});