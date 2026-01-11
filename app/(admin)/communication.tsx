// communicationadmin.tsx
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

export default function CommunicationAdminScreen() {
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

        // Check if trying to chat with a member (admin should only chat with staff)
        if (isUserItem && (user as UserItem).role === "Member") {
          Alert.alert("Access Denied", "Admins can only chat with staff members.");
          return;
        }

        const chatRoomId =
          !isUserItem && (user as ChatItem).chatRoomId
            ? (user as ChatItem).chatRoomId!
            : getChatRoomId(currentUserUid, targetUser.id);

        if (isUserItem) {
          const now = Timestamp.fromDate(new Date());
          
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
          
          const newChatData = {
            id: targetUser.id,
            name: targetUser.name,
            lastMessage: "Tap to start conversation",
            updatedAt: now,
            chatRoomId,
            unreadCount: 0,
            isFavorite: false,
          };

          await setDoc(
            doc(db, "messages", currentUserUid, "chatList", targetUser.id),
            newChatData,
            { merge: true }
          );

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
          
          setShowUsers(false);
        } else {
          try {
            await updateDoc(
              doc(db, "messages", currentUserUid, "chatList", targetUser.id),
              { unreadCount: 0 }
            );
          } catch (error) {
            console.error("Error marking messages as read:", error);
          }
        }

        router.push({
          pathname: "/chatscreen",
          params: {
            chatRoomId,
            targetUserName: targetUser.name,
            targetUserId: targetUser.id,
          },
        });
      } catch (error) {
        console.error("Error starting chat:", error);
        Alert.alert("Error", "Failed to start chat. Please try again.");
      }
    },
    [currentUserUid, currentUserName, router]
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
          role: (userData.role as UserItem["role"]) || "Member",
        };
      });

      const currentUser = users.find((u) => u.id === currentUserUid);
      if (currentUser) {
        setCurrentUserName(currentUser.name);
        setCurrentUserRole(currentUser.role);
      }

      // Filter out current user and members (admin only sees staff)
      const filteredUsers = users.filter(
        (u) => u.id !== currentUserUid && u.role !== "Member"
      );
      
      setAllUsers(filteredUsers);
    };

    fetchUsers();
  }, [currentUserUid]);

  // --- Delete chat ---
  const handleDelete = useCallback(
    async (chatItem: ChatItem) => {
      if (!currentUserUid) return;

      Alert.alert(
        "Delete Chat",
        `Are you sure you want to delete the chat with ${chatItem.name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              swipeRefs.current.get(chatItem.id)?.close();
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                if (chatItem.chatRoomId) {
                  const messagesRef = collection(
                    db,
                    "chatRooms",
                    chatItem.chatRoomId,
                    "messages"
                  );
                  const messagesSnapshot = await getDocs(messagesRef);
                  
                  if (messagesSnapshot.docs.length > 0) {
                    const batch = writeBatch(db);
                    messagesSnapshot.docs.forEach((docSnap) => {
                      batch.delete(docSnap.ref);
                    });
                    await batch.commit();
                  }
                }

                await deleteDoc(
                  doc(db, "messages", currentUserUid, "chatList", chatItem.id)
                );
                
                swipeRefs.current.get(chatItem.id)?.close();
                
                Alert.alert("Success", "Chat deleted successfully!");
              } catch (error) {
                console.error("Error deleting chat:", error);
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
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Ionicons name="trash" size={24} color="#fff" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  // --- Filter data ---
  const dataToRender: Item[] = showUsers
    ? allUsers.filter((u) => {
        // Only show staff members (members are already filtered out in useEffect)
        return u.name.toLowerCase().includes(search.toLowerCase());
      })
    : chatList
        .filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
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
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
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
          <TouchableOpacity onPress={() => router.push("/adminMenu")}>
            <Ionicons name="menu" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEPIKIRHub</Text>
          <TouchableOpacity onPress={() => router.push("/adminProfile")}>
            <Ionicons name="person-circle-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>
            {showUsers ? "Staff Members" : "Messages"}
          </Text>
          <Text style={styles.subtitle}>
            {showUsers 
              ? "Select a staff member to start chatting" 
              : "Your conversations with staff"}
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={showUsers ? "Search staff members" : "Search messages"}
            style={styles.input}
          />
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#C32323" />
        ) : dataToRender.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={showUsers ? "people-outline" : "chatbubbles-outline"} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              {showUsers 
                ? "No staff members available" 
                : "No messages yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {showUsers 
                ? "Check back later" 
                : "Tap the + button to start chatting with staff"}
            </Text>
          </View>
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
                  <View style={styles.avatarContainer}>
                    <Ionicons name="person-add-outline" size={35} color="#C32323" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.name}>{item.name}</Text>
                      {item.role === "Staff" && (
                        <View style={styles.staffBadge}>
                          <Text style={styles.staffBadgeText}>STAFF</Text>
                        </View>
                      )}
                      {item.role === "Admin" && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  titleContainer: {
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
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
  sub: { fontSize: 13, color: "#666", marginTop: 2 },
  unreadSub: { 
    color: "#333",
    fontWeight: "600",
  },
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    backgroundColor: "#7B1FA2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 8,
    textAlign: "center",
  },
});