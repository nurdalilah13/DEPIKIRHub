//chatscreem
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Alert,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { db, auth } from "@/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    chatRoomId: string;
    targetUserName: string;
    targetUserId?: string;
  }>();
  
  const chatRoomId = params.chatRoomId as string;
  const targetUserName = params.targetUserName as string;
  const targetUserId = params.targetUserId as string | undefined;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const uid = auth.currentUser?.uid;
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Message options modal
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Edit message states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState("");

  const flatListRef = useRef<FlatList>(null);

  // Fetch current user's name from Firestore
  useEffect(() => {
    if (!uid) return;

    const fetchCurrentUserName = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const userName = userDoc.data().name as string;
          if (userName) {
            setCurrentUserName(userName);
          }
        }
      } catch (error) {
        console.error("Error fetching current user name:", error);
      }
    };

    fetchCurrentUserName();
  }, [uid]);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (!uid || !chatRoomId) return;

    const markAsRead = async () => {
      const otherUserId =
        targetUserId ||
        (chatRoomId as string)
          .split("_")
          .filter((id) => id !== uid)[0] ||
        "";

      if (otherUserId) {
        try {
          await updateDoc(
            doc(db, "messages", uid, "chatList", otherUserId),
            { unreadCount: 0 }
          );
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    };

    markAsRead();
  }, [uid, chatRoomId, targetUserId]);

  // Load messages
  useEffect(() => {
    if (!chatRoomId) return;

    const ref = collection(db, "chatRooms", chatRoomId as string, "messages");
    const q = query(ref, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);
    });

    return () => unsub();
  }, [chatRoomId]);

  // Check if message can be edited (within 1 hour)
  const canEditMessage = (message: any) => {
    if (!message.createdAt || message.senderId !== uid) return false;
    
    try {
      const messageDate = message.createdAt.toDate 
        ? message.createdAt.toDate() 
        : new Date(message.createdAt.seconds * 1000);
      
      const now = new Date();
      const hourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
      const timeDiff = now.getTime() - messageDate.getTime();
      
      return timeDiff < hourInMs;
    } catch (error) {
      console.error("Error checking edit time:", error);
      return false;
    }
  };

  // Open options modal
  const handleLongPress = (message: any) => {
    if (message.senderId !== uid) return;
    
    setSelectedMessage(message);
    setIsOptionsModalVisible(true);
  };

  // Handle edit option
  const handleEditOption = () => {
    setIsOptionsModalVisible(false);
    
    if (!canEditMessage(selectedMessage)) {
      Alert.alert(
        "Cannot Edit",
        "Messages can only be edited within 1 hour of sending.",
        [{ text: "OK" }]
      );
      return;
    }

    setEditingMessage(selectedMessage);
    setEditText(selectedMessage.text);
    setIsEditModalVisible(true);
  };

  // Handle delete option
  const handleDeleteOption = () => {
    setIsOptionsModalVisible(false);

    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the message from Firestore
              await deleteDoc(
                doc(db, "chatRooms", chatRoomId as string, "messages", selectedMessage.id)
              );

              // If this was the last message, update chat lists
              const lastMessage = messages[messages.length - 1];
              if (lastMessage && lastMessage.id === selectedMessage.id) {
                const otherUserId =
                  targetUserId ||
                  (chatRoomId as string)
                    .split("_")
                    .filter((id) => id !== uid)[0] ||
                  "";

                const now = Timestamp.fromDate(new Date());
                
                // Find the new last message
                const remainingMessages = messages.filter(m => m.id !== selectedMessage.id);
                const newLastMessage = remainingMessages.length > 0 
                  ? remainingMessages[remainingMessages.length - 1].text 
                  : "No messages yet";

                // Update for current user
                if (uid && otherUserId) {
                  await updateDoc(
                    doc(db, "messages", uid, "chatList", otherUserId),
                    {
                      lastMessage: newLastMessage,
                      updatedAt: now,
                    }
                  );

                  // Update for other user
                  await updateDoc(
                    doc(db, "messages", otherUserId, "chatList", uid),
                    {
                      lastMessage: newLastMessage,
                      updatedAt: now,
                    }
                  );
                }
              }
            } catch (error) {
              console.error("Error deleting message:", error);
              Alert.alert("Error", "Failed to delete message. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Save edited message
  const saveEdit = async () => {
    if (!editText.trim() || !editingMessage || !uid) return;

    try {
      const messageRef = doc(
        db,
        "chatRooms",
        chatRoomId as string,
        "messages",
        editingMessage.id
      );

      await updateDoc(messageRef, {
        text: editText,
        isEdited: true,
        editedAt: Timestamp.fromDate(new Date()),
      });

      // Update last message in chat lists if this was the last message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.id === editingMessage.id) {
        const otherUserId =
          targetUserId ||
          (chatRoomId as string)
            .split("_")
            .filter((id) => id !== uid)[0] ||
          "";

        const now = Timestamp.fromDate(new Date());

        // Update for current user
        await updateDoc(
          doc(db, "messages", uid, "chatList", otherUserId),
          {
            lastMessage: editText,
            updatedAt: now,
          }
        );

        // Update for other user
        if (otherUserId) {
          await updateDoc(
            doc(db, "messages", otherUserId, "chatList", uid),
            {
              lastMessage: editText,
              updatedAt: now,
            }
          );
        }
      }

      setIsEditModalVisible(false);
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Error editing message:", error);
      Alert.alert("Error", "Failed to edit message. Please try again.");
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setIsEditModalVisible(false);
    setEditingMessage(null);
    setEditText("");
  };

  // Helper function to check if two dates are on different days
  const isDifferentDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() !== date2.getDate() ||
      date1.getMonth() !== date2.getMonth() ||
      date1.getFullYear() !== date2.getFullYear()
    );
  };

  // Helper function to format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Today";
    } else if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Track keyboard and scroll to bottom when keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom after keyboard animation
        setTimeout(() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, Platform.OS === "ios" ? 100 : 300);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [messages]);

  // Send message
  const send = async () => {
    if (!text.trim() || !uid) return;

    // Determine the other participant's id from params; fallback to chatRoomId parsing
    const otherUserId =
      targetUserId ||
      (chatRoomId as string)
        .split("_")
        .filter((id) => id !== uid)[0] ||
      "";

    const now = Timestamp.fromDate(new Date());

    await addDoc(collection(db, "chatRooms", chatRoomId as string, "messages"), {
      text,
      senderId: uid,
      createdAt: now,
      isEdited: false,
    });

    // Update lastMessage for current user (no unread count change for sender)
    await setDoc(
      doc(db, "messages", uid, "chatList", otherUserId),
      {
        lastMessage: text,
        updatedAt: now,
        name: targetUserName || "Unknown User",
        chatRoomId,
        unreadCount: 0,
      },
      { merge: true }
    );

    // Update lastMessage for the other user
    if (otherUserId) {
      // Fetch current user's name if not already loaded
      let userName = currentUserName;
      if (!userName && uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            userName = (userDoc.data().name as string) || "Unknown User";
            setCurrentUserName(userName);
          }
        } catch (error) {
          console.error("Error fetching user name:", error);
          userName = "Unknown User";
        }
      }
      
      // Get current unread count for the other user
      const otherUserChatRef = doc(db, "messages", otherUserId, "chatList", uid);
      const otherUserChatDoc = await getDoc(otherUserChatRef);
      const currentUnreadCount = otherUserChatDoc.exists() 
        ? (otherUserChatDoc.data().unreadCount || 0) 
        : 0;
      
      await setDoc(
        otherUserChatRef,
        {
          lastMessage: text,
          updatedAt: now,
          name: userName || "Unknown User",
          chatRoomId,
          unreadCount: currentUnreadCount + 1,
        },
        { merge: true }
      );
    }

    setText("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{targetUserName}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item, index }) => {
            const mine = item.senderId === uid;
            
            // Format timestamp correctly
            let timeString = "";
            let currentDate: Date | null = null;
            let showDateHeader = false;
            
            if (item.createdAt) {
              try {
                const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt.seconds * 1000);
                
                // If device timezone is wrong, add offset manually
                // Adjust timezoneOffsetHours based on your timezone (e.g., 8 for UTC+8)
                const timezoneOffsetHours = 8; // Change this to your timezone offset
                const adjustedDate = new Date(date.getTime() + (timezoneOffsetHours * 60 * 60 * 1000));
                
                currentDate = adjustedDate;
                
                const hours = adjustedDate.getHours();
                const minutes = adjustedDate.getMinutes();
                
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                const displayMinutes = minutes.toString().padStart(2, '0');
                
                timeString = `${displayHours}:${displayMinutes} ${ampm}`;
                
                // Check if we should show a date header
                if (index === 0) {
                  showDateHeader = true;
                } else {
                  const prevMessage = messages[index - 1];
                  if (prevMessage.createdAt) {
                    const prevDate = prevMessage.createdAt.toDate ? prevMessage.createdAt.toDate() : new Date(prevMessage.createdAt.seconds * 1000);
                    const prevAdjustedDate = new Date(prevDate.getTime() + (timezoneOffsetHours * 60 * 60 * 1000));
                    showDateHeader = isDifferentDay(adjustedDate, prevAdjustedDate);
                  }
                }
              } catch (error) {
                console.error("Error formatting timestamp:", error);
                timeString = "";
              }
            }
            
            return (
              <>
                {showDateHeader && currentDate && (
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item)}
                  disabled={!mine}
                  activeOpacity={mine ? 0.7 : 1}
                >
                  <View style={[styles.msgBox, mine ? styles.myMsg : styles.otherMsg]}>
                    <Text style={styles.msgText}>{item.text}</Text>
                    <View style={styles.messageFooter}>
                      {timeString ? (
                        <Text style={styles.time}>{timeString}</Text>
                      ) : null}
                      {item.isEdited && (
                        <Text style={styles.editedLabel}>edited</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </>
            );
          }}
        />

        {/* Message Input */}
        <View 
          style={[
            styles.inputRow, 
            { 
              paddingBottom: Math.max(insets.bottom, 10),
              marginBottom: Platform.OS === "android" && keyboardHeight > 0 ? keyboardHeight : 0,
            }
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={styles.input}
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Options Modal */}
        <Modal
          visible={isOptionsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOptionsModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setIsOptionsModalVisible(false)}
          >
            <View style={styles.optionsContent}>
              <TouchableOpacity 
                style={styles.optionButton}
                onPress={handleEditOption}
              >
                <Ionicons name="create-outline" size={24} color="#333" />
                <Text style={styles.optionText}>Edit Message</Text>
              </TouchableOpacity>

              <View style={styles.optionDivider} />

              <TouchableOpacity 
                style={styles.optionButton}
                onPress={handleDeleteOption}
              >
                <Ionicons name="trash-outline" size={24} color="#C32323" />
                <Text style={[styles.optionText, { color: "#C32323" }]}>Delete for Me</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelEdit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              
              <TextInput
                value={editText}
                onChangeText={setEditText}
                placeholder="Edit your message..."
                style={styles.editInput}
                multiline
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={cancelEdit} 
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={saveEdit} 
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEE" },
  headerRow: {
    gap:10,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backBtn: {
    paddingRight: 10,
  },
  backText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  header: {
    backgroundColor: "white",
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? 30 : 50,
    borderBottomWidth: 1,
    borderColor: "#eee",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  msgBox: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: "70%",
  },
  myMsg: {
    backgroundColor: "#C32323",
    alignSelf: "flex-end",
  },
  otherMsg: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  msgText: { color: "#000", fontSize: 15 },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  time: { 
    fontSize: 10, 
    color: "#444" 
  },
  editedLabel: {
    fontSize: 9,
    color: "#666",
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 2,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: "#C32323",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 10,
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 15,
  },
  dateText: {
    backgroundColor: "#D0D0D0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "70%",
    maxWidth: 300,
    overflow: "hidden",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 15,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  optionDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#C32323",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});