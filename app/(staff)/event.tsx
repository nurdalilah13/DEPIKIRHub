import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
  TextInput, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db, auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  DocumentData,
  addDoc, serverTimestamp, updateDoc, increment, getDoc, setDoc, query, orderBy,
} from "firebase/firestore";

interface EventItem {
  id: string;
  title: string;
  startDateTime?: any; // Firestore Timestamp or raw date
  endDateTime?: any;
  type?: string;
  [key: string]: any; // allow other optional fields (description, location, etc.)
}

export default function EventManagementScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [repliesMap, setRepliesMap] = useState<Record<string, any[]>>({});
  const [loadingComment, setLoadingComment] = useState(false);
  const [userRole, setUserRole] = useState<"Staff" | "staff" | null>(null);
  const [userName, setUserName] = useState("");

  const isStaff = userRole === "Staff";
  // Helper: convert Firestore Timestamp or other into JS Date (safe)
  const parseTimestamp = (val: any): Date | null => {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === "function") {
      return val.toDate();
    }
    if (val.seconds !== undefined) {
      // Firestore-like object
      return new Date(val.seconds * 1000 + (val.nanoseconds ?? 0) / 1000000);
    }
    try {
      return new Date(val);
    } catch {
      return null;
    }
  };

  // Format date/time strings
  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString() : "-";
  const fmtTime = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserRole(snap.data().role);
        setUserName(snap.data().name ?? user.email);
      }
    };

    fetchUser();
  }, [user]);

  // Load events from Firestore
  useEffect(() => {
    const q = collection(db, "events");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: EventItem[] = snapshot.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          title: data.title ?? "Untitled",
          startDateTime: data.startDateTime ?? null,
          endDateTime: data.endDateTime ?? null,
          type: data.type ?? "meeting",
          ...data, // keep other fields (description, location) if present
        } as EventItem;
      });
      // Optionally sort by startDateTime
      list.sort((a, b) => {
        const ad = parseTimestamp(a.startDateTime) ?? new Date(0);
        const bd = parseTimestamp(b.startDateTime) ?? new Date(0);
        return ad.getTime() - bd.getTime();
      });
      setEvents(list);
    });

    return () => unsubscribe();
  }, []);

   useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
      })) as EventItem[];

      list.sort((a, b) => {
        const ad = parseTimestamp(a.startDateTime)?.getTime() ?? 0;
        const bd = parseTimestamp(b.startDateTime)?.getTime() ?? 0;
        return ad - bd;
      });

      setEvents(list);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!modalEvent) return;

    const q = query(
      collection(db, "events", modalEvent.id, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [modalEvent]);

  useEffect(() => {
  if (!modalEvent || !expandedCommentId) return;

  const q = query(
    collection(
      db,
      "events",
      modalEvent.id,
      "comments",
      expandedCommentId,
      "replies"
    ),
    orderBy("createdAt", "asc")
  );

  const unsub = onSnapshot(q, (snap) => {
    setRepliesMap((prev) => ({
      ...prev,
      [expandedCommentId]: snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
    }));
  });

  return () => unsub();
}, [expandedCommentId, modalEvent]); // ✅ add modalEvent

  // Icon selection based on title keywords
  const iconByTitle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("meeting")) return "calendar-outline";
    if (t.includes("training") || t.includes("course") || t.includes("class"))
      return "pin-outline";
    if (t.includes("competition") || t.includes("contest") || t.includes("challenge"))
      return "trophy-outline";
    if (t.includes("maintenance")) return "construct-outline";
    if (t.includes("webinar") || t.includes("workshop")) return "bookmark-outline";
    if (t.includes("ceremony") || t.includes("graduation")) return "ribbon-outline";
    return "extension-puzzle-outline";
  };

  // Open modal for details (called when arrow pressed)
  const openDetails = (item: EventItem) => {
    setModalEvent(item);
    setModalVisible(true);
  };

  // Delete event
  const handleDelete = () => {
    if (!selectedEvent) return Alert.alert("Select an event to delete");
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${selectedEvent.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", selectedEvent.id));
              setSelectedEvent(null);
              Alert.alert("Deleted", "Event removed successfully");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to delete event");
            }
          },
        },
      ]
    );
  };

  // Edit event
  const handleEdit = () => {
    if (!selectedEvent) return Alert.alert("Select an event to edit");
    router.push(`/staffEditEvent?id=${selectedEvent.id}`);
  };

  // Render a single event row
  const renderItem = ({ item }: { item: EventItem }) => {
    const start = parseTimestamp(item.startDateTime);
    const end = parseTimestamp(item.endDateTime);

    const startDateStr = fmtDate(start);
    const endDateStr = end ? fmtDate(end) : "-";
    const startTimeStr = fmtTime(start);
    const endTimeStr = end ? fmtTime(end) : "-";

    // Determine date display (if same date, show once)
    const dateDisplay =
      start && end && startDateStr === endDateStr
        ? startDateStr
        : end
        ? `${startDateStr} – ${endDateStr}`
        : startDateStr;

    // Determine time display (if same time, show once)
    const timeDisplay =
      start && end && startTimeStr === endTimeStr
        ? startTimeStr
        : end
        ? `${startTimeStr} – ${endTimeStr}`
        : startTimeStr;

    return (
      <TouchableOpacity
        style={[
          styles.eventRow,
          selectedEvent?.id === item.id && {
            backgroundColor: "#FFECEC",
            borderRadius: 10,
          },
        ]}
        onPress={() => setSelectedEvent(item)}
        activeOpacity={0.9}
      >
        <Ionicons
          name={iconByTitle(item.title) as any}
          size={22}
          color="#333"
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventSub}>
            {dateDisplay} • {timeDisplay}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => openDetails(item)}
          style={styles.arrowTouch}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-forward-outline" size={18} color="#555" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const canDeleteComment = (c: any) =>
    isStaff || c.userId === user?.uid;

  const canDeleteReply = (r: any) =>
    isStaff || r.userId === user?.uid;

   const submitComment = async () => {
    if (!commentText.trim() || !modalEvent || !user) return;
    setLoadingComment(true);

    await addDoc(collection(db, "events", modalEvent.id, "comments"), {
      text: commentText.trim(),
      userId: user.uid,
      userName: userName,
      role: userRole,
      likes: 0,
      createdAt: serverTimestamp(),
    });

    setCommentText("");
    setLoadingComment(false);
  };

  const submitReply = async (commentId: string) => {
    if (!replyText.trim() || !modalEvent || !user) return;

    await addDoc(
      collection(db, "events", modalEvent.id, "comments", commentId, "replies"),
      {
        text: replyText.trim(),
        userId: user.uid,
        userName: userName,
        role: userRole,
        likes: 0,
        createdAt: serverTimestamp(),
      }
    );

    setReplyText("");
    setExpandedCommentId(null);
  };

  const likeComment = async (commentId: string) => {
    if (!user || !modalEvent) return;

    const likeRef = doc(
      db,
      "events",
      modalEvent.id,
      "comments",
      commentId,
      "likes",
      user.uid
    );

    const commentRef = doc(
      db,
      "events",
      modalEvent.id,
      "comments",
      commentId
    );

    const snap = await getDoc(likeRef);

    if (snap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(commentRef, { likes: increment(-1) });
    } else {
      await setDoc(likeRef, { userId: user.uid });
      await updateDoc(commentRef, { likes: increment(1) });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!modalEvent) return;

    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(
            doc(db, "events", modalEvent.id, "comments", commentId)
          );
        },
      },
    ]);
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    if (!modalEvent) return;

    Alert.alert("Delete Reply", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(
            doc(
              db,
              "events",
              modalEvent.id,
              "comments",
              commentId,
              "replies",
              replyId
            )
          );
        },
      },
    ]);
  };

  // Modal content renderer
  const DetailsModal = () => {
    if (!modalEvent) return null;
    const start = parseTimestamp(modalEvent.startDateTime);
    const end = parseTimestamp(modalEvent.endDateTime);
    const startDateStr = fmtDate(start);
    const endDateStr = end ? fmtDate(end) : null;
    const startTimeStr = fmtTime(start);
    const endTimeStr = end ? fmtTime(end) : null;

    const dateDisplay =
      start && end && startDateStr === endDateStr
        ? startDateStr
        : end
        ? `${startDateStr} – ${endDateStr}`
        : startDateStr;

    const timeDisplay =
      start && end && startTimeStr === endTimeStr
        ? startTimeStr
        : end
        ? `${startTimeStr} – ${endTimeStr}`
        : startTimeStr;

  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/staffMenu")}>
          <Ionicons name="menu" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPIKIRHub</Text>
        <TouchableOpacity onPress={() => router.push("/staffProfile")}>
        <Ionicons name="person-circle-outline" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/staffAddEvent")}
        >
          <Ionicons name="add" size={22} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
          <Ionicons name="pencil" size={22} color="#444" />
        </TouchableOpacity>
      </View>

      {/* EVENT LIST */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Event Management</Text>
        <View style={styles.cardDivider} />

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {modalEvent && (
  <Modal
    visible={modalVisible}
    animationType="slide"
    transparent
    onRequestClose={() => setModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{modalEvent.title}</Text>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={22} />
          </TouchableOpacity>
        </View>

        {(() => {
          const start = parseTimestamp(modalEvent.startDateTime);
          const end = parseTimestamp(modalEvent.endDateTime);

          const startDate = fmtDate(start);
          const endDate = end ? fmtDate(end) : null;
          const startTime = fmtTime(start);
          const endTime = end ? fmtTime(end) : null;

          const dateDisplay =
            start && end && startDate === endDate
              ? startDate
              : end
              ? `${startDate} – ${endDate}`
              : startDate;

          const timeDisplay =
            start && end && startTime === endTime
              ? startTime
              : end
              ? `${startTime} – ${endTime}`
              : startTime;

          return (
            <ScrollView>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Date</Text>
                <Text style={styles.modalValue}>{dateDisplay}</Text>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Time</Text>
                <Text style={styles.modalValue}>{timeDisplay}</Text>
              </View>

              {modalEvent.location && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{modalEvent.location}</Text>
                </View>
              )}

              {modalEvent.description && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Description</Text>
                  <Text style={styles.modalValue}>{modalEvent.description}</Text>
                </View>
              )}

              {/* COMMENTS */}
              <Text style={{ marginTop: 14, fontWeight: "700" }}>Comments</Text>

              <View style={styles.commentBox}>
  <TextInput
    value={commentText}
    onChangeText={setCommentText}
    placeholder="Write a comment..."
    multiline
    style={styles.commentInput}
  />

  <TouchableOpacity
    onPress={submitComment}
    style={styles.commentButton}
    disabled={loadingComment}
  >
    {loadingComment ? (
      <ActivityIndicator color="white" />
    ) : (
      <Text style={{ color: "white", fontWeight: "bold" }}>Send</Text>
    )}
  </TouchableOpacity>
</View>

              {comments.length === 0 ? (
                                <Text style={{ color: "#777", marginTop: 8 }}>
                                  No comments yet.
                                </Text>
                              ) : (comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Text style={{ fontWeight: "600" }}>{c.userName}</Text>

  {c.role === "Staff" && (
    <View style={styles.staffBadge}>
      <Text style={styles.staffBadgeText}>STAFF</Text>
    </View>
  )}
</View>
<Text>{c.text}</Text>
                  <View style={{ flexDirection: "row", marginTop: 6 }}>
                    <TouchableOpacity onPress={() => likeComment(c.id)}>
                      <Text>❤️ {c.likes || 0}</Text>
                    </TouchableOpacity>

                    {canDeleteComment(c) && (
                      <TouchableOpacity onPress={() => deleteComment(c.id)}>
                        <Text style={{ marginLeft: 12, color: "red" }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() =>
                        setExpandedCommentId(
                          expandedCommentId === c.id ? null : c.id
                        )
                      }
                    >
                      <Text style={{ marginLeft: 12 }}>Reply</Text>
                    </TouchableOpacity>
                  </View>

                  {expandedCommentId === c.id && (
                    <>
                      <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write reply..."
                        style={styles.replyInput}
                      />
                      <TouchableOpacity onPress={() => submitReply(c.id)}>
                        <Text style={{ color: "#B02020" }}>Send Reply</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {repliesMap[c.id]?.map((r) => (
                    <View key={r.id} style={styles.replyBox}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Text style={{ fontWeight: "600" }}>{r.userName}</Text>

  {r.role === "Staff" && (
    <View style={styles.staffBadge}>
      <Text style={styles.staffBadgeText}>STAFF</Text>
    </View>
  )}
</View>

<Text>{r.text}</Text>
                      {canDeleteReply(r) && (
                        <TouchableOpacity
                          onPress={() => deleteReply(c.id, r.id)}
                        >
                          <Text style={{ color: "red" }}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )))}
            </ScrollView>
          );
        })()}
      </View>
    </View>
  </Modal>
)}
      <DetailsModal />
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#EEE",
    marginHorizontal: 7,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
   commentBox: {
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#DDD",
  borderRadius: 8,
  padding: 8,
},
commentInput: {
  minHeight: 60,
  fontSize: 14,
},
commentButton: {
  backgroundColor: "#B02020",
  paddingVertical: 8,
  borderRadius: 6,
  alignItems: "center",
  marginTop: 6,
},
commentItem: {
  backgroundColor: "#F5F5F5",
  padding: 8,
  borderRadius: 6,
  marginTop: 6,
},
replyInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  replyBox: {
    marginLeft: 20,
    marginTop: 6,
    backgroundColor: "#EEE",
    padding: 8,
    borderRadius: 6,
  },
  card: {
    flex: 1,
    backgroundColor: "white",
    marginHorizontal: 15,
    marginTop: 5,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  cardDivider: { height: 1, backgroundColor: "#EEE", marginBottom: 10 },
  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  eventTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  eventSub: { fontSize: 13, color: "#555", marginTop: 2 },
  separator: { height: 1, backgroundColor: "#F1F1F1", marginVertical: 5 },
  chatButton: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B02020",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  // arrow touch area
  arrowTouch: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
  modalRow: {
    marginTop: 12,
  },
  modalLabel: { fontSize: 12, color: "#777", marginBottom: 4 },
  modalValue: { fontSize: 15, color: "#222" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  staffBadge: {
  backgroundColor: "#B02020",
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  marginLeft: 6,
},

staffBadgeText: {
  color: "white",
  fontSize: 10,
  fontWeight: "700",
},

});
