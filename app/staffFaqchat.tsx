import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Filter } from 'bad-words';
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  where
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Accordion from 'react-native-collapsible/Accordion';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from '../firebase';
const genAI = new GoogleGenerativeAI("AIzaSyA7QoslFv2dac9Ismjbf3x8wdQUc-B2FxI");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", // or gemini-2.0-flash-exp
  systemInstruction: `
    **Role:** You are the official DEPIKIRHub Staff Assistant. Your purpose is to assist STAFF and ADMINS in managing the community and navigating their management tools efficiently.

    **Tone & Style:**
    - **Professional & Supportive:** Use "We" and "Team" to foster a staff-oriented environment.
    - **Ultra-Concise:** Keep responses under 3 sentences for quick reading during live events.
    - **Visuals:** Use 🛠️ (Management), 📅 (Events), ✅ (Tasks), and 🚀 (Updates).
    - **Clarity:** Bold all UI elements like **Tabs**, **Buttons**, and **Menus**.

    **Safety & Scope (Strict Rules):**
    - **Out of Scope:** If asked questions unrelated to DEPIKIRHub or if a user is trying to "mess with" or trick you, respond: "I'm sorry, that is out of my scope as a Staff Assistant. I only have information regarding DEPIKIRHub management and tools."
    - **Unknown Procedures:** If a specific process is not in your knowledge base, do not guess. Respond: "I’m not sure about that specific process. Please consult a Head Admin for further clarification."
    - **De-escalation:** If a user is angry or frustrated, respond: "I understand this is frustrating, Team. Let's try to resolve this quickly together. [Provide solution or redirect to Admin]."

    **App Navigation:**
    - **Primary Tabs:** Home, Events, Members, Chat, Attendance.
    - **Side Menu (Top-Left ☰):** Jump between Home, Events, Members, Communication, Attendance, Profile, and FAQ.
    - **Profile Menu (Top-Right):** Access **Update Profile** and the **Reset Password** feature.
    - **Logout:** Use the door icon in the **Profile** page or the bottom of the **Side Menu**.

    **Management Knowledge:**
    1. **Events:** To add/edit, go to the **Events** tab and tap the **(+) floating button**. Enter details and press ▶️ to post. 📅
    2. **Announcements:** Post via the **Home** tab using the top broadcast section. 🚀
    3. **Attendance:** The **QR Code** generator is located in the **Attendance** tab. You need to put in date amd time to generate a QR Code. Ensure members scan this for credit. ✅
    4. **Member List:** View the full roster in the **Members** tab to verify registration.
    5. **Communication:** Use the **Chat** tab to talk to members or staff. You can **Delete** conversations or **Favourite** specific chats to keep important threads at the top.
    6. **Moderation:** Staff can comment on events and have the authority to **Delete** their own and others' omments. 👋

    **Direct Support Templates:**
    - **Add Event:** "Navigate to the **Events** tab and tap the **(+) button** at the bottom right. Fill in the details and tap Save. 📅"
    - **QR Codes:** "The Attendance QR generator is located in the **Attendance** tab. Remember to remind user to add date and time. Make sure this is displayed during event check-ins. ✅"
    - **Security:** "Tap the **Profile** icon (top right) to update your info or reset your password. 🛠️"
  `,
});

const filter = new Filter();

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  userId: string;
  userName?: string;
  createdAt: any;
}



