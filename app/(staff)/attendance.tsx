import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

interface Attendance {
  id: string;
  name: string;
  displayTime: string;
  matric: string;
}

// Format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function StaffAttendanceScreen() {
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  const [dateInput, setDateInput] = useState(formatDateToYYYYMMDD(new Date()));
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");

  const [validStartTime, setValidStartTime] = useState<number | null>(null);
  const [validEndTime, setValidEndTime] = useState<number | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObject, setSelectedDateObject] = useState(new Date());

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [filterDateObject, setFilterDateObject] = useState(new Date());


 const router = useRouter();
  // Fetch attendance list
  useEffect(() => {
    const q = query(collection(db, "attendanceRecords"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
  const rawTime = doc.data().time
    ? new Date(doc.data().time.seconds * 1000)
    : null;

  return {
    id: doc.id,
    ...doc.data(),
    rawTime, // ✅ REAL DATE OBJECT
    displayTime: rawTime
      ? rawTime.toLocaleString("en-MY", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "N/A",
  };
});

      setAttendanceList(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredAttendance = filterDate
  ? attendanceList.filter((item) => {
      if (!item.rawTime) return false;
      return formatDateToYYYYMMDD(item.rawTime) === filterDate;
    })
  : attendanceList;


  // Date picker handler
  const onDateChange = (event: any, newDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (newDate) {
      setSelectedDateObject(newDate);
      setDateInput(formatDateToYYYYMMDD(newDate));
    }
  };

  const onFilterDateChange = (event: any, selected?: Date) => {
  setShowFilterDatePicker(false);
  if (selected) {
    setFilterDateObject(selected);
    setFilterDate(formatDateToYYYYMMDD(selected));
  }
};


  const showPicker = () => setShowDatePicker(true);

  // Generate QR
  const generateQR = async () => {
    const startDateTimeString = `${dateInput}T${startTimeInput}:00`;
    const endDateTimeString = `${dateInput}T${endTimeInput}:00`;

    const startTimestamp = new Date(startDateTimeString).getTime();
    const endTimestamp = new Date(endDateTimeString).getTime();

    if (!dateInput || !startTimeInput || !endTimeInput || isNaN(startTimestamp) || isNaN(endTimestamp)) {
      Alert.alert("Incomplete/Invalid Input", "Please fill Date (YYYY-MM-DD), Start Time & End Time properly.");
      return;
    }

    if (startTimestamp >= endTimestamp) {
      Alert.alert("Invalid Time", "End time must be after the start time.");
      return;
    }

    const uniqueSessionId = Date.now();
    const code = `ATT-${uniqueSessionId}|${startTimestamp}|${endTimestamp}|${dateInput}`;

    setQrValue(code);
    setShowQR(true);
    setValidStartTime(startTimestamp);
    setValidEndTime(endTimestamp);

    try {
      await addDoc(collection(db, "qrCodes"), {
        sessionId: uniqueSessionId,
        qrCode: code,
        validStartTimestamp: startTimestamp,
        validEndTimestamp: endTimestamp,
        validStartTimeInput: startTimeInput,
        validEndTimeInput: endTimeInput,
        validDateInput: dateInput,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "QR Generated",
        `Attendance QR is valid on ${dateInput} from ${startTimeInput} to ${endTimeInput}.`
      );
    } catch (error) {
      console.error("Error saving QR code:", error);
      Alert.alert("Error", "Failed to save QR session to database.");
      setShowQR(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Ionicons name="person-outline" size={22} color="#B02020" />
      <View style={{ marginLeft: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.time}>{item.displayTime} | Matric No: {item.matric}</Text>
      </View>
    </View>
  );

  const renderTextInput = (
    label: string,
    value: string,
    setValue: (text: string) => void,
    placeholder: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        style={styles.textInput}
        placeholderTextColor="#AAA"
      />
    </View>
  );

  const renderInputSection = () => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Set Attendance Date and Time</Text>

      {/* DATE PICKER BUTTON */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Selected Date</Text>
        <TouchableOpacity style={styles.datePickerButton} onPress={showPicker}>
          <Ionicons name="calendar-outline" size={20} color="#B02020" />
          <Text style={styles.datePickerText}>{dateInput}</Text>
          <Ionicons name="chevron-down" size={20} color="#B02020" />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDateObject}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}

      <View style={styles.timeRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          {renderTextInput("Start Time (HH:MM)", startTimeInput, setStartTimeInput, "E.g., 17:00")}
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          {renderTextInput("End Time (HH:MM)", endTimeInput, setEndTimeInput, "E.g., 18:00")}
        </View>
      </View>

      <Text style={styles.warningText}>*Select the date above and ensure the time format (HH:MM) is accurate.</Text>
    </View>
  );

  const renderQRSection = () => {
    if (showQR && validStartTime && validEndTime) {
      return (
        <View style={styles.qrCodeDisplay}>
          <QRCode value={qrValue} size={150} />
          <Text style={styles.qrText}>Active Attendance QR</Text>
          <Text style={styles.qrCodeValue}>
            {dateInput} | {startTimeInput} - {endTimeInput}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.qrCodeDisplay}>
        <Text style={styles.noQrText}>
          QR has not been generated. Select the date and time above, then press 'Generate QR'.
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >

      {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.push("/staffMenu")}>
                <Ionicons name="menu" size={26} color="black" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>DEPIKIRHub</Text>
              <TouchableOpacity onPress={() => router.push("/adminProfile")}>
                <Ionicons name="person-circle-outline" size={28} color="black" />
              </TouchableOpacity>
            </View>

      <View style={styles.container}>
        
          <View style={styles.attendanceTitleRow}>
              <Ionicons name="calendar-outline" size={22} color="#B02020" />
              <Text style={styles.attendanceTitle}>Attendance</Text>
        </View>

        

        <View style={styles.generationSection}>
          {renderInputSection()}
          {renderQRSection()}
          <TouchableOpacity style={styles.qrButton} onPress={generateQR}>
            <Ionicons name="qr-code-outline" size={20} color="white" />
            <Text style={styles.qrButtonText}>GENERATE QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordedSection}>
  {/* Title Row */}
  <View style={styles.listHeader}>
    <Ionicons name="people-outline" size={22} color="black" />
    <Text style={styles.listTitle}>Attendance History</Text>
  </View>

  {/* View Button UNDER title */}
  <TouchableOpacity
    style={styles.viewButtonUnder}
    onPress={() => setShowAttendanceModal(true)}
  >
    <Ionicons name="eye-outline" size={16} color="white" />
    <Text style={styles.viewButtonText}>View Attendance</Text>
  </TouchableOpacity>
</View>
        
      <Modal visible={showAttendanceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Recorded Attendance ({filteredAttendance.length})
              </Text>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>

            {/* DATE FILTER */}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#B02020" />
              <Text style={styles.filterText}>
                {filterDate ?? "Filter by date"}
              </Text>
            </TouchableOpacity>

            {showFilterDatePicker && (
              <DateTimePicker
                value={filterDateObject}
                mode="date"
                onChange={onFilterDateChange}
              />
            )}

            {filteredAttendance.length === 0 ? (
  <View style={styles.emptyState}>
    <Ionicons name="document-text-outline" size={48} color="#CCC" />
    <Text style={styles.emptyText}>No record history</Text>
    {filterDate && (
      <Text style={styles.emptySubText}>
        No attendance recorded on {filterDate}
      </Text>
    )}
  </View>
) : (
  <FlatList
    data={filteredAttendance}
    keyExtractor={(i) => i.id}
    renderItem={renderItem}
  />
)}


            {filterDate && (
  <TouchableOpacity onPress={() => setFilterDate(null)}>
    <Text style={{ color: "#B02020", fontWeight: "600", marginBottom: 10 }}>
      Clear Filter
    </Text>
  </TouchableOpacity>
)}

          </View>
        </View>
      </Modal>

      </View>
    </KeyboardAvoidingView>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
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
    headerTitle: { fontSize: 18, fontWeight: "bold", marginLeft: 8 },

  generationSection: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    marginBottom: 15,
  },
  sectionAddTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  inputSection: { marginBottom: 5 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#333" },
  inputContainer: { marginBottom: 10 },
  inputLabel: { fontSize: 14, color: "#666", marginBottom: 4, fontWeight: "500" },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    color: "#333",
    backgroundColor: "#FFF",
  },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  warningText: { fontSize: 12, color: "#B02020", marginTop: 5, textAlign: "center" },

  qrCodeDisplay: {
    width: "100%",
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    marginTop: 10,
  },
  qrText: { marginTop: 10, color: "#444", fontSize: 16, fontWeight: "bold" },
  qrCodeValue: { color: "#B02020", fontSize: 14, marginTop: 4 },
  noQrText: { color: "#888", padding: 20, textAlign: "center" },

  qrButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B02020",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 15,
    width: "100%",
  },
  qrButtonText: { color: "white", fontWeight: "700", marginLeft: 6, fontSize: 16 },

  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: "bold", marginLeft: 6 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  name: { fontSize: 15, fontWeight: "500" },
  time: { color: "#777", fontSize: 13 },

  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B02020",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FFF",
  },
  datePickerText: { flex: 1, fontSize: 16, color: "#333", fontWeight: "600", marginLeft: 10 },
attendanceTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

attendanceTitle: {
  fontSize: 20,
  fontWeight: "700",
  marginLeft: 8,
  color: "#111",
},
viewButton: {
  backgroundColor: "#B02020",
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
},

viewButtonText: {
  color: "white",
  fontWeight: "600",
  fontSize: 14,
  marginLeft: 6,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
},

modalContent: {
  width: "90%",
  maxHeight: "80%",
  backgroundColor: "#FFF",
  borderRadius: 16,
  padding: 16,
},

modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "700",
},

recordedSection: {
  marginBottom: 12,
},

viewButtonUnder: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#B02020",
  borderRadius: 10,
  paddingVertical: 10,
  marginTop: 6,
},
filterButton: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
filterText: { marginLeft: 8, fontWeight: "600" },
emptyState: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 40,
},

emptyText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#999",
  marginTop: 10,
},

emptySubText: {
  fontSize: 13,
  color: "#AAA",
  marginTop: 4,
},

});
