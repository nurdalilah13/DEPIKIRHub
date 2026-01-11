import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";

import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

type EventDoc = {
  id: string;
  title?: string;
  startDateTime?: any;
  endDateTime?: any;
  description?: string;
  isOngoing?: boolean;
};

type AttendanceDoc = {
  id: string;
  faculty?: string;
  matric?: string;
  name?: string;
  qrCode?: string;
  time?: any;
  userId?: string;
};

const screenWidth = Dimensions.get("window").width - 40;

function toDateSafe(val: any): Date | null {
  if (!val) return null;
  if (typeof val?.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  return null;
}

function monthName(m: number) {
  return ["Jan", "Feb", "Mac", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
}

export default function AdminHome() {
  const router = useRouter();

  const [eventsThisMonthCount, setEventsThisMonthCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [announcementCount, setAnnouncementCount] = useState<number>(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventDoc[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const last4Months = useMemo(() => {
    const now = new Date();
    const labels: { label: string; year: number; month: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push({ label: monthName(d.getMonth()), year: d.getFullYear(), month: d.getMonth() });
    }
    return labels;
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Events Listener
    const eventsCol = collection(db, "events");
    // Inside your useEffect
const unsubEvents = onSnapshot(eventsCol, (snap) => {
  const allEvents: EventDoc[] = [];
  let monthCount = 0;

  // Get fresh references for current time
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Define the boundaries of the current month
  const firstOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0);
  const lastOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  snap.forEach((doc) => {
    const data = doc.data();
    const start = toDateSafe(data.startDateTime);
    const end = toDateSafe(data.endDateTime) || start; // Use start as fallback if end is missing

    if (start) {
      // Logic: Count if the event overlaps with this month at all
      const startsInMonth = start >= firstOfMonth && start <= lastOfMonth;
      const endsInMonth = end && end >= firstOfMonth && end <= lastOfMonth;
      const spansMonth = start <= firstOfMonth && end && end >= lastOfMonth;

      if (startsInMonth || endsInMonth || spansMonth) {
        monthCount += 1;
      }

      // Determine if currently ongoing for the UI badge
      const isOngoing = now >= start && (end ? now <= end : true);

      allEvents.push({
        id: doc.id,
        title: data.title ?? data.description ?? "Untitled",
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        description: data.description,
        isOngoing: isOngoing,
      });
    }
  });

  // Sort: Ongoing events first, then by date (excluding fully past events for the list)
  const activeOrFuture = allEvents
    .filter((e) => {
      const eEnd = toDateSafe(e.endDateTime) || toDateSafe(e.startDateTime);
      return eEnd ? eEnd >= now : false;
    })
    .sort((a, b) => {
      if (a.isOngoing && !b.isOngoing) return -1;
      if (!a.isOngoing && b.isOngoing) return 1;
      const sa = toDateSafe(a.startDateTime)?.getTime() ?? 0;
      const sb = toDateSafe(b.startDateTime)?.getTime() ?? 0;
      return sa - sb;
    });

  setEventsThisMonthCount(monthCount);
  setUpcomingEvents(activeOrFuture.slice(0, 5));
});

    // 2. Members Listener: Exclude "admin" role
    const usersCol = collection(db, "users");
    const unsubUsers = onSnapshot(usersCol, (snap) => {
      let count = 0;
      snap.forEach((doc) => {
        if (doc.data().role !== "Admin") {
          count++;
        }
      });
      setMemberCount(count);
    });

    // 3. Announcements Listener: visible status only
    const annCol = query(collection(db, "announcements"), where("status", "==", "visible"));
    const unsubAnn = onSnapshot(annCol, (snap) => {
      setAnnouncementCount(snap.size);
    });

    // 4. Attendance Listener
    const attCol = collection(db, "attendanceRecords");
    const unsubAtt = onSnapshot(attCol, (snap) => {
      const arr: AttendanceDoc[] = [];
      snap.forEach((doc) => {
        arr.push({ id: doc.id, ...(doc.data() as any) });
      });
      setAttendanceRecords(arr);
    });

    return () => {
      unsubEvents();
      unsubUsers();
      unsubAnn();
      unsubAtt();
    };
  }, []);

  // Filter Attendance for Current Month only
  const attendanceThisMonth = useMemo(() => {
    const now = new Date();
    return attendanceRecords.filter((rec) => {
      const t = toDateSafe(rec.time);
      return t && t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
    }).length;
  }, [attendanceRecords]);

  // Bar Chart Data (Last 4 Months)
  const monthlyCounts = useMemo(() => {
    const counts = last4Months.map(() => 0);
    attendanceRecords.forEach((rec) => {
      const t = toDateSafe(rec.time);
      if (!t) return;
      for (let i = 0; i < last4Months.length; i++) {
        const lm = last4Months[i];
        if (t.getFullYear() === lm.year && t.getMonth() === lm.month) {
          counts[i] += 1;
          break;
        }
      }
    });
    return counts;
  }, [attendanceRecords, last4Months]);

  const barData = {
    labels: last4Months.map((l) => l.label),
    datasets: [{ data: monthlyCounts }],
  };

  const pieData = [
    {
      name: "Attended",
      population: attendanceThisMonth,
      color: "#2E86FF",
      legendFontSize: 13,
      legendFontColor: "#000",
    },
    {
      name: "Absent/Goal",
      population: Math.max(0, 100 - attendanceThisMonth), // Assuming a monthly target of 100
      color: "#FF3B2F",
      legendFontSize: 13,
      legendFontColor: "#000",
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Grid */}
        <View style={styles.row}>
          <View style={styles.cardSmall}>
            <Ionicons name="calendar-outline" size={20} color="#B02020" />
            <Text style={styles.cardValue}>{eventsThisMonthCount}</Text>
            <Text style={styles.cardLabel}>Events (Month)</Text>
          </View>
          <View style={styles.cardSmall}>
            <Ionicons name="people-outline" size={20} color="#B02020" />
            <Text style={styles.cardValue}>{memberCount}</Text>
            <Text style={styles.cardLabel}>Users</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.cardSmall}>
            <Ionicons name="notifications-outline" size={20} color="#B02020" />
            <Text style={styles.cardValue}>{announcementCount}</Text>
            <Text style={styles.cardLabel}>Notifications</Text>
          </View>
          <View style={styles.cardSmall}>
            <Ionicons name="checkmark-done-outline" size={20} color="#B02020" />
            <Text style={styles.cardValue}>{attendanceThisMonth}</Text>
            <Text style={styles.cardLabel}>Att. (Month)</Text>
          </View>
        </View>

        {/* Schedule with Ongoing Badge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active & Upcoming Events</Text>
          {upcomingEvents.length === 0 ? (
            <Text style={{ color: "#777" }}>No active events</Text>
          ) : (
            upcomingEvents.map((ev) => {
              const s = toDateSafe(ev.startDateTime);
              const e = toDateSafe(ev.endDateTime);

              // Helper to show range or single date
              const formatDateRange = () => {
                if (!s) return "TBA";
                const startDateStr = s.toLocaleDateString();
                if (!e || startDateStr === e.toLocaleDateString()) {
                  return startDateStr;
                }
                return `${startDateStr} - ${e.toLocaleDateString()}`;
              };

              return (
                <View key={ev.id} style={[styles.eventItem, ev.isOngoing && styles.ongoingEvent]}>
                  <Ionicons 
                    name={ev.isOngoing ? "play-circle" : "calendar"} 
                    size={18} 
                    color={ev.isOngoing ? "#28a745" : "#B02020"} 
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.eventText, ev.isOngoing && styles.ongoingText]}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventDate}>
                      <Ionicons name="time-outline" size={12} /> {formatDateRange()}
                    </Text>
                  </View>
                  {ev.isOngoing && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>ONGOING</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Attendance</Text>
          <BarChart
            data={barData}
            width={screenWidth}
            height={200}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(176, 32, 32, ${opacity})`,
              labelColor: (opacity = 1) => `#333`,
            }}
            style={styles.chart}
          />
        </View>

        {/* Monthly Pie Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Month Breakdown</Text>
          <PieChart
            data={pieData}
            width={screenWidth}
            height={180}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.chatButton} onPress={() => router.push("/adminFaq")}>
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
      </TouchableOpacity>
    </View>
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
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  scrollContainer: { padding: 10, paddingBottom: 100 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cardSmall: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    margin: 5,
    borderRadius: 12,
    elevation: 3,
  },
  cardValue: { fontSize: 20, fontWeight: "bold", marginTop: 5 },
  cardLabel: { fontSize: 12, color: "#666" },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  eventItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 10, 
    padding: 10, 
    borderRadius: 8,
    backgroundColor: "#F9F9F9"
  },
  ongoingEvent: { 
    backgroundColor: "#E8F5E9", 
    borderColor: "#28A745", 
    borderWidth: 1 
  },
  eventText: { fontSize: 14, color: "#333", fontWeight: "600" },
  ongoingText: { color: "#1B5E20" },
  eventDate: { fontSize: 12, color: "#777" },
  badge: { 
    backgroundColor: "#28A745", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4 
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  chart: { marginVertical: 8, borderRadius: 16 },
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
});