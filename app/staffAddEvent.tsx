import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

import * as ImagePicker from "expo-image-picker";


export default function AddEvent() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  // -------------------------------------------------
  // PICK IMAGE
  // -------------------------------------------------
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


 const removeAttachment = () => {
  setImageUri(null);
};


  const combineDateAndTime = (date: Date | null, time: Date | null) => {
    if (!date) return null;
    const copy = new Date(date); // prevent mutation
    if (time) {
      copy.setHours(time.getHours(), time.getMinutes(), 0, 0);
    } else {
      copy.setHours(0, 0, 0, 0);
    }
    return copy;
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // -------------------------------------------------
  // SAVE EVENT
  // -------------------------------------------------
  const saveEvent = async () => {
  if (!title.trim() || !startDate) {
    Alert.alert("Error", "Please fill required fields (title and start date).");
    return;
  }

  setUploading(true);

  try {
    const startDateTime = combineDateAndTime(startDate, startTime);
    const endDateTime = combineDateAndTime(endDate, endTime);

    await addDoc(collection(db, "events"), {
      title: title.trim(),
      description: description.trim(),
      startDateTime: startDateTime ? Timestamp.fromDate(startDateTime) : null,
      endDateTime: endDateTime ? Timestamp.fromDate(endDateTime) : null,
      startTime: startTime ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}` : null,
      endTime: endTime ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}` : null,

      image: imageUri ,
    
      createdAt: Timestamp.now(),
    });

    Alert.alert("Success", "Event added successfully!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  } catch (err) {
    console.log(err);
    Alert.alert("Error", "Failed to save event");
  } finally {
    setUploading(false);
  }
};


  // -----------------------------
  // UI Rendering
  // -----------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            try {
              if (typeof (router as any).canGoBack === "function" && (router as any).canGoBack()) (router as any).back();
              else if (typeof (router as any).replace === "function") (router as any).replace("/(staff)/event");
            } catch (e) {
              console.log("header nav error", e);
            }
          }}
        >
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DEPIKIRHub</Text>
        <Ionicons name="person-circle-outline" size={28} color="black" />
      </View>

      {/* SCROLLABLE FORM */}
      <FlatList
        data={[1]}
        keyExtractor={() => "form"}
        renderItem={() => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Event Management</Text>
            <View style={styles.divider} />

            {/* DATE & TIME BOX */}
            <View style={styles.dateBox}>
              <Text style={styles.sectionTitle}>Select date & time</Text>
              <Text style={styles.largeTitle}>Enter dates</Text>

              {/* Row: Start & End Date */}
              <View style={styles.row}>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <Text style={styles.dateText}>{startDate ? startDate.toLocaleDateString() : "mm/dd/yyyy"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <Text style={styles.dateText}>{endDate ? endDate.toLocaleDateString() : "mm/dd/yyyy"}</Text>
                </TouchableOpacity>
              </View>

              {/* Row: Start & End Time */}
              <View style={styles.row}>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={styles.dateLabel}>Start Time</Text>
                  <Text style={styles.dateText}>
                    {startTime ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}` : "hh:mm"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={styles.dateLabel}>End Time</Text>
                  <Text style={styles.dateText}>
                    {endTime ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}` : "hh:mm"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pickers */}
              {showStartPicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  onChange={(e, d) => {
                    setShowStartPicker(false);
                    if (d) setStartDate(d);
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  onChange={(e, d) => {
                    setShowEndPicker(false);
                    if (d) setEndDate(d);
                  }}
                />
              )}

              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime || new Date()}
                  mode="time"
                  onChange={(e, d) => {
                    setShowStartTimePicker(false);
                    if (d) setStartTime(d);
                  }}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime || new Date()}
                  mode="time"
                  onChange={(e, d) => {
                    setShowEndTimePicker(false);
                    if (d) setEndTime(d);
                  }}
                />
              )}
            </View>

            {/* Upload buttons */}
            <View style={styles.uploadRow}>
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
            
            
            {/* Title & Description */}
            <Text style={styles.inputLabel}>TITLE</Text>
            <TextInput
              style={styles.inputBox}
              placeholder="Add Event"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.descBox}
              placeholder="Description..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Save Button */}
            <TouchableOpacity style={styles.sendButton} onPress={saveEvent} disabled={uploading}>
              {uploading ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={22} color="white" />}
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F3F3" },

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

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
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
  sendButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B02020",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },

  card: {
    margin: 15,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 10,
  },

  dateBox: {
    backgroundColor: "#FFD6D6",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 14,
    marginBottom: 5,
    color: "#444",
  },

  largeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },

  dateInput: {
    flex: 1,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },

  dateLabel: {
    fontSize: 12,
    color: "#666",
  },

  dateText: {
    fontSize: 16,
    color: "#333",
    marginTop: 2,
  },

  previewWrapper: { position: "relative", marginBottom: 10 },
removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(176,32,32,0.9)", padding: 8, borderRadius: 20, elevation: 4 },
docRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
removeDocBtn: { marginLeft: 8, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: "#B02020" },

  uploadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  uploadButton: {
    flexDirection: "row",
    backgroundColor: "#B02020",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },

  uploadText: {
    color: "white",
    marginLeft: 6,
    fontSize: 14,
  },

  inputLabel: {
    fontSize: 13,
    color: "#333",
    marginBottom: 5,
  },

  inputBox: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    color: "#333",
  },

  descBox: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    height: 90,
    marginBottom: 20,
    color: "#333",
  },

  preview: { width: "100%", height: 150, borderRadius: 8, marginBottom: 10 },
  docText: { fontSize: 14, color: "#555", marginBottom: 10, fontStyle: "italic" },
});
