import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input, TabBar, ProgressBar } from '../components/UI';
import { getLibraryIndex, addDocument, deleteDocument, libraryStats } from '../utils/userLibrary';
import { getBookCount } from '../utils/knowledge';
import { askClaude } from '../utils/ai';

export default function LibraryScreen() {
  const [tab, setTab] = useState(0);
  const [index, setIndex] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');

  const refresh = async () => setIndex(await getLibraryIndex());
  useEffect(() => { refresh(); }, []);

  // ─── PDF / text file upload ───
  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/markdown', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;

      const file = res.assets[0];
      setBusy(true);
      setStatus(`Reading ${file.name}...`);

      let text = '';

      if (file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // React Native has no native PDF text extraction. Read the raw bytes
        // and pull out text between stream markers — works for most text-based
        // PDFs, fails on scanned images.
        setStatus('Extracting text from PDF...');
        const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 })
          .catch(() => null);

        if (raw) {
          text = extractPdfText(raw);
        }

        if (!text || text.length < 200) {
          setBusy(false);
          setStatus('');
          Alert.alert(
            'Could not read this PDF',
            'It is probably a scanned image rather than text. Open the PDF, copy the text you want, and use the Paste Text tab instead.'
          );
          return;
        }
      } else {
        text = await FileSystem.readAsStringAsync(file.uri);
      }

      setStatus('Saving to library...');
      const title = file.name.replace(/\.(pdf|txt|md|epub)$/i, '');
      await addDocument({ title, type: 'pdf', text, source: file.name });
      await refresh();
      setBusy(false);
      setStatus('');
      Alert.alert('Added', `"${title}" is now part of what the AI knows.`);
    } catch (e) {
      setBusy(false);
      setStatus('');
      Alert.alert('Upload failed', String(e.message || e));
    }
  };

  // Crude but effective text extraction from uncompressed PDF streams
  const extractPdfText = (raw) => {
    const parts = [];
    const re = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
      parts.push(m[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\([()\\])/g, '$1'));
      if (parts.length > 25000) break;
    }
    // Also catch TJ array form
    const re2 = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
    while ((m = re2.exec(raw)) !== null) {
      const inner = m[1];
      const sub = inner.match(/\(((?:[^()\\]|\\.)*)\)/g) || [];
      sub.forEach(sPart => parts.push(sPart.slice(1, -1)));
      if (parts.length > 25000) break;
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  // ─── Paste text ───
  const savePaste = async () => {
    if (!pasteTitle.trim() || pasteText.trim().length < 50) {
      Alert.alert('Not enough', 'Give it a title and paste at least a paragraph.');
      return;
    }
    setBusy(true);
    try {
      await addDocument({ title: pasteTitle.trim(), type: 'text', text: pasteText, source: 'pasted' });
      await refresh();
      setPasteTitle(''); setPasteText('');
      Alert.alert('Added', 'The AI can now draw on this.');
    } catch (e) {
      Alert.alert('Failed', String(e.message || e));
    }
    setBusy(false);
  };

  // ─── Voice/training note, expanded by AI before saving ───
  const saveNote = async () => {
    if (!noteTitle.trim() || noteText.trim().length < 20) {
      Alert.alert('Not enough', 'Give it a title and a few lines.');
      return;
    }
    setBusy(true);
    setStatus('Structuring your notes...');
    const res = await askClaude(
      `Below are rough notes from a NeoLife or freelancing training session. Clean them into structured, searchable knowledge — keep every point, fix the grammar, organise under headings. Do not add advice that is not in the notes. Do not shorten the substance.\n\nTITLE: ${noteTitle}\n\nNOTES:\n${noteText}`,
      { maxTokens: 2000 }
    );
    const finalText = res.ok ? res.text : noteText;
    try {
      await addDocument({ title: noteTitle.trim(), type: 'note', text: finalText, source: 'training note' });
      await refresh();
      setNoteTitle(''); setNoteText('');
      Alert.alert('Added', res.ok ? 'Notes cleaned up and saved.' : 'Saved as written (AI was unavailable).');
    } catch (e) {
      Alert.alert('Failed', String(e.message || e));
    }
    setBusy(false);
    setStatus('');
  };

  const removeDoc = (entry) => {
    Alert.alert('Remove?', `"${entry.title}" will be deleted from the AI's knowledge.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteDocument(entry.id); refresh(); } },
    ]);
  };

  const totalChars = index.reduce((s, e) => s + (e.chars || 0), 0);
  const typeIcon = (t) => t === 'pdf' ? '📕' : t === 'note' ? '✍️' : '📄';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>AI Library</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        What the AI knows · {getBookCount()} built-in books + {index.length} of yours
      </Text>

      {busy && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <Text style={{ color: COLORS.accent, fontSize: 12 }}>{status || 'Working...'}</Text>
        </Card>
      )}

      <TabBar tabs={['My library', 'Upload', 'Notes']} active={tab} onChange={setTab} />

      {/* ─── LIBRARY ─── */}
      {tab === 0 && (
        <View>
          <Card glow={COLORS.primary}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>YOUR UPLOADS</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.t1 }}>{index.length}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                  {(totalChars / 1000).toFixed(0)}k characters indexed
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>BUILT IN</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.accent }}>{getBookCount()}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>books</Text>
              </View>
            </View>
          </Card>

          {index.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>📚</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>Nothing uploaded yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Add your FHG training documents, NeoLife materials, or any book you want the AI
                to think with.
              </Text>
            </Card>
          ) : (
            index.map(entry => (
              <Card key={entry.id} style={{ padding: 13 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <Text style={{ fontSize: 20 }}>{typeIcon(entry.type)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 2 }}>
                      {(entry.chars / 1000).toFixed(0)}k chars · {entry.chunks} sections · {entry.added}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDoc(entry)}>
                    <Text style={{ color: COLORS.danger, fontSize: 11 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}

          <Card style={{ backgroundColor: COLORS.surface }}>
            <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
              Everything here is searched before the AI answers. Ask about prospecting and it pulls
              the relevant passages from your uploads and the built-in books, then advises from
              them — without quoting or citing, like a mentor who read them.
            </Text>
          </Card>
        </View>
      )}

      {/* ─── UPLOAD ─── */}
      {tab === 1 && (
        <View>
          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Upload a file
            </Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>
              PDF, TXT or Markdown. Text-based PDFs work; scanned images do not — for those,
              copy the text and use Paste instead.
            </Text>
            <Btn full onPress={pickFile}>{busy ? 'Working...' : 'Choose a file'}</Btn>
          </Card>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Paste text
            </Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10 }}>
              Best for audiobook transcripts, YouTube captions, or anything you copied.
            </Text>
            <Input value={pasteTitle} onChangeText={setPasteTitle} placeholder="Title (e.g. Go Pro chapter 4)" />
            <View style={{ height: 10 }} />
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="Paste the text here..."
              placeholderTextColor={COLORS.t3}
              multiline
              style={s.textarea}
            />
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 6 }}>
              {pasteText.length.toLocaleString()} characters
            </Text>
            <Btn full onPress={savePaste} style={{ marginTop: 10 }}>Add to library</Btn>
          </Card>
        </View>
      )}

      {/* ─── NOTES ─── */}
      {tab === 2 && (
        <View>
          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Training notes
            </Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>
              Type what you learned at office, training, or from a video. The AI cleans it into
              structured knowledge without adding anything you did not say, then files it.
            </Text>
            <Input value={noteTitle} onChangeText={setNoteTitle} placeholder="e.g. Saturday training — handling objections" />
            <View style={{ height: 10 }} />
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Rough notes, no need to be neat..."
              placeholderTextColor={COLORS.t3}
              multiline
              style={s.textarea}
            />
            <Btn full color={COLORS.accent} onPress={saveNote} style={{ marginTop: 10 }}>
              {busy ? 'Processing...' : 'Clean up and save'}
            </Btn>
          </Card>

          <Card style={{ backgroundColor: COLORS.surface }}>
            <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
              Notes go through the AI to fix grammar and add structure, but the instruction is
              strict: keep every point, add nothing. If the AI is unavailable the note saves
              exactly as written.
            </Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  textarea: {
    width: '100%', minHeight: 140, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, color: COLORS.t1, padding: 12, fontSize: 13,
    textAlignVertical: 'top',
  },
});