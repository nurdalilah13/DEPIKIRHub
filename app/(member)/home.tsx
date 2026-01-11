import React, { useEffect, useState } from "react";
import {  View,  Text,  TextInput,  StyleSheet,  FlatList, Linking,  TouchableOpacity,  Modal,  Image,  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {  collection,  addDoc,  getDocs,  orderBy,  query,  DocumentData, where} from "firebase/firestore";
import { db } from "../../firebase"; // <-- update path if needed

interface Announcement {
  id: string;
  title: string;
  content: string;
  image?: string | null;
  status: "visible" | "hidden";
}

export default function MemberHome() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openDetails = (item: Announcement) => {
    setSelectedAnnouncement(item);
    setModalVisible(true);
  };

  // Load announcements
  const loadAnnouncements = async () => {
    try {
      const q = query(
        collection(db, "announcements"),
        where("status", "==", "visible"),
      );
      const snapshot = await getDocs(q);

      const list = snapshot.docs
  .map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      image: data.image || null,
      document: data.document || null,
      status: data.status,
      createdAt: data.createdAt?.toDate?.() || new Date(0),
    };
  })
  .sort((a, b) => b.createdAt - a.createdAt);


      setAnnouncements(list);
    } catch (err) {
      console.log("Error loading announcements:", err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filtered = announcements.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity  onPress={() => router.push("/memberMenu")}>
          <Ionicons name="menu" size={26} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DEPIKIRHub</Text>

        <TouchableOpacity onPress={() => router.push("/memberProfile")}>
          <Ionicons name="person-circle-outline" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Announcement Section */}
      <View style={styles.announcementContainer}>
        <View style={styles.announcementHeader}>
          <Ionicons name="notifications-outline" size={22} color="black" />
          <Text style={styles.announcementTitle}>ANNOUNCEMENT</Text>
        </View>

        {/* Search */}
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

        {/* Announcement List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => router.push("/faqchat")}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={28} color="black" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {selectedAnnouncement?.title}
              </Text>

              <Text style={styles.modalContent}>
                {selectedAnnouncement?.content}
              </Text>

              {selectedAnnouncement?.image && (
                <Image
                  source={{ uri: selectedAnnouncement.image }}
                  style={styles.modalImage}
                />
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- SAME STYLES AS BEFORE ---
  container: { flex: 1, backgroundColor: "#F1F1F1" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "white",
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  announcementContainer: { flex: 1, padding: 15 },
  announcementHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  announcementTitle: { fontSize: 16, fontWeight: "bold", marginLeft: 5 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEDED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 15,
  },
  searchInput: { flex: 1, color: "#333" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
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
  cardTitle: { fontWeight: "bold", color: "black" },
  cardSubtitle: { color: "#555" },
  cardContent: { color: "#555" },
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

  // --- MODAL STYLES ---
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    maxHeight: "80%",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#B02020",
  },
  modalType: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalContent: {
    fontSize: 15,
    color: "#333",
    marginBottom: 15,
  },
  documentButton: {
    flexDirection: "row",
    backgroundColor: "#B02020",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  documentText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
});