export default function FAQ_Chat_Page() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const flatListRef = useRef<FlatList>(null);
  
  const [activeTab, setActiveTab] = useState<'FAQ' | 'Chat'>('FAQ');
  const [activeSections, setActiveSections] = useState<number[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 2. Keyboard & Firestore Listeners
  useEffect(() => {
    // Keyboard Listeners
    const showEvent = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvent = Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (activeTab === 'Chat') {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    // 🔥 1. FILTERED FAQ LISTENER (STAFF ONLY)
    // This ensures documents with target: "meember" are hidden from this view
    // 1. FAQ Listener (Stays the same)
  const faqQuery = query(
      collection(db, "faqs"), 
      where("target", "==", "staff"),
      orderBy("createdAt", "desc")
    );
    const unsubFaq: Unsubscribe = onSnapshot(faqQuery, (snap) => {
      setFaqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  
    let unsubUser: Unsubscribe | undefined;
    let unsubChat: Unsubscribe | undefined;
  
    if (user?.uid) {
      unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setCurrentUserData(snap.data());
      });
  
      const chatQ = query(
        collection(db, "chats"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "asc"), 
        limit(50)
      );
  
      unsubChat = onSnapshot(chatQ, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      });
    } else {
      // 🔥 FIX: CLEAR UI IMMEDIATELY ON LOGOUT
      setMessages([]);
      setCurrentUserData(null);
    }
  
    return () => { 
      unsubFaq(); 
      if (unsubUser) unsubUser();
      if (unsubChat) unsubChat();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [user, activeTab]);

  const sendMessage = async () => {
    const userText = inputText.trim();
    if (!userText || !user) return;

    // --- PROFANITY CHECK ---
    if (filter.isProfane(userText)) {
      Alert.alert(
        "Professionalism Required",
        "Even as Staff, we maintain a standard of professional language. Please revise your message. 🛠️",
        [{ text: "OK" }]
      );
      return;
    }
    const currentName = currentUserData?.name || "Staff";
    setInputText('');
    setIsTyping(true);

    try {
      await addDoc(collection(db, "chats"), {
        text: userText,
        sender: 'user',
        userId: user.uid,
        userName: currentName,
        createdAt: serverTimestamp(),
      });

      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(`Context: User is ${currentName}. Message: ${userText}`);
      
      await addDoc(collection(db, "chats"), {
        text: result.response.text(),
        sender: 'ai',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsTyping(false); 
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/(staff)/home")}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPIKIRHub AI</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['FAQ', 'Chat'].map((tab: any) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]} 
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'FAQ' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {faqs.length > 0 ? (
              <Accordion
                sections={faqs}
                activeSections={activeSections}
                renderHeader={(sec) => (
                  <View style={styles.faqHeaderBox}>
                    <Text style={styles.faqTitle}>{sec.question}</Text>
                    <Ionicons 
                      name={activeSections.includes(faqs.indexOf(sec)) ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#666" 
                    />
                  </View>
                )}
                renderContent={(sec) => (
                  <View style={styles.faqContent}>
                    <Text style={styles.faqAnswer}>{sec.answer}</Text>
                  </View>
                )}
                onChange={setActiveSections}
                underlayColor="transparent"
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No FAQs available at the moment.</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[styles.msgBox, item.sender === 'user' ? styles.myMsg : styles.otherMsg]}>
                  <Text style={[styles.msgText, item.sender === 'user' && {color: '#fff'}]}>{item.text}</Text>
                </View>
              )}
              ListFooterComponent={isTyping ? (
                <View style={styles.typingContainer}>
                  <ActivityIndicator size="small" color="#C32323" />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              ) : null}
              contentContainerStyle={{ padding: 20 }}
            />

            <View style={[
              styles.inputRow, 
              { 
                paddingBottom: Math.max(insets.bottom, 12),
                marginBottom: Platform.OS === "android" ? 0 : 0 // KeyboardAvoidingView usually handles iOS
              },
              Platform.OS === "android" && keyboardHeight > 0 && { marginBottom: keyboardHeight }
            ]}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask DEPIKIRHub AI..."
                style={styles.input}
              />
              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={isTyping}>
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F2" },
  headerRow: { 
    paddingTop: Platform.OS === "android" ? 45 : 55, 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 18, fontWeight: "700", marginLeft: 15 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
  tab: { 
    paddingVertical: 10, 
    width: 120, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#C32323', 
    borderRadius: 10, 
    marginHorizontal: 5 
  },
  activeTab: { backgroundColor: '#C32323' },
  tabText: { color: '#C32323', fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  faqHeaderBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#fff', 
    padding: 18, 
    marginHorizontal: 20, 
    marginTop: 10, 
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  faqTitle: { fontSize: 15, fontWeight: '600', flex: 1, color: '#333' },
  faqContent: { 
    padding: 15, 
    marginHorizontal: 20, 
    backgroundColor: '#FAFAFA', 
    borderBottomLeftRadius: 10, 
    borderBottomRightRadius: 10, 
    borderTopWidth: 1, 
    borderColor: '#EEE' 
  },
  faqAnswer: { color: '#555', lineHeight: 22, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontSize: 14 },
  msgBox: { padding: 12, borderRadius: 15, marginVertical: 5, maxWidth: "85%" },
  myMsg: { backgroundColor: "#C32323", alignSelf: "flex-end", borderBottomRightRadius: 2 },
  otherMsg: { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: '#DDD', borderBottomLeftRadius: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, marginBottom: 10 },
  typingText: { fontSize: 12, color: '#888', fontStyle: 'italic', marginLeft: 8 },
  inputRow: { 
    flexDirection: "row", 
    padding: 12, 
    backgroundColor: "#fff", 
    borderTopWidth: 1, 
    borderTopColor: '#DDD', 
    alignItems: 'center' 
  },
  input: { flex: 1, padding: 12, borderRadius: 20, backgroundColor: "#f2f2f2", marginRight: 10, fontSize: 15 },
  sendBtn: { backgroundColor: "#C32323", width: 44, height: 44, justifyContent: "center", alignItems: 'center', borderRadius: 22 },
});