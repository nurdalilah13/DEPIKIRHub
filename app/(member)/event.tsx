import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
  Linking,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db, auth } from "../../firebase";
import { collection,
  onSnapshot,
  addDoc,
serverTimestamp,
query,
orderBy,
deleteDoc,
doc,
updateDoc,
increment, DocumentData,
getDoc, setDoc } from "firebase/firestore";

interface EventItem {
  id: string;
  title?: string;
  startDateTime?: any;
  endDateTime?: any;
  description?: string;
  image?: string | null;
  document?: string | null;
  
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function MemberEventsScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
const [comments, setComments] = useState<any[]>([]);
const [commentText, setCommentText] = useState("");
const [commentLoading, setCommentLoading] = useState(false);
const [replyText, setReplyText] = useState("");
const [replyTo, setReplyTo] = useState<string | null>(null);
const [currentUserData, setCurrentUserData] = useState<any>(null);
const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
const [repliesMap, setRepliesMap] = useState<Record<string, any[]>>({});
const [userRole, setUserRole] = useState<"Staff" | "staff" | null>(null);
const [userName, setUserName] = useState("");

  const isStaff = userRole === "Staff";


  // NEW STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("upcoming"); // upcoming | today | past

  // Timestamp parser
  const parseTimestamp = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === "object" && typeof val.toDate === "function") return val.toDate();
    if (typeof val === "object" && val.seconds !== undefined)
      return new Date(val.seconds * 1000 + (val.nanoseconds ?? 0) / 1000000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString() : "-");
  const fmtTime = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

  useEffect(() => {
    const q = collection(db, "events");
    const unsub = onSnapshot(
      q,
      (snap) => {
        try {
          const list: EventItem[] = snap.docs.map((d) => {
            const data = (d.data() as DocumentData) ?? {};
            return {
              id: d.id,
              title: String(data.title ?? "Untitled"),
              startDateTime: data.startDateTime ?? null,
              endDateTime: data.endDateTime ?? null,
              attachments: Array.isArray(data.attachments) ? data.attachments : [],
              description: data.description,
              image: data.image || null,
              document: data.document || null,
            };
          });

          list.sort(
            (a, b) =>
              (parseTimestamp(a.startDateTime)?.getTime() ?? 0) -
              (parseTimestamp(b.startDateTime)?.getTime() ?? 0)
          );

          setEvents(list);
        } catch (e) {
          console.error("onSnapshot mapping error:", e);
          setEvents([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Failed to load events:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);
useEffect(() => {
  if (!modalEvent) return;

  const q = query(
    collection(db, "events", modalEvent.id, "comments"),
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setComments(list);
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
}, [expandedCommentId]);

useEffect(() => {
  if (!user?.uid) return;

  const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (snap.exists()) {
      setCurrentUserData(snap.data());
    }
  });

  return () => unsub();
}, [user?.uid]);

const submitComment = async () => {
  if (!commentText.trim() || !modalEvent) return;
  setCommentLoading(true);

  await addDoc(collection(db, "events", modalEvent.id, "comments"), {
  text: commentText.trim(),
  userId: user?.uid,
  userName: currentUserData?.name,
  likes: 0,
  createdAt: serverTimestamp(),
});


  setCommentText("");
  setCommentLoading(false);
};

const submitReply = async (commentId: string) => {
  if (!replyText.trim() || !modalEvent || !user?.uid) return;

  await addDoc(
    collection(db, "events", modalEvent.id, "comments", commentId, "replies"),
    {
      text: replyText.trim(),
      userId: user.uid,
      userName: currentUserData?.name,
      likes: 0,
      createdAt: serverTimestamp(),
    }
  );

  setReplyText("");
  setExpandedCommentId(null);
};



const likeComment = async (commentId: string) => {
  if (!user?.uid || !modalEvent) return;

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
    // 🔻 UNLIKE
    await deleteDoc(likeRef);
    await updateDoc(commentRef, {
      likes: increment(-1),
    });
  } else {
    // ❤️ LIKE
    await setDoc(likeRef, {
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(commentRef, {
      likes: increment(1),
    });
  }
};



const deleteComment = async (commentId: string) => {
await deleteDoc(doc(db, "events", modalEvent!.id, "comments", commentId));
};

 // ===================== ADD THIS HELPER =====================
const getEventEnd = (event: EventItem): Date | null => {
  return (
    parseTimestamp(event.endDateTime) ??
    parseTimestamp(event.startDateTime)
  );
};

// ===================== FIX FILTER LOGIC =====================
const filteredEvents = events.filter((event) => {
  const start = parseTimestamp(event.startDateTime);
  const end = getEventEnd(event);
  if (!start || !end) return false;

  const now = new Date();

  const matchesSearch = event.title
    ?.toLowerCase()
    .includes(searchQuery.toLowerCase());

  let matchesFilter = true;

  if (filterType === "ongoing") {
    matchesFilter = start <= now && end >= now; // ✅ ongoing events
  } else if (filterType === "upcoming") {
    matchesFilter = start > now;
  } else if (filterType === "past") {
    matchesFilter = end < now;
  }

  return matchesSearch && matchesFilter;
});


  const likeReply = async (commentId: string, replyId: string) => {
  if (!user?.uid || !modalEvent) return;

  const likeRef = doc(
    db,
    "events",
    modalEvent.id,
    "comments",
    commentId,
    "replies",
    replyId,
    "likes",
    user.uid
  );

  const replyRef = doc(
    db,
    "events",
    modalEvent.id,
    "comments",
    commentId,
    "replies",
    replyId
  );

  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    // UNLIKE
    await deleteDoc(likeRef);
    await updateDoc(replyRef, { likes: increment(-1) });
  } else {
    // LIKE
    await setDoc(likeRef, {
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(replyRef, { likes: increment(1) });
  }
};

  const deleteReply = async (commentId: string, replyId: string) => {
  if (!modalEvent) return;

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
};




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


  const openDetails = (item: EventItem) => {
    setModalEvent(item);
    setModalVisible(true);
  };

  // ===================== FIX EVENT LIST DISPLAY =====================
const renderItem = ({ item }: { item: EventItem }) => {
  const start = parseTimestamp(item.startDateTime);
  const end = getEventEnd(item);

  const dateDisplay =
    start && end && fmtDate(start) === fmtDate(end)
      ? fmtDate(start)
      : end
      ? `${fmtDate(start)} – ${fmtDate(end)}`
      : fmtDate(start);

  const timeDisplay =
    start && end && fmtTime(start) === fmtTime(end)
      ? fmtTime(start)
      : end
      ? `${fmtTime(start)} – ${fmtTime(end)}`
      : fmtTime(start);

  return (
    <View style={styles.eventRow}>
      <Ionicons
        name={iconByTitle(item.title ?? "") as any}
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
      <TouchableOpacity onPress={() => openDetails(item)} style={styles.arrowTouch}>
        <Ionicons name="arrow-forward-outline" size={18} color="#555" />
      </TouchableOpacity>
    </View>
  );
};

const canDeleteComment = (c: any) =>
    isStaff || c.userId === user?.uid;

  const canDeleteReply = (r: any) =>
    isStaff || r.userId === user?.uid;


  const DetailsModal = () => {
    if (!modalEvent) return null;

    // ===================== FIX MODAL DATE/TIME =====================
const start = parseTimestamp(modalEvent.startDateTime);
const end = getEventEnd(modalEvent);

const dateDisplay =
  start && end && fmtDate(start) === fmtDate(end)
    ? fmtDate(start)
    : end
    ? `${fmtDate(start)} – ${fmtDate(end)}`
    : fmtDate(start);

const timeDisplay =
  start && end && fmtTime(start) === fmtTime(end)
    ? fmtTime(start)
    : end
    ? `${fmtTime(start)} – ${fmtTime(end)}`
    : fmtTime(start);

  };

  return (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="white" />

    {/* HEADER */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.push("/memberMenu")}>
        <Ionicons name="menu" size={26} color="black" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>DEPIKIRHub</Text>
      <TouchableOpacity onPress={() => router.push("/memberProfile")}>
        <Ionicons name="person-circle-outline" size={28} color="black" />
      </TouchableOpacity>
    </View>

    {/* EVENTS CARD */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Events</Text>
      <View style={styles.cardDivider} />

      {/* SEARCH BAR */}
      <View
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "#999", fontSize: 13 }}>Search</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events..."
          style={{ fontSize: 15, paddingVertical: 2 }}
        />
      </View>

      {/* FILTER BUTTONS */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        {["upcoming", "ongoing", "past"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilterType(item)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: filterType === item ? "#B02020" : "#EEE",
            }}
          >
            <Text
              style={{
                color: filterType === item ? "white" : "black",
                fontWeight: "600",
              }}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="small" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "#666" }}>
              No events found.
            </Text>
          }
        />
      )}
    </View>

    {/* ✅ SINGLE MODAL (CORRECT PLACE) */}
    <Modal visible={modalVisible} animationType="slide" transparent>
  <View style={styles.modalBackground}>
    <View style={styles.modalContainer}>
      <ScrollView>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={28} />
        </TouchableOpacity>

        {modalEvent && (
          <>
            <Text style={styles.modalTitle}>{modalEvent.title}</Text>

            {(() => {
  const start = parseTimestamp(modalEvent.startDateTime);
  const end = getEventEnd(modalEvent);

  const dateDisplay =
    start && end && fmtDate(start) === fmtDate(end)
      ? fmtDate(start)
      : end
      ? `${fmtDate(start)} – ${fmtDate(end)}`
      : fmtDate(start);

  const timeDisplay =
    start && end && fmtTime(start) === fmtTime(end)
      ? fmtTime(start)
      : end
      ? `${fmtTime(start)} – ${fmtTime(end)}`
      : fmtTime(start);

  return (
    <Text style={styles.modalContent}>
      Date: {dateDisplay}{"\n"}
      Time: {timeDisplay}
    </Text>
  );
})()}

            {modalEvent.description && (
              <Text style={styles.modalContent}>
                {modalEvent.description}
              </Text>
            )}

            {modalEvent.image && (
              <Image
                source={{ uri: modalEvent.image }}
                style={styles.modalImage}
              />
            )}

            <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 10 }}>
              Comments
            </Text>

            {/* COMMENT INPUT */}
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
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>

            {/* COMMENTS LIST */}
            {comments.length === 0 ? (
              <Text style={{ color: "#777", marginTop: 8 }}>
                No comments yet.
              </Text>
            ) : (
              comments.map((c) => (
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

                  {/* REPLY INPUT */}
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

                  {/* REPLIES */}
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
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F3F3" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "white",
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  card: {
    flex: 1,
    backgroundColor: "white",
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  cardDivider: { height: 1, backgroundColor: "#EEE", marginBottom: 10 },
  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: "#222" },
  eventSub: { fontSize: 13, color: "#555", marginTop: 3 },
  separator: { height: 1, backgroundColor: "#F1F1F1", marginVertical: 6 },
  arrowTouch: { paddingHorizontal: 10, paddingVertical: 6 },

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
  closeButton: { alignSelf: "flex-end", padding: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#B02020" },
  modalContent: { fontSize: 15, color: "#333", marginBottom: 10 },
  modalImage: { width: SCREEN_WIDTH * 0.8, height: 180, borderRadius: 10, marginBottom: 12 },
  documentButton: {
    flexDirection: "row",
    backgroundColor: "#B02020",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  documentText: { color: "white", fontWeight: "bold" },
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
    padding: 6,
    borderRadius: 6,
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
