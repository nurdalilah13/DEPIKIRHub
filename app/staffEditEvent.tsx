import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { db } from "../firebase";
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";

export default function StaffEditEvent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);

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

  const [events, setEvents] = useState<any[]>([]); // optional local state

  // Load existing event if editing
  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          Alert.alert("Error", "Event not found");
          router.back();
          return;
        }

        const data = snap.data();

        setTitle(data.title || "");
        setDescription(data.description || "");
        setImageUri(data.image || null);
        

        if (data.startDateTime) setStartDate(data.startDateTime.toDate());
        if (data.endDateTime) setEndDate(data.endDateTime.toDate());

        if (data.startTime) {
          const [h, m] = data.startTime.split(":");
          const d = new Date();
          d.setHours(Number(h), Number(m));
          setStartTime(d);
        }

        if (data.endTime) {
          const [h, m] = data.endTime.split(":");
          const d = new Date();
          d.setHours(Number(h), Number(m));
          setEndTime(d);
        }
      } catch (err) {
        console.log("Load Event Error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const combineDateTime = (date: Date | null, time: Date | null) => {
    if (!date) return null;
    const final = new Date(date);
    if (time) final.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return final;
  };

  // Pick image
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!res.canceled) setImageUri(res.assets[0].uri);
  };
const removeImage = () => {
Alert.alert("Remove Image", "Remove attached image?", [
{ text: "Cancel", style: "cancel" },
{ text: "Remove", style: "destructive", onPress: () => setImageUri(null) },
]);
};

  // Save / Update event
  const saveEvent = async () => {
    if (!title.trim() || !startDate) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }

    try {
      const startDT = combineDateTime(startDate, startTime);
      const endDT = combineDateTime(endDate, endTime);

      if (id) {
        // UPDATE
        await updateDoc(doc(db, "events", id), {
          title: title.trim(),
          description: description.trim(),
          startDateTime: startDT ? Timestamp.fromDate(startDT) : null,
          endDateTime: endDT ? Timestamp.fromDate(endDT) : null,
          startTime: startTime
            ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`
            : null,
          endTime: endTime
            ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`
            : null,
          image: imageUri,
          
        });

        setEvents((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  title: title.trim(),
                  description: description.trim(),
                  startDateTime: startDT,
                  endDateTime: endDT,
                  startTime: startTime
                    ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`
                    : null,
                  endTime: endTime
                    ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`
                    : null,
                  image: imageUri,
                 
                }
              : item
          )
        );
      } else {
        // ADD NEW
        const docRef = await addDoc(collection(db, "events"), {
          title: title.trim(),
          description: description.trim(),
          startDateTime: startDT ? Timestamp.fromDate(startDT) : null,
          endDateTime: endDT ? Timestamp.fromDate(endDT) : null,
          startTime: startTime
            ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`
            : null,
          endTime: endTime
            ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`
            : null,
          image: imageUri ,
          createdAt: new Date(),
        });

        setEvents([
          {
            id: docRef.id,
            title: title.trim(),
            description: description.trim(),
            startDateTime: startDT,
            endDateTime: endDT,
            startTime: startTime
              ? `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`
              : null,
            endTime: endTime
              ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`
              : null,
            image: imageUri,
          },
          ...events,
        ]);
      }

      // Reset form
      resetForm();

      Alert.alert("Success", `Event ${id ? "updated" : "added"} successfully!`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.log("Save Event Error:", err);
      Alert.alert("Error", "Failed to save event");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(null);
    setEndDate(null);
    setStartTime(null);
    setEndTime(null);
    setImageUri(null);
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#B02020" />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPIKIRHub</Text>
        <Ionicons name="person-circle-outline" size={28} color="black" />
      </View>

      <FlatList
        data={[1]}
        keyExtractor={() => "form"}
        renderItem={() => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✏️ Edit Event</Text>
            <View style={styles.divider} />

            <Text style={styles.inputLabel}>TITLE</Text>
            <TextInput style={styles.inputBox} value={title} onChangeText={setTitle} />

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              style={styles.descBox}
              value={description}
              multiline
              onChangeText={setDescription}
            />

            {/* Date & Time pickers */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={styles.dateText}>{startDate?.toLocaleDateString() || "mm/dd/yyyy"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateText}>{endDate?.toLocaleDateString() || "mm/dd/yyyy"}</Text>
              </TouchableOpacity>
            </View>

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
            {showStartPicker && <DateTimePicker value={startDate || new Date()} mode="date" onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />}
            {showEndPicker && <DateTimePicker value={endDate || new Date()} mode="date" onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }} />}
            {showStartTimePicker && <DateTimePicker value={startTime || new Date()} mode="time" onChange={(e, d) => { setShowStartTimePicker(false); if (d) setStartTime(d); }} />}
            {showEndTimePicker && <DateTimePicker value={endTime || new Date()} mode="time" onChange={(e, d) => { setShowEndTimePicker(false); if (d) setEndTime(d); }} />}

            {/* Image / Document */}
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

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={saveEvent}>
              <Ionicons name="save" size={22} color="white" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F3F3" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: "white", elevation: 3 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  card: { backgroundColor: "white", margin: 15, padding: 20, borderRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  previewWrapper: { position: "relative", marginBottom: 10 },
previewImage: { width: "100%", height: 150, borderRadius: 10 },
removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(176,32,32,0.9)", padding: 8, borderRadius: 20, elevation: 4 },
docRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
previewDoc: { fontSize: 14, color: "#555", flex: 1 },
removeDocBtn: { marginLeft: 8, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: "#B02020" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  inputLabel: { fontSize: 13, color: "#333", marginBottom: 5 },
  inputBox: { backgroundColor: "#F7F7F7", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#DDD", marginBottom: 15 },
  descBox: { backgroundColor: "#F7F7F7", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#DDD", height: 90, marginBottom: 20 },
  dateInput: { flex: 1, backgroundColor: "white", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#DDD", marginBottom: 15 },
  dateLabel: { fontSize: 12, color: "#666" },
  dateText: { fontSize: 16, color: "#333" },
  uploadRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  attachButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF0F0", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#B02020" },
  attachText: { color: "#B02020", fontWeight: "600", marginLeft: 6 },
  saveBtn: { backgroundColor: "#B02020", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 20 },
});
