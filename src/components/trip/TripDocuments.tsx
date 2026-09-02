import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDocument as dbAddDocument, deleteDocument as dbDeleteDocument } from '../../services/tripService';
import { AI_FEATURES_ENABLED } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, EmptyState,
  Sheet, Field, Segmented, Txt, IconButton, Card, Button,
} from '../ui/primitives';
import { space } from '../ui/tokens';
import { notify, confirmAction } from '../ui/Feedback';

interface TripDocumentsProps {
  trip: any;
  colors?: any;
  isOrganizer: boolean;
  loadTrip: () => void;
  /** Rendered inside another screen — omit the header and outer padding. */
  embedded?: boolean;
}

type DocType = 'pdf' | 'png' | 'jpg' | 'docx';

/** Monochrome icon per file kind. Type is communicated by label, not colour. */
function docIcon(title: string): keyof typeof Ionicons.glyphMap {
  const ext = title.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'document-text-outline';
  if (ext === 'doc' || ext === 'docx') return 'document-outline';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image-outline';
  return 'document-attach-outline';
}

function docKind(title: string): string {
  const ext = title.split('.').pop()?.toUpperCase();
  return ext && ext.length <= 4 ? ext : 'FILE';
}

export default function TripDocuments({
  trip, isOrganizer, loadTrip, embedded,
}: TripDocumentsProps) {
  const { colors } = useTheme();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('pdf');
  const [saving, setSaving] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);

  const documents = trip.documents ?? [];

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const finalTitle = trimmed.toLowerCase().endsWith(`.${docType}`) ? trimmed : `${trimmed}.${docType}`;
    const size = `${(Math.random() * 2 + 0.2).toFixed(1)} MB`;

    setSaving(true);
    try {
      const { error } = await dbAddDocument(trip.id, finalTitle, docType, size);
      if (error) { notify(error, 'error'); return; }
      setTitle('');
      setSheetOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (doc: any) => {
    confirmAction({
        title: 'Remove document?',
        message: `"${doc.title}" will be removed from this trip.`,
        confirmLabel: 'Remove',
        destructive: true,
      }).then(async (ok) => {
        if (!ok) return;
        const { error } = await dbDeleteDocument(doc.id);
        if (error) notify(error, 'error');
        else loadTrip();
      });
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const { extractDocumentDetails } = await import('../../services/aiService');
      setScanResults(await extractDocumentDetails(documents.map((d: any) => d.title)));
    } catch {
      setScanResults([]);
      notify('Scan unavailable. Agilito could not read these documents right now.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const body = (
    <>
      {documents.length === 0 ? (
        <EmptyState
          icon="document-attach-outline"
          title="No documents yet"
          description="Keep tickets, bookings and confirmations where the whole group can find them."
          action={{ label: 'Add document', onPress: () => setSheetOpen(true) }}
        />
      ) : (
        <>
          <ListGroup>
            {documents.map((doc: any) => (
              <ListRow
                key={doc.id}
                icon={docIcon(doc.title)}
                title={doc.title}
                subtitle={`${docKind(doc.title)} · ${doc.fileSize}`}
                showChevron={false}
                trailing={
                  isOrganizer ? (
                    <IconButton icon="trash-outline" size={30} destructive onPress={() => confirmDelete(doc)} />
                  ) : undefined
                }
              />
            ))}
          </ListGroup>

          {AI_FEATURES_ENABLED && (
            <Card style={{ marginTop: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="headline">Read details from documents</Txt>
                  <Txt variant="subhead" tone="muted" style={{ marginTop: 2 }}>
                    Agilito can pull flight times and bookings into your itinerary.
                  </Txt>
                </View>
              </View>

              <Button
                label={scanning ? 'Reading' : 'Scan documents'}
                variant="secondary"
                loading={scanning}
                onPress={handleScan}
                fullWidth
                style={{ marginTop: space.lg }}
              />

              {scanResults.length > 0 && (
                <View style={{ marginTop: space.lg, gap: space.sm }}>
                  {scanResults.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                      <Ionicons name="ellipse" size={5} color={colors.textMuted} style={{ marginTop: 7 }} />
                      <Txt variant="subhead" tone="secondary" style={{ flex: 1 }}>{s}</Txt>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}
        </>
      )}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add document"
        primaryAction={{
          label: 'Add document',
          onPress: handleAdd,
          loading: saving,
          disabled: !title.trim(),
        }}
      >
        <Field
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Flight tickets, hotel voucher…"
          autoFocus
        />
        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Format
          </Txt>
          <Segmented<DocType>
            value={docType}
            onChange={setDocType}
            segments={[
              { value: 'pdf', label: 'PDF' },
              { value: 'png', label: 'PNG' },
              { value: 'jpg', label: 'JPG' },
              { value: 'docx', label: 'DOCX' },
            ]}
          />
        </View>
      </Sheet>
    </>
  );

  // Embedded inside Trip settings — the host screen owns the header and padding.
  if (embedded) {
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
          <Txt variant="footnote" tone="muted" style={{ flex: 1 }}>
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </Txt>
          <IconButton icon="add" size={32} onPress={() => setSheetOpen(true)} />
        </View>
        {body}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          eyebrow={trip.destination}
          title="Documents"
          subtitle={`${documents.length} ${documents.length === 1 ? 'file' : 'files'}`}
          action={{ icon: 'add', onPress: () => setSheetOpen(true), label: 'Add document' }}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section>{body}</Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
});
