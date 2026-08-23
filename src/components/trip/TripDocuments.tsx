import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDocument as dbAddDocument } from '../../services/tripService';

interface TripDocumentsProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
}

export default function TripDocuments({
  trip,
  colors,
  isOrganizer,
  loadTrip,
}: TripDocumentsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('pdf');

  const handleAddDocument = async () => {
    if (!newDocTitle.trim()) {
      Alert.alert("Error", "Document title cannot be empty.");
      return;
    }
    const finalTitle = newDocTitle.trim().toLowerCase().endsWith(`.${newDocType}`)
      ? newDocTitle.trim()
      : `${newDocTitle.trim()}.${newDocType}`;

    const mockSize = `${(Math.random() * 2 + 0.2).toFixed(1)} MB`;
    const { error } = await dbAddDocument(trip.id, finalTitle, newDocType, mockSize);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewDocTitle('');
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Document added!");
  };

  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title.toLowerCase()}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc.toLowerCase()}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color }]} onPress={onAction}>
            <Text style={styles.emptyActionBtnText}>{actionLabel.toLowerCase()}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>documents</Text>
        <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#0284C7', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={16} color="#0284C7" />
          <Text style={[styles.tabAddBtnText, { color: '#0284C7' }]}>upload file</Text>
        </TouchableOpacity>
      </View>
      {trip.documents.length === 0 ? (
        renderEmptyState(
          "share trip documents",
          "keep tickets and confirmations in one place.",
          "document-attach-outline",
          "#0284C7",
          "upload file",
          () => setModalVisible(true)
        )
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {trip.documents.map((doc: any) => {
            const isPdf = doc.title.toLowerCase().endsWith('.pdf');
            const isImg = doc.title.toLowerCase().endsWith('.png') || doc.title.toLowerCase().endsWith('.jpg');
            const fileIcon = isPdf ? 'document-text' : isImg ? 'image' : 'document';
            const fileIconColor = isPdf ? '#EF4444' : isImg ? '#10B981' : '#F59E0B';
            return (
              <TouchableOpacity
                key={doc.id}
                style={{
                  width: '48%',
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 110
                }}
                activeOpacity={0.8}
                onPress={() => Alert.alert("Download Complete", `File saved: ${doc.title}`)}
              >
                <Ionicons name={fileIcon} size={28} color={fileIconColor} />
                <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text, textAlign: 'center', marginVertical: 4 }} numberOfLines={1}>
                  {doc.title.toLowerCase()}
                </Text>
                <Text style={{ fontSize: 9, color: colors.textSecondary }}>{doc.fileSize}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Document</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DOCUMENT TITLE *</Text>
                <TextInput
                  value={newDocTitle}
                  onChangeText={setNewDocTitle}
                  placeholder="e.g. Flight Tickets, Hotel Voucher"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FILE FORMAT Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  {['pdf', 'png', 'jpg', 'docx'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: newDocType === t ? '#0284C7' : colors.surface,
                        borderWidth: 1,
                        borderColor: newDocType === t ? '#0284C7' : colors.cardBorder,
                        alignItems: 'center',
                      }}
                      onPress={() => setNewDocType(t)}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: newDocType === t ? '#FFFFFF' : colors.text }}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddDocument}>
                <Text style={styles.submitBtnText}>Add Document</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tabAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  tabAddBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});
