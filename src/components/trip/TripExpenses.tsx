import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { addExpense as dbAddExpense } from '../../services/tripService';

interface TripExpensesProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
}

export default function TripExpenses({
  trip,
  colors,
  currentUserName,
  loadTrip,
}: TripExpensesProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpPaidBy, setNewExpPaidBy] = useState('');
  const [newExpSplits, setNewExpSplits] = useState<string[]>([]);

  const totalExpenses = trip.expenses.reduce((sum: number, item: any) => sum + item.amount, 0);
  const yourShare = trip.expenses.reduce((sum: number, e: any) => {
    if (e.splitWith.includes(currentUserName) && e.splitWith.length > 0) {
      return sum + e.amount / e.splitWith.length;
    }
    return sum;
  }, 0);

  const budgetLimit = 30000;
  const budgetPct = Math.min(Math.round((totalExpenses / budgetLimit) * 100), 100);

  const handleAddExpense = async () => {
    const amt = parseFloat(newExpAmount);
    if (!newExpTitle.trim() || isNaN(amt) || amt <= 0 || !newExpPaidBy) {
      Alert.alert("Error", "Provide a valid Title, Amount, and Payer.");
      return;
    }
    const payerMember = trip.members.find((m: any) => m.name === newExpPaidBy);
    const paidById = payerMember?.id || newExpPaidBy;
    const splitIds = newExpSplits.length > 0
      ? trip.members.filter((m: any) => newExpSplits.includes(m.name)).map((m: any) => m.id)
      : trip.members.map((m: any) => m.id);

    const { error } = await dbAddExpense(trip.id, newExpTitle.trim(), amt, paidById, splitIds);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpPaidBy('');
    setNewExpSplits([]);
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Expense logged successfully.");
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

  const renderFeatureRow = (
    label: string,
    sub: string,
    icon: string,
    color: string,
    bg: string,
    onPress?: () => void,
    rightContent?: React.ReactNode
  ) => {
    return (
      <TouchableOpacity
        style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.shortcutIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shortcutLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        {rightContent ? rightContent : onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.tabHeaderRow, { marginTop: 20, marginBottom: 12 }]}>
        <Text style={[styles.tabContentTitle, { color: colors.text }]}>money</Text>
        <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#16A34A', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="wallet-outline" size={16} color="#16A34A" />
          <Text style={[styles.tabAddBtnText, { color: '#16A34A' }]}>log expense</Text>
        </TouchableOpacity>
      </View>

      {/* Virtual Credit Card spending container */}
      <LinearGradient
        colors={['#064E3B', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 160,
          borderRadius: 20,
          padding: 20,
          justifyContent: 'space-between',
          shadowColor: '#064E3B',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 15,
          elevation: 10,
          marginBottom: 20
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>total expenses</Text>
            <Text style={{ fontSize: 24, color: '#FFFFFF', fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginTop: 4 }}>₱{totalExpenses.toLocaleString()}</Text>
          </View>
          <View style={{ width: 40, height: 30, borderRadius: 6, backgroundColor: '#F59E0B', opacity: 0.85, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="square" size={20} color="#D97706" />
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 }}>card holder</Text>
            <Text style={{ fontSize: 13, color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginTop: 2 }}>{trip.title.toLowerCase()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>your share</Text>
            <Text style={{ fontSize: 16, color: '#FFFFFF', fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginTop: 2 }}>₱{Math.round(yourShare).toLocaleString()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Budget Limit Progress Bar */}
      <Card style={{ padding: 14, backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 20 }} shadow={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text }}>spending budget limit</Text>
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: '#16A34A' }}>₱{totalExpenses.toLocaleString()} / ₱{budgetLimit.toLocaleString()} ({budgetPct}%)</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface, width: '100%', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${budgetPct}%`, backgroundColor: '#16A34A' }} />
        </View>
      </Card>

      <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 12 }]}>bill history</Text>
      {trip.expenses.length === 0 ? (
        renderEmptyState(
          "track your first expense",
          "split costs fairly as you go.",
          "wallet-outline",
          "#16A34A",
          "log expense",
          () => setModalVisible(true)
        )
      ) : (
        <View style={{ gap: 8 }}>
          {trip.expenses.map((exp: any) => (
            <React.Fragment key={exp.id}>
              {renderFeatureRow(
                exp.title,
                `paid by ${exp.paidBy.toLowerCase()} • split with ${exp.splitWith.length} people`,
                'cash-outline',
                '#16A34A',
                '#E8F5E9',
                undefined,
                <Text style={{ color: '#16A34A', fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', fontSize: 14 }}>
                  ₱{exp.amount.toLocaleString()}
                </Text>
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* LOG EXPENSE MODAL */}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Log Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EXPENSE NAME *</Text>
                <TextInput
                  value={newExpTitle}
                  onChangeText={setNewExpTitle}
                  placeholder="e.g. Dinner, Van Rental, Boat Tour"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>AMOUNT (₱) *</Text>
                <TextInput
                  value={newExpAmount}
                  onChangeText={setNewExpAmount}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="numeric"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PAID BY *</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {trip.members.map((m: any) => (
                    <TouchableOpacity
                      key={m.id}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: newExpPaidBy === m.name ? '#16A34A' : colors.surface,
                        borderWidth: 1,
                        borderColor: newExpPaidBy === m.name ? '#16A34A' : colors.cardBorder,
                      }}
                      onPress={() => setNewExpPaidBy(m.name)}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: newExpPaidBy === m.name ? '#FFFFFF' : colors.text }}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SPLIT WITH (ALL BY DEFAULT)</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {trip.members.map((m: any) => {
                    const isSelected = newExpSplits.includes(m.name);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: isSelected ? 'rgba(22, 163, 74, 0.1)' : colors.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? '#16A34A' : colors.cardBorder,
                        }}
                        onPress={() => {
                          if (isSelected) {
                            setNewExpSplits(newExpSplits.filter(name => name !== m.name));
                          } else {
                            setNewExpSplits([...newExpSplits, m.name]);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: colors.text }}>{m.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddExpense}>
                <Text style={styles.submitBtnText}>Log Bill</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
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
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  shortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
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
    maxHeight: '80%',
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
    backgroundColor: '#16A34A',
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
