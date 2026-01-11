//communnicationstaff
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

import { db, auth } from "@/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";

// --- Types ---
type ChatItem = {
  id: string;
  name?: string;
  lastMessage?: string;
  updatedAt?: any;
  chatRoomId?: string;
  unreadCount?: number;
  isFavorite?: boolean;
};

type UserItem = {
  id: string;
  name: string;
  role: "Member" | "Staff" | "Admin";
};

type Item = ChatItem | UserItem;

const getChatRoomId = (uid1: string, uid2: string) => [uid1, uid2].sort().join("_");

export default function CommunicationScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const router = useRouter();
  const currentUserUid = auth.currentUser?.uid;
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [search, setSearch] = useState("");

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  // --- Toggle Favorite ---
  const toggleFavorite = useCallback(
    async (chatItem: ChatItem) => {
      if (!currentUserUid) return;

      try {
        const newFavoriteStatus = !chatItem.isFavorite;
        
        await updateDoc(
          doc(db, "messages", currentUserUid, "chatList", chatItem.id),
          { isFavorite: newFavoriteStatus }
        );

        // Close the swipeable after favoriting
        swipeRefs.current.get(chatItem.id)?.close();
      } catch (error) {
        console.error("Error toggling favorite:", error);
        Alert.alert("Error", "Failed to update favorite status.");
      }
    },
    [currentUserUid]
  );

  // --- Start Chat ---
  const startChat = useCallback(
    async (user: Item) => {
      if (!currentUserUid) return;

      try {
        const isUserItem = "role" in user;
        const targetUser = { id: user.id, name: user.name || "Unknown User" };

        // 1. Determine the chatRoomId deterministically
        const chatRoomId =
          !isUserItem && (user as ChatItem).chatRoomId
            ? (user as ChatItem).chatRoomId!
            : getChatRoomId(currentUserUid, targetUser.id);

        // --- REVISED FIX LOGIC: Ensure chat list entries exist and have the correct name ---
        if (isUserItem) {
          const now = Timestamp.fromDate(new Date());
          
          // Fetch current user's name if not already loaded
          let userName = currentUserName;
          if (!userName && currentUserUid) {
            try {
              const userDoc = await getDoc(doc(db, "users", currentUserUid));
              if (userDoc.exists()) {
                userName = (userDoc.data().name as string) || "Unknown User";
                setCurrentUserName(userName);
              }
            } catch (error) {
              console.error("Error fetching user name:", error);
              userName = "Unknown User";
            }
          }
          
          // Data structure for a new/updated chat list item
          const newChatData = {
                id: targetUser.id,
                name: targetUser.name,
                lastMessage: "Tap to start conversation",
                updatedAt: now,
                chatRoomId,
                unreadCount: 0,
                isFavorite: false,
              };

          // 1. Set/Merge the chat list entry for the current user.
          // This ensures the correct 'name' and 'chatRoomId' are always set.
          await setDoc(
            doc(db, "messages", currentUserUid, "chatList", targetUser.id,),
            newChatData,
            { merge: true }
          );

          // 2. Set/Merge the chat list entry for the target user.
          await setDoc(
            doc(db, "messages", targetUser.id, "chatList", currentUserUid),
            {
              id: currentUserUid,
              name: userName || "Unknown User",
              lastMessage: "Tap to start conversation",
              updatedAt: now,
              chatRoomId,
              unreadCount: 0,
              isFavorite: false,
            },
            { merge: true }
          );
          
          // 3. Immediately switch back to the main Messages view after starting the chat
          // so the user sees the updated list when they navigate back from the chat screen.
          setShowUsers(false);
        } else {
          // If opening an existing chat, mark messages as read
          try {
            await updateDoc(
              doc(db, "messages", currentUserUid, "chatList", targetUser.id),
              { unreadCount: 0 }
            );
          } catch (error) {
            console.error("Error marking messages as read:", error);
          }
        }

        // 4. Navigate to the chat screen
        navigation.navigate("chatscreen", {
          chatRoomId,
          targetUserName: targetUser.name,
          targetUserId: targetUser.id,
        });
      } catch (error) {
        console.error("Error starting chat:", error);
        Alert.alert("Error", "Failed to start chat. Please try again.");
      }
    },
    [currentUserUid, currentUserName, navigation]
  );

  // --- Fetch chat list ---
  useEffect(() => {
    if (!currentUserUid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "messages", currentUserUid, "chatList"),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ChatItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatItem, "id">),
        }));
        setChatList(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching chat list:", error);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [currentUserUid]);

  // --- Fetch current user's name, role, and all users ---
  useEffect(() => {
    if (!currentUserUid) return;

    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const users: UserItem[] = snapshot.docs.map((d) => {
        const userData = d.data();
        return {
          id: d.id,
          name: (userData.name as string) || "Unnamed",
          role: (userData.role as UserItem["role"]) || "member",
        };
      });

      // Set current user's name and role from Firestore
      const currentUser = users.find((u) => u.id === currentUserUid);
      if (currentUser) {
        setCurrentUserName(currentUser.name);
        setCurrentUserRole(currentUser.role);
      }

      // Filter out current user
      const filteredUsers = users.filter((u) => u.id !== currentUserUid);
      
      setAllUsers(filteredUsers);
    };

    fetchUsers();
  }, [currentUserUid]);

  // --- Delete chat ---
