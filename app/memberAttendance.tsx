import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from "react-native";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function MemberAttendance() {
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const user = getAuth().currentUser;

  const fetchHistory = async () => {
  if (!user) return;

  try {
    const attendanceQ = query(
      collection(db, "attendanceRecords"),
      where("userId", "==", user.uid)
    );

    const attendanceSnap = await getDocs(attendanceQ);

    const records = await Promise.all(
      attendanceSnap.docs.map(async (doc) => {
        const data = doc.data();

        // 1️⃣ Scan time (attendanceRecords)
        const scanDate = data.time
          ? new Date(data.time.seconds * 1000)
          : null;

        // 2️⃣ Match QR using qrCode string
        let qrDate = "N/A";
        let qrStartTime = "N/A";

        if (data.qrCode) {
          const qrQ = query(
            collection(db, "qrCodes"),
            where("qrCode", "==", data.qrCode) // ✅ CORRECT MATCH
          );

          const qrSnap = await getDocs(qrQ);

          if (!qrSnap.empty) {
            const qrData = qrSnap.docs[0].data();
            qrDate = qrData.validDateInput;
            qrStartTime = qrData.validStartTimeInput;
          }
        }

        return {
          id: doc.id,
          qrDate,
          qrStartTime,
          scannedAt: scanDate?.toLocaleTimeString() ?? "N/A",
          sortTime: scanDate?.getTime() ?? 0,
        };
      })
    );

    setAttendanceHistory(records.sort((a, b) => b.sortTime - a.sortTime));
  } catch (error) {
    console.error("Error loading attendance history:", error);
  }

  setLoading(false);
};




  useEffect(() => {
    fetchHistory();
  }, [user]);

  

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  }, []);

  const renderRow = ({ item, index }: any) => {
  const isLate = item.scannedAt > item.qrStartTime;

  return (
    <View
      style={[
        styles.tableRow,
        { backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff" },
      ]}
    >
      <Text style={[styles.cellText, { flex: 1.4 }]}>
        {(item.qrDate)}
      </Text>

      <Text style={[styles.cellText, { flex: 1 }]}>
        {item.qrStartTime}:00
      </Text>

      <Text style={[styles.cellText, { flex: 1 }]}>
        {item.scannedAt}
      </Text>

    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 28 }}>
    
        {/* Perfectly centered title */}
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>

  <Ionicons name="calendar-outline" size={22} color="#333" />
  <Text style={styles.title}>Attendance History</Text>
</View>
      

<View style={styles.cardContainer}>
      <View style={styles.tableHeader}>
  <Text style={[styles.headerText, { flex: 1.5 }]}>Date</Text>
  <Text style={[styles.headerText, { flex: 1 }]}>Start Time</Text>
  <Text style={[styles.headerText, { flex: 1 }]}>Time In</Text>
  

</View>


      <FlatList
        data={attendanceHistory}
        keyExtractor={(item) => item.id}
         renderItem={renderRow}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }


        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No attendance records found.</Text>
        )}
      />
    </View>
    </View>
  );

  

  
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

tableHeader: {
  flexDirection: "row",
  paddingVertical: 10,
  borderBottomWidth: 1.5,
  borderColor: "#ccc",
  backgroundColor: "#B02020",
  borderRadius: 10,
},

headerText: {
  color: "white",
  fontSize: 15,
  fontWeight: "700",
  textAlign: "center",
},

tableRow: {
  flexDirection: "row",
  paddingVertical: 14,
  alignItems: "center",
},

cellText: {
  fontSize: 15,
  color: "#555",
  textAlign: "center",
},

cardContainer: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 15,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 4,
},

titleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
  marginTop: 15,
},


badge: {
  flex: 0.8,
  paddingVertical: 4,
  borderRadius: 12,
  alignItems: "center",
},

onTime: {
  backgroundColor: "#e0f7e9",
},

late: {
  backgroundColor: "#fdecea",
},

badgeText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#333",
},


});
