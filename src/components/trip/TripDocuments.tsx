import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDocument as dbAddDocument, deleteDocument as dbDeleteDocument } from '../../services/tripService';
import { AI_FEATURES_ENABLED } from '../../services/aiService';

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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

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

  const handleDeleteDoc = async () => {
    if (!deleteConfirmId) return;
    const { error } = await dbDeleteDocument(deleteConfirmId);
    setDeleteConfirmId(null);
    if (error) {
      Alert.alert('Error', error);
    } else {
      loadTrip();
    }
  };

  const handleAiExtract = async () => {
    setAiSuggesting(true);
    try {
      const { extractDocumentDetails } = await import('../../services/aiService');
      const filenames = trip.documents.map((d: any) => d.title);
      const suggestions = await extractDocumentDetails(filenames);
      setAiSuggestions(suggestions);
    } catch (e) {
      setAiSuggestions(['Flight schedule event on Day 1', 'Hotel check-in event on Day 2']);
    } finally {
      setAiSuggesting(false);
    }
  };

  const getDocStyle = (title: string) => {
    const ext = title.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: 'document-text', color: '#EF4444', bg: '#FEF2F2', label: 'PDF' };
    if (ext === 'docx' || ext === 'doc') return { icon: 'document', color: '#2563EB', bg: '#EFF6FF', label: 'DOC' };
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return { icon: 'image', color: '#10B981', bg: '#ECFDF5', label: 'IMG' };
    return { icon: 'document-attach', color: '#6B7280', bg: '#F3F4F6', label: 'FILE' };
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
        <View style={[styles.emptyIconBox, { backgroundColor: color + '12', borderColor: color + '25', borderWidth: 1 }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color, flexDirection: 'row', alignItems: 'center', gap: 6 }]} onPress={onAction} activeOpacity={0.85}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>Documents</Text>
        <TouchableOpacity style={[styles.tabAddBtn, { backgroundColor: colors.brand }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.tabAddBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>
      {trip.documents.length === 0 ? (
        renderEmptyState(
          "share trip documents",
          "keep tickets and confirmations in one place.",
          "document-attach-outline",
          colors.brand,
          "upload file",
          () => setModalVisible(true)
        )
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {trip.documents.map((doc: any) => {
            const docStyle = getDocStyle(doc.title);
            return (
              <View
                key={doc.id}
                style={[
                  styles.docCard,
                  { width: '48%', backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                {/* Delete button (top-right corner) */}
                {isOrganizer && (
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onPress={() => setDeleteConfirmId(doc.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                {/* File type icon with color background */}
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: docStyle.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={docStyle.icon as any} size={22} color={docStyle.color} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                  {doc.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                  <View style={{ backgroundColor: docStyle.bg, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1.5 }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', color: docStyle.color }}>{docStyle.label}</Text>
                  </View>
                  <Text style={{ fontSize: 9.5, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>{doc.fileSize}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* AI EXTRACTION SUGGESTION */}
      {AI_FEATURES_ENABLED && trip.documents.length > 0 && (
        <View style={[styles.aiPanel, { backgroundColor: colors.brandLight }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={12} color={colors.brand} />
              <Text style={[styles.aiPanelTitle, { color: colors.brand }]}>AI auto-extract</Text>
            </View>
            <TouchableOpacity onPress={handleAiExtract} disabled={aiSuggesting}>
              <Text style={[styles.aiPanelAction, { color: colors.brand }]}>{aiSuggesting ? 'Reading…' : 'Scan docs'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.aiPanelDesc, { color: colors.brand }]}>Pull flight times, hotel bookings, and events straight from your uploads into the itinerary.</Text>
          {aiSuggestions.length > 0 && (
            <View style={{ marginTop: 8, gap: 5 }}>
              {aiSuggestions.map((s, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="add-circle-outline" size={14} color={colors.brand} />
                  <Text style={[styles.aiSuggestionTxt, { color: colors.brand, flex: 1 }]}>{s}</Text>
                </View>
              ))}
            </View>
          )}
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
                        borderRadius: 10,
                        backgroundColor: newDocType === t ? colors.brand : colors.surface,
                        alignItems: 'center',
                      }}
                      onPress={() => setNewDocType(t)}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: newDocType === t ? '#FFFFFF' : colors.textSecondary }}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.brand }]} onPress={handleAddDocument}>
                <Text style={styles.submitBtnText}>Add Document</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        visible={!!deleteConfirmId}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeleteConfirmId(null)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="trash" size={40} color="#EF4444" />
              <Text style={{ fontSize: 15, fontFamily: 'Poppins-Bold', color: colors.text, marginTop: 12 }}>Delete Document?</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>This file will be permanently removed from the trip vault.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
              <TouchableOpacity style={{ flex: 1, height: 44, borderRadius: 10, borderColor: colors.cardBorder, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }} onPress={() => setDeleteConfirmId(null)}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }} onPress={handleDeleteDoc}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  tabAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 14,
    gap: 4,
  },
  tabAddBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  docCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 122,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiPanel: {
    marginTop: 14,
    borderRadius: 16,
    padding: 13,
  },
  aiPanelTitle: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Bold',
  },
  aiPanelAction: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Bold',
  },
  aiPanelDesc: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Medium',
    marginTop: 5,
    lineHeight: 14,
    opacity: 0.85,
  },
  aiSuggestionTxt: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Bold',
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
    fontFamily: 'Poppins-Bold',
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
