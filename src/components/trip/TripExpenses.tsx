import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, Dimensions, Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addExpense as dbAddExpense, deleteExpense as dbDeleteExpense } from '../../services/tripService';

const { width: SCREEN_W } = Dimensions.get('window');

interface TripExpensesProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  Food: { icon: 'restaurant-outline', color: '#F97316', bg: '#FFF7ED' },
  Transport: { icon: 'car-outline', color: '#3B82F6', bg: '#EFF6FF' },
  Accommodation: { icon: 'bed-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  Activities: { icon: 'bicycle-outline', color: '#10B981', bg: '#D1FAE5' },
  Shopping: { icon: 'bag-outline', color: '#EC4899', bg: '#FCE7F3' },
  Other: { icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', bg: '#F3F4F6' },
};

const MOCK_RECEIPTS = [
  {
    id: 1,
    merchant: 'Starbucks Coffee',
    category: 'Food',
    amount: 840,
    items: [
      '============= RECEIPT =============',
      'STARBUCKS COFFEE BGC',
      '1x Iced Caramel Macchiato  - ₱220.00',
      '1x Espresso Frappuccino    - ₱210.00',
      '2x Blueberry Cheesecake    - ₱410.00',
      '-----------------------------------',
      'TOTAL:                      ₱840.00',
      '===================================',
    ],
    date: 'Aug 30, 2026 14:15',
  },
  {
    id: 2,
    merchant: 'Seafood Island Diner',
    category: 'Food',
    amount: 4250,
    items: [
      '============= RECEIPT =============',
      'SEAFOOD ISLAND DINER MOA',
      '1x Fiesta Boodle Tray     - ₱3,400.00',
      '2x Pitcher Iced Tea       - ₱500.00',
      '1x Grilled Squid          - ₱350.00',
      '-----------------------------------',
      'TOTAL:                    ₱4,250.00',
      '===================================',
    ],
    date: 'Aug 30, 2026 19:30',
  },
  {
    id: 3,
    merchant: 'Shell Petrol Station',
    category: 'Transport',
    amount: 1800,
    items: [
      '============= RECEIPT =============',
      'SHELL STATION EDSA',
      '31.03L Fuel V-Power Diesel - ₱1,800.00',
      '-----------------------------------',
      'TOTAL:                    ₱1,800.00',
      '===================================',
    ],
    date: 'Aug 31, 2026 09:10',
  },
];

export default function TripExpenses({
  trip,
  colors,
  currentUserName,
  loadTrip,
}: TripExpensesProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpPaidByUserId, setNewExpPaidByUserId] = useState('');
  const [newExpSplitUserIds, setNewExpSplitUserIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Other');

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'unpaid'>('all');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState('');

  // Receipt Scanner States
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeReceiptIdx, setActiveReceiptIdx] = useState(0);
  const [scanPhase, setScanPhase] = useState('Position receipt within frame');
  const scanAnim = useRef(new Animated.Value(0)).current;

  const handleScanReceipt = () => {
    if (scanning) return;
    setScanning(true);
    setScanPhase('Reading receipt details...');

    // Run laser line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Step through scan phases
    setTimeout(() => {
      setScanPhase('Agilito AI parsing items...');
    }, 1200);

    setTimeout(() => {
      setScanPhase('Matching categories...');
    }, 2400);

    setTimeout(() => {
      const receipt = MOCK_RECEIPTS[activeReceiptIdx];
      // Set form fields
      setNewExpTitle(receipt.merchant);
      setNewExpAmount(receipt.amount.toString());
      setSelectedCategory(receipt.category);
      
      // Auto select payer to user
      const currentUser = trip.members.find((m: any) => m.name === currentUserName);
      if (currentUser) {
        setNewExpPaidByUserId(currentUser.userId);
      }
      
      // Stop scanner
      setScanning(false);
      setScanModalVisible(false);
      scanAnim.setValue(0);

      // Open log modal
      setModalVisible(true);
      Alert.alert(
        'Receipt Scanned! ⚡',
        `Agilito extracted the details:\n\nMerchant: ${receipt.merchant}\nTotal: ₱${receipt.amount.toLocaleString()}\nCategory: ${receipt.category}\n\nYou can now splits this with the group!`
      );
    }, 3800);
  };

  useEffect(() => {
    if (!newExpTitle.trim() || !modalVisible) {
      setSuggestedCategory('');
      return;
    }
    const getCategory = async () => {
      try {
        const { suggestExpenseCategoryAndSplit } = await import('../../services/aiService');
        const { category } = await suggestExpenseCategoryAndSplit(newExpTitle.trim(), 100, []);
        setSuggestedCategory(category);
        if (category && CATEGORY_ICONS[category]) setSelectedCategory(category);
      } catch (e) {
        // ignore
      }
    };
    const debounceId = setTimeout(getCategory, 1000);
    return () => clearTimeout(debounceId);
  }, [newExpTitle, modalVisible]);

  // Derived stats
  const totalExpenses = trip.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const yourShare = trip.expenses.reduce((sum: number, e: any) => {
    if (e.splitWith.includes(currentUserName) && e.splitWith.length > 0) {
      return sum + e.amount / e.splitWith.length;
    }
    return sum;
  }, 0);
  const youOwe = trip.expenses.reduce((sum: number, e: any) => {
    const owes = e.splitWith.includes(currentUserName) && e.paidBy !== currentUserName;
    return owes ? sum + e.amount / e.splitWith.length : sum;
  }, 0);
  const youArePaidBack = trip.expenses.reduce((sum: number, e: any) => {
    const youPaid = e.paidBy === currentUserName && e.splitWith.length > 1;
    const othersShare = youPaid ? e.amount * (1 - 1 / e.splitWith.length) : 0;
    return sum + othersShare;
  }, 0);

  const budgetLimit = 30000;
  const budgetPct = Math.min(Math.round((totalExpenses / budgetLimit) * 100), 100);
  const isOverBudget = budgetPct >= 80;

  const handleAddExpense = async () => {
    const amt = parseFloat(newExpAmount);
    if (!newExpTitle.trim() || isNaN(amt) || amt <= 0 || !newExpPaidByUserId) {
      Alert.alert('Error', 'Provide a valid Title, Amount, and Payer.');
      return;
    }
    const splitIds = newExpSplitUserIds.length > 0
      ? newExpSplitUserIds
      : trip.members.map((m: any) => m.userId);
    const { error } = await dbAddExpense(trip.id, newExpTitle.trim(), amt, newExpPaidByUserId, splitIds);
    if (error) { Alert.alert('Error', error); return; }
    setNewExpTitle(''); setNewExpAmount(''); setNewExpPaidByUserId('');
    setNewExpSplitUserIds([]); setSuggestedCategory(''); setSelectedCategory('Other');
    setModalVisible(false);
    loadTrip();
  };

  const triggerDeleteConfirm = (expense: any) => {
    setExpenseToDelete(expense);
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    const { error } = await dbDeleteExpense(expenseToDelete.id);
    setDeleteConfirmVisible(false);
    setExpenseToDelete(null);
    if (error) { Alert.alert('Error', error); } else { loadTrip(); }
  };

  const filteredExpenses = trip.expenses.filter((exp: any) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'mine') return exp.paidBy === currentUserName || exp.splitWith.includes(currentUserName);
    if (filter === 'unpaid') return exp.splitWith.includes(currentUserName) && exp.paidBy !== currentUserName;
    return true;
  });

  // Category distribution for quick chart
  const categoryTotals: Record<string, number> = {};
  trip.expenses.forEach((e: any) => {
    const cat = e.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Money Room</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.scanBtn, { borderColor: colors.brand, borderWidth: 1 }]}
            onPress={() => setScanModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={16} color={colors.brand} />
            <Text style={[styles.scanBtnText, { color: colors.brand }]}>Scan Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.brand }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Log Bill</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PREMIUM VIRTUAL SPEND CARD */}
      <LinearGradient
        colors={['#0C1445', '#1A237E', '#283593']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.spendCard}
      >
        {/* Decorative circles */}
        <View style={styles.cardCircle1} />
        <View style={styles.cardCircle2} />

        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardSubLabel}>Total Group Spend</Text>
            <Text style={styles.cardAmount}>₱{totalExpenses.toLocaleString()}</Text>
          </View>
          <View style={[styles.cardBadge, { backgroundColor: colors.brand + '30' }]}>
            <Ionicons name="wallet" size={18} color={colors.brand} />
          </View>
        </View>

        {/* Budget bar */}
        <View style={styles.budgetSection}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget  ₱{budgetLimit.toLocaleString()}</Text>
            <Text style={[styles.budgetPct, { color: isOverBudget ? '#FCA5A5' : '#86EFAC' }]}>
              {budgetPct}%
            </Text>
          </View>
          <View style={styles.budgetTrack}>
            <View style={[
              styles.budgetFill,
              {
                width: `${budgetPct}%`,
                backgroundColor: isOverBudget ? '#EF4444' : '#10B981',
              }
            ]} />
          </View>
        </View>

        {/* Your stats row */}
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>Your Share</Text>
            <Text style={styles.cardStatValue}>₱{Math.round(yourShare).toLocaleString()}</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>You Owe</Text>
            <Text style={[styles.cardStatValue, { color: youOwe > 0 ? '#FCA5A5' : '#86EFAC' }]}>
              ₱{Math.round(youOwe).toLocaleString()}
            </Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Text style={styles.cardStatLabel}>Owed to You</Text>
            <Text style={[styles.cardStatValue, { color: youArePaidBack > 0 ? '#86EFAC' : 'rgba(255,255,255,0.4)' }]}>
              ₱{Math.round(youArePaidBack).toLocaleString()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* OVER BUDGET NUDGE */}
      {isOverBudget && (
        <View style={[styles.nudgeBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={styles.nudgeText}>
            <Text style={{ fontFamily: 'Poppins-Bold', color: '#DC2626' }}>Heads up! </Text>
            Spending has crossed 80% of the group budget. Review major expenses before adding more.
          </Text>
        </View>
      )}

      {/* CATEGORY BREAKDOWN */}
      {Object.keys(categoryTotals).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>By Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {Object.entries(categoryTotals).map(([cat, total]) => {
              const cfg = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Other'];
              const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
              return (
                <View key={cat} style={[styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.categoryChipIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  </View>
                  <Text style={[styles.categoryChipLabel, { color: colors.text }]}>{cat}</Text>
                  <Text style={[styles.categoryChipPct, { color: cfg.color }]}>{pct}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* EXPENSE LIST HEADER + SEARCH + FILTERS */}
      <View style={styles.section}>
        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bill History</Text>
          <Text style={[styles.expenseCount, { color: colors.textMuted }]}>{trip.expenses.length} total</Text>
        </View>

        {trip.expenses.length > 0 && (
          <>
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons name="search-outline" size={15} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search expenses..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter pills */}
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: 'All Bills' },
                { key: 'mine', label: 'My Expenses' },
                { key: 'unpaid', label: 'I Owe' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: filter === tab.key ? colors.brand : colors.surface,
                      borderColor: filter === tab.key ? colors.brand : colors.cardBorder,
                    }
                  ]}
                  onPress={() => setFilter(tab.key as any)}
                >
                  <Text style={[
                    styles.filterPillText,
                    { color: filter === tab.key ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Expense cards */}
        {filteredExpenses.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons
                name={searchQuery || filter !== 'all' ? 'search-outline' : 'wallet-outline'}
                size={32}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery || filter !== 'all' ? 'No matching bills' : 'No expenses yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Start logging shared expenses to track who owes what.'}
            </Text>
            {!searchQuery && filter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.brand }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyActionBtnText}>Log First Bill</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.expenseList}>
            {filteredExpenses.map((exp: any) => {
              const cfg = CATEGORY_ICONS[exp.category || 'Other'] || CATEGORY_ICONS['Other'];
              const perPerson = exp.splitWith.length > 0
                ? Math.round(exp.amount / exp.splitWith.length)
                : exp.amount;
              const isMyExpense = exp.paidBy === currentUserName;
              const iSplit = exp.splitWith.includes(currentUserName) && !isMyExpense;

              return (
                <View
                  key={exp.id}
                  style={[styles.expCard, {
                    backgroundColor: colors.card,
                    borderColor: iSplit ? '#EF444430' : colors.cardBorder,
                  }]}
                >
                  <View style={[styles.expIconBox, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.expTitle, { color: colors.text }]} numberOfLines={1}>
                      {exp.title}
                    </Text>
                    <Text style={[styles.expMeta, { color: colors.textSecondary }]}>
                      Paid by {exp.paidBy === currentUserName ? 'you' : exp.paidBy}
                      {exp.splitWith.length > 0 ? ` · ₱${perPerson.toLocaleString()}/person` : ''}
                    </Text>
                    {iSplit && (
                      <View style={styles.oweBadge}>
                        <Text style={styles.oweBadgeText}>You owe ₱{perPerson.toLocaleString()}</Text>
                      </View>
                    )}
                    {isMyExpense && exp.splitWith.length > 1 && (
                      <View style={[styles.oweBadge, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={[styles.oweBadgeText, { color: '#065F46' }]}>
                          Others owe you ₱{Math.round(exp.amount * (1 - 1 / exp.splitWith.length)).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.expRight}>
                    <Text style={[styles.expAmount, { color: colors.text }]}>
                      ₱{exp.amount.toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.surface }]}
                      onPress={() => triggerDeleteConfirm(exp)}
                    >
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* LOG EXPENSE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
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

              {/* Expense Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EXPENSE NAME *</Text>
                <TextInput
                  value={newExpTitle}
                  onChangeText={setNewExpTitle}
                  placeholder="e.g. Dinner, Van Rental, Boat Tour"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
                {suggestedCategory ? (
                  <View style={[styles.aiTag, { backgroundColor: colors.brandLight }]}>
                    <Ionicons name="sparkles" size={10} color={colors.brand} />
                    <Text style={[styles.aiTagText, { color: colors.brand }]}>AI Suggested: {suggestedCategory}</Text>
                  </View>
                ) : null}
              </View>

              {/* Category Picker */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
                <View style={styles.categoryPickerRow}>
                  {Object.entries(CATEGORY_ICONS).map(([cat, cfg]) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPickerChip,
                        {
                          backgroundColor: selectedCategory === cat ? cfg.bg : colors.surface,
                          borderColor: selectedCategory === cat ? cfg.color : colors.cardBorder,
                        }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Ionicons name={cfg.icon as any} size={14} color={selectedCategory === cat ? cfg.color : colors.textMuted} />
                      <Text style={[
                        styles.categoryPickerText,
                        { color: selectedCategory === cat ? cfg.color : colors.textSecondary }
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>AMOUNT (₱) *</Text>
                <TextInput
                  value={newExpAmount}
                  onChangeText={setNewExpAmount}
                  placeholder="e.g. 1500"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
                {newExpAmount && !isNaN(parseFloat(newExpAmount)) && trip.members.length > 0 && (
                  <Text style={[styles.splitPreview, { color: colors.textSecondary }]}>
                    ≈ ₱{Math.round(parseFloat(newExpAmount) / trip.members.length).toLocaleString()} per person
                  </Text>
                )}
              </View>

              {/* Paid By */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PAID BY *</Text>
                <View style={styles.memberPicker}>
                  {trip.members.map((m: any) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.memberChip,
                        {
                          backgroundColor: newExpPaidByUserId === m.userId ? colors.brand : colors.surface,
                          borderColor: newExpPaidByUserId === m.userId ? colors.brand : colors.cardBorder,
                        }
                      ]}
                      onPress={() => setNewExpPaidByUserId(m.userId)}
                    >
                      <Text style={[
                        styles.memberChipText,
                        { color: newExpPaidByUserId === m.userId ? '#FFFFFF' : colors.text }
                      ]}>
                        {m.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Split With */}
              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    SPLIT WITH {newExpSplitUserIds.length === 0 ? '(ALL MEMBERS)' : `(${newExpSplitUserIds.length} selected)`}
                  </Text>
                  {newExpSplitUserIds.length > 0 && (
                    <TouchableOpacity onPress={() => setNewExpSplitUserIds([])}>
                      <Text style={[styles.resetText, { color: colors.brand }]}>Reset to All</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.memberPicker}>
                  {trip.members.map((m: any) => {
                    const isSelected = newExpSplitUserIds.length === 0 || newExpSplitUserIds.includes(m.userId);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor: isSelected ? colors.brandLight : colors.surface,
                            borderColor: isSelected ? colors.brand : colors.cardBorder,
                          }
                        ]}
                        onPress={() => {
                          const allIds = trip.members.map((mm: any) => mm.userId);
                          const current = newExpSplitUserIds.length === 0 ? allIds : [...newExpSplitUserIds];
                          if (current.includes(m.userId)) {
                            const next = current.filter((id: string) => id !== m.userId);
                            setNewExpSplitUserIds(next.length === allIds.length ? [] : next);
                          } else {
                            setNewExpSplitUserIds([...current, m.userId]);
                          }
                        }}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={12} color={colors.brand} />
                        )}
                        <Text style={[styles.memberChipText, { color: colors.text }]}>
                          {m.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                onPress={handleAddExpense}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Log Bill</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SCAN RECEIPT MODAL */}
      <Modal visible={scanModalVisible} animationType="slide" transparent onRequestClose={() => setScanModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.scannerContainer]}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Agilito AI Receipt Scanner</Text>
              <TouchableOpacity onPress={() => setScanModalVisible(false)} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinderFrame}>
                  {/* Glowing Laser line moves vertically during scan */}
                  {scanning && (
                    <Animated.View
                      style={[
                        styles.laserLine,
                        {
                          transform: [
                            {
                              translateY: scanAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, (SCREEN_W - 80) * 1.35 - 15],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  )}

                  {/* Mock receipt view inside camera viewfinder */}
                  <View style={{ width: '85%', height: '85%', padding: 14, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
                    <Text style={[styles.mockReceiptText, { fontSize: 11, fontFamily: 'Courier', textAlign: 'center', marginBottom: 6, fontWeight: 'bold' }]}>
                      {MOCK_RECEIPTS[activeReceiptIdx].merchant.toUpperCase()}
                    </Text>
                    <Text style={[styles.mockReceiptText, { fontSize: 8, fontFamily: 'Courier', textAlign: 'center', color: '#64748B', marginBottom: 12 }]}>
                      {MOCK_RECEIPTS[activeReceiptIdx].date}
                    </Text>
                    {MOCK_RECEIPTS[activeReceiptIdx].items.map((line, lIdx) => (
                      <Text key={lIdx} style={[styles.mockReceiptText, { fontFamily: 'Courier', color: '#1E293B' }]}>
                        {line}
                      </Text>
                    ))}
                  </View>

                  {/* Scan Status Badge inside viewfinder */}
                  {scanning && (
                    <View style={styles.scanStatusBadge}>
                      <ActivityIndicator size="small" color="#38BDF8" />
                      <Text style={styles.scanStatusText}>{scanPhase}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Receipt Carousel selector */}
              {!scanning && (
                <View style={{ marginVertical: 12 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'Poppins-Bold', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 }}>
                    Select Receipt to Scan
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {MOCK_RECEIPTS.map((r, idx) => (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.8}
                        onPress={() => setActiveReceiptIdx(idx)}
                        style={[
                          styles.mockReceiptCard,
                          {
                            borderColor: activeReceiptIdx === idx ? '#38BDF8' : '#334155',
                            backgroundColor: activeReceiptIdx === idx ? '#0F172A' : '#1E293B',
                          }
                        ]}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Poppins-Bold' }}>
                          {r.merchant}
                        </Text>
                        <Text style={{ color: '#38BDF8', fontSize: 12, fontFamily: 'Poppins-SemiBold' }}>
                          ₱{r.amount.toLocaleString()}
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Poppins-Medium' }}>
                          Category: {r.category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Shutter capture button */}
              {!scanning && (
                <TouchableOpacity
                  style={styles.shutterBtn}
                  onPress={handleScanReceipt}
                  activeOpacity={0.7}
                >
                  <Ionicons name="scan" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteConfirmVisible(false)}
        >
          <View style={[styles.deleteModal, { backgroundColor: colors.card }]}>
            <View style={[styles.deleteIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Remove Expense?</Text>
            <Text style={[styles.deleteDesc, { color: colors.textSecondary }]}>
              This will permanently remove "{expenseToDelete?.title}" and recalculate all shared balances. This cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteCancel, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={[styles.deleteCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirm}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  anchorBar: { width: 4, height: 12, borderRadius: 2, marginRight: 6 },
  anchorTitle: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Spend card */
  spendCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardSubLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Poppins-Bold',
  },
  cardAmount: {
    fontSize: 30,
    color: '#FFFFFF',
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    marginTop: 2,
  },
  cardBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetSection: {
    marginBottom: 14,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  budgetLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  budgetPct: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  budgetTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: 3 },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  cardStatValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  cardStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  /* Over-budget nudge */
  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  nudgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#DC2626',
    lineHeight: 17,
  },

  /* Sections */
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expenseCount: { fontSize: 12, fontFamily: 'Poppins-Medium' },

  /* Category scroll */
  categoryScroll: { gap: 8 },
  categoryChip: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    minWidth: 72,
  },
  categoryChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  categoryChipPct: {
    fontSize: 12,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },

  /* Search + filter */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Expense cards */
  expenseList: { gap: 10 },
  expCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  expIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  expTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  expMeta: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  oweBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oweBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#DC2626',
  },
  expRight: { alignItems: 'flex-end', gap: 8 },
  expAmount: {
    fontSize: 15,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Empty */
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 17,
  },
  emptyActionBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
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
  modalCloseBtn: { padding: 4 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  aiTagText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  categoryPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryPickerText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  splitPreview: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 6,
  },
  memberPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  resetText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Delete modal */
  deleteModal: {
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  deleteIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  deleteDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 18,
  },
  deleteActions: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  deleteCancel: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  deleteConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  scanBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 20,
  },
  viewfinderFrame: {
    width: SCREEN_W - 80,
    height: (SCREEN_W - 80) * 1.35,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: '#1E293B',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  mockReceiptScroll: {
    maxHeight: 120,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mockReceiptCard: {
    width: SCREEN_W - 80,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    marginHorizontal: 10,
    gap: 8,
  },
  mockReceiptText: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#334155',
    lineHeight: 14,
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#38BDF8',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanStatusBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  scanStatusText: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
