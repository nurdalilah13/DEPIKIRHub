import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, Platform, 
  KeyboardAvoidingView, ScrollView, Keyboard 
} from 'react-native';
import { db } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, serverTimestamp, 
  query, orderBy, updateDoc, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  target: 'staff' | 'member'; // Added target field
}

export default function AdminFAQPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [target, setTarget] = useState<'staff' | 'member'>('member'); // New state
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
  const q = query(collection(db, "faqs"), orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(q, 
    (snapshot: QuerySnapshot) => { // Added type
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FAQItem[];
      setFaqs(data);
    }, 
    (error: any) => { // Added type
      if (error.code === 'permission-denied') {
        console.log("AdminFAQ: Permission denied.");
      } else {
        console.error("Firestore Error:", error);
      }
    }
  );

  return () => unsubscribe();
}, []);
  // 2. Update handleSaveFAQ to include 'target'
  const handleSaveFAQ = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert("Error", "Please fill in both question and answer.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        target: target, // Save staff or member
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        const faqRef = doc(db, "faqs", editingId);
        await updateDoc(faqRef, payload);
        Alert.alert("Updated", "FAQ updated successfully!");
      } else {
        await addDoc(collection(db, "faqs"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Success", "FAQ added successfully!");
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      Alert.alert("Error", "Failed to save FAQ.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: FAQItem) => {
    setEditingId(item.id);
    setQuestion(item.question);
    setAnswer(item.answer);
    setTarget(item.target || 'member'); // Set the target when editing
    Keyboard.dismiss();
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setTarget('member'); // Reset to default
    setEditingId(null);
    Keyboard.dismiss();
  };

  const handleDeleteFAQ = (id: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this FAQ?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          await deleteDoc(doc(db, "faqs", id));
        }
      }
    ]);
  };

  // Filter FAQs based on search
  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header code stays same */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/(admin)/home")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin FAQ Manager</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>{editingId ? "Edit FAQ" : "Add New FAQ"}</Text>
            
            {/* 3. NEW: Target Audience Selector */}
            <View style={styles.selectorContainer}>
              <Text style={styles.subLabel}>Target:</Text>
              <View style={styles.tabRow}>
                <TouchableOpacity 
                  style={[styles.tab, target === 'member' && styles.activeTab]} 
                  onPress={() => setTarget('member')}
                >
                  <Text style={[styles.tabText, target === 'member' && styles.activeTabText]}>Members</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, target === 'staff' && styles.activeTab]} 
                  onPress={() => setTarget('staff')}
                >
                  <Text style={[styles.tabText, target === 'staff' && styles.activeTabText]}>Staff</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter Question"
              value={question}
              onChangeText={setQuestion}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter Answer"
              value={answer}
              onChangeText={setAnswer}
              multiline
              placeholderTextColor="#999"
            />

            <View style={styles.buttonRow}>
                <TouchableOpacity 
                    style={[styles.addBtn, { flex: 2 }, loading && { opacity: 0.7 }]} 
                    onPress={handleSaveFAQ}
                    disabled={loading}
                >
                    <Text style={styles.addBtnText}>
                    {loading ? "Saving..." : (editingId ? "Update FAQ" : "Add FAQ Item")}
                    </Text>
                </TouchableOpacity>

                {editingId && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* SEARCH BAR SECTION */}
          <Text style={styles.label}>Manage FAQs</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={{ marginLeft: 10 }} />
            <TextInput 
                style={styles.searchInput}
                placeholder="Search questions or answers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
          </View>
          
          {filteredFaqs.map((item) => (
            <View key={item.id} style={styles.faqCard}>
              <View style={styles.cardTextContainer}>
                <View style={styles.badgeRow}>
                   <Text style={styles.cardQuestion}>{item.question}</Text>
                   {/* 4. NEW: Visual Badge in List */}
                   <View style={[styles.badge, { backgroundColor: item.target === 'staff' ? '#007AFF' : '#34C759' }]}>
                      <Text style={styles.badgeText}>{item.target?.toUpperCase()}</Text>
                   </View>
                </View>
                <Text style={styles.cardAnswer} numberOfLines={2}>{item.answer}</Text>
              </View>
              
              {/* Action buttons stay same */}
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={22} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteFAQ(item.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={22} color="#C32323" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  headerRow: {
    paddingTop: Platform.OS === "android" ? 45 : 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  backBtn: { marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  content: { padding: 20 },
  formContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 2 },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#C32323" },
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 15,
    fontSize: 15,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  buttonRow: { flexDirection: 'row', gap: 10 },
  addBtn: {
    backgroundColor: "#C32323",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  cancelBtn: { flex: 1, backgroundColor: '#EEE', padding: 16, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: "#DDD", marginVertical: 25 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 20
  },
  searchInput: { flex: 1, padding: 12, fontSize: 14 },
  faqCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#C32323",
    elevation: 1,
  },
  cardTextContainer: { flex: 1, paddingRight: 10 },
  cardQuestion: { fontWeight: "700", color: "#333", marginBottom: 4, fontSize: 14 },
  cardAnswer: { color: "#666", fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 5 },
  iconBtn: { padding: 8 },
  selectorContainer: { marginBottom: 15 },
  subLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1 },
  tabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: '#C32323' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});