const handleDelete = useCallback(
  async (chatItem: ChatItem) => {
    if (!currentUserUid) return;

    console.log("=== DELETE BUTTON PRESSED ===");
    console.log("Chat Item:", chatItem);

    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete the chat with ${chatItem.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            console.log("Delete cancelled");
            swipeRefs.current.get(chatItem.id)?.close();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("Delete confirmed, starting deletion...");
            try {
              // 1. Delete all messages in the chat room
              if (chatItem.chatRoomId) {
                console.log("Chat Room ID:", chatItem.chatRoomId);
                const messagesRef = collection(
                  db,
                  "chatRooms",
                  chatItem.chatRoomId,
                  "messages"
                );
                const messagesSnapshot = await getDocs(messagesRef);
                
                console.log(`Found ${messagesSnapshot.docs.length} messages to delete`);
                
                if (messagesSnapshot.docs.length > 0) {
                  // Use batch to delete all messages efficiently
                  const batch = writeBatch(db);
                  messagesSnapshot.docs.forEach((docSnap) => {
                    batch.delete(docSnap.ref);
                  });
                  await batch.commit();
                  console.log("✅ Messages deleted successfully");
                } else {
                  console.log("No messages found in chat room");
                }
              } else {
                console.log("❌ No chatRoomId found in chatItem!");
              }

              // 2. Delete chat list entry for current user
              await deleteDoc(
                doc(db, "messages", currentUserUid, "chatList", chatItem.id)
              );
              console.log("✅ Chat list entry deleted");
              
              // Close swipeable
              swipeRefs.current.get(chatItem.id)?.close();
              
              Alert.alert("Success", "Chat deleted successfully!");
            } catch (error) {
              console.error("❌ Error deleting chat:", error);
              Alert.alert("Error", "Failed to delete chat. Please try again.");
            }
          },
        },
      ]
    );
  },
  [currentUserUid]
);

  // --- Render left actions for swipeable (Favorite) ---
  const renderLeftActions = (item: ChatItem) => {
    return (
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => toggleFavorite(item)}
      >
        <Ionicons 
          name={item.isFavorite ? "star" : "star-outline"} 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.favoriteText}>
          {item.isFavorite ? "Unfavorite" : "Favorite"}
        </Text>
      </TouchableOpacity>
    );
  };

  // --- Render right actions for swipeable (Delete) ---
  const renderRightActions = (item: ChatItem) => {
    console.log("Rendering delete button for:", item.name);
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          console.log("Delete button tapped!");
          handleDelete(item);
        }}
      >
        <Ionicons name="trash" size={24} color="#fff" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  // --- Filter data ---
  const dataToRender: Item[] = showUsers
    ? allUsers
        .filter((u) => {
          // Filter by search term
          const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase());
          
          // If current user is a member, hide admin users (case-insensitive comparison)
          if (currentUserRole.toLowerCase() === "member") {
            const shouldShow = matchesSearch && u.role.toLowerCase() !== "admin";
            return shouldShow;
          }
          
          // For staff and admin, show all users
          return matchesSearch;
        })
    : chatList
        .filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          // Sort favorites first, then by update time
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        });
const getUserRoleById = (userId: string) => {
  return allUsers.find((u) => u.id === userId)?.role;
};

  // --- Render chat item (with swipe) ---
  const renderChatItem = (item: ChatItem) => {
    const hasUnread = (item.unreadCount || 0) > 0;
    
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeRefs.current.set(item.id, ref);
          } else {
            swipeRefs.current.delete(item.id);
          }
        }}
        renderLeftActions={() => renderLeftActions(item)}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableWillOpen={() => {
          // Close other swipeables when one opens
          swipeRefs.current.forEach((ref, id) => {
            if (id !== item.id) {
              ref.close();
            }
          });
        }}
      >
        <TouchableOpacity
          style={[
            styles.item,
            hasUnread && styles.unreadItem
          ]}
          onPress={() => startChat(item)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={35} />
            {hasUnread && <View style={styles.unreadDot} />}
            {item.isFavorite && (
              <View style={styles.favoriteStar}>
                <Ionicons name="star" size={14} color="#FFD700" />
              </View>
            )}
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={styles.nameRow}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Text style={[styles.name, hasUnread && styles.unreadName]}>
      {item.name}
    </Text>

    {getUserRoleById(item.id) === "Staff" && (
        <View style={styles.staffBadge}>
          <Text style={styles.staffBadgeText}>STAFF</Text>
        </View>
      )}

    {getUserRoleById(item.id) === "Admin" && (
        <View style={styles.staffBadge}>
          <Text style={styles.adminBadge}>ADMIN</Text>
        </View>
      )}
  </View>

  {hasUnread && (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
    </View>
  )}
</View>


          
            <Text style={[styles.sub, hasUnread && styles.unreadSub]}>
              {typeof item.lastMessage === "string"
                ? item.lastMessage
                : "No messages yet"}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
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

        {/* Page Title */}
        <Text style={styles.pageTitle}>{showUsers ? "All Users" : "Messages"}</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users"
            style={styles.input}
          />
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#C32323" />
        ) : (
          <FlatList
            data={dataToRender}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isUserItem = "role" in item;
              return isUserItem ? (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => startChat(item)}
                >
                  <Ionicons name="person-add-outline" size={35} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.role}>{item.role}</Text>
                    <Text style={styles.sub}>Tap to start chat</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                renderChatItem(item as ChatItem)
              );
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setShowUsers((x) => !x);
            setSearch("");
          }}
        >
          <Ionicons name={showUsers ? "close" : "add"} size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F2F4" },
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
  pageTitle: { fontSize: 24, fontWeight: "bold", marginTop: 20, marginBottom: 15, paddingHorizontal: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    marginHorizontal: 20,
  },
  input: { marginLeft: 8, flex: 1 },
  item: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  unreadItem: {
    backgroundColor: "#FFF8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#C32323",
  },
  avatarContainer: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#C32323",
    borderWidth: 2,
    borderColor: "#fff",
  },
  favoriteStar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { fontSize: 16, fontWeight: "600" },
  unreadName: { 
    fontWeight: "700",
    color: "#000",
  },
  sub: { fontSize: 13, color: "#666" },
  unreadSub: { 
    color: "#333",
    fontWeight: "600",
  },
  role: { fontSize: 12, color: "red", fontWeight: "bold" },
  unreadBadge: {
    backgroundColor: "#C32323",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#C32323",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginBottom: 10,
    marginRight: 10,
  },
  favoriteText: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: "#C32323",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginBottom: 10,
    marginLeft: 10,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  staffBadge: {
  backgroundColor: "#B02020",
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 6,
  marginLeft: 8,
},

staffBadgeText: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
},
adminBadge: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
},
badgeText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
},
});