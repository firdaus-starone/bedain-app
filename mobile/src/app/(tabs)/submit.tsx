import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function SubmitScreen() {
  const { isDarkMode, colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Opini');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  const dyn = {
    bg: { backgroundColor: colors.background },
    borderB: { borderBottomColor: colors.border },
    textMain: { color: colors.text },
    textMuted: { color: isDarkMode ? '#cbd5e1' : '#64748b' },
    inputContainer: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    uploadBox: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#475569' : '#cbd5e1' },
    uploadBtn: { backgroundColor: colors.card, borderColor: colors.border },
    editorBox: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    editorToolbar: { borderBottomColor: colors.border, backgroundColor: colors.card },
    toolBtn: { backgroundColor: colors.card, borderColor: colors.border },
    checkboxContainer: { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
    checkbox: { backgroundColor: colors.card, borderColor: isDarkMode ? '#475569' : '#cbd5e1' },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dyn.bg]}>
      <ScrollView style={[styles.container, dyn.bg]} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Hero */}
        <View style={[styles.heroSection, dyn.borderB]}>
          <View style={styles.heroBadge}>
            <Ionicons name="megaphone-outline" size={14} color="#ef4444" />
            <Text style={styles.heroBadgeText}>Suara Warga & Jurnalisme Warga</Text>
          </View>
          <Text style={[styles.heroTitle, dyn.textMain]}>
            Kirim Tulisan ke <Text style={styles.textRed}>Bedain News</Text>
          </Text>
          <Text style={[styles.heroDesc, dyn.textMuted]}>
            Jadilah bagian dari perubahan informasi! Kirimkan opini, reportase warga, puisi, tips edukatif, atau cerita inspiratifmu. Tulisan terpilih akan ditayangkan di beranda dan dibaca ribuan masyarakat luas.
          </Text>
        </View>

        {/* 1. Identitas Penulis */}
        <View style={[styles.sectionBlock, dyn.borderB]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#ef4444" />
            <Text style={[styles.sectionTitle, dyn.textMain]}>1. Identitas Penulis / Kontributor</Text>
          </View>
          
          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Nama Lengkap / Nama Pena <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputContainer, dyn.inputContainer]}>
            <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput style={[styles.input, dyn.textMain]} placeholder="Contoh: Ahmad Fauzi" placeholderTextColor="#64748b" value={name} onChangeText={setName} />
          </View>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Alamat Email Aktif <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputContainer, dyn.inputContainer]}>
            <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput style={[styles.input, dyn.textMain]} placeholder="fauzi@gmail.com" placeholderTextColor="#64748b" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </View>
        </View>

        {/* 2. Detail Artikel & Isi Tulisan */}
        <View style={[styles.sectionBlock, dyn.borderB]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#ef4444" />
            <Text style={[styles.sectionTitle, dyn.textMain]}>2. Detail Artikel & Isi Tulisan</Text>
          </View>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Judul Tulisan <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputContainer, dyn.inputContainer]}>
            <TextInput style={[styles.input, dyn.textMain, { marginLeft: 12 }]} placeholder="Buat judul yang menarik dan mencerminkan isi..." placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
          </View>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Kategori Pilihan <Text style={styles.required}>*</Text></Text>
          <View style={[styles.inputContainer, dyn.inputContainer]}>
            <Ionicons name="pricetag-outline" size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput style={[styles.input, dyn.textMain]} placeholder="Opini" placeholderTextColor="#e2e8f0" value={category} onChangeText={setCategory} editable={false} />
            <Ionicons name="chevron-down" size={18} color="#64748b" style={{ marginRight: 12 }} />
          </View>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Ringkasan Singkat / Excerpt <Text style={styles.optional}>(Opsional)</Text></Text>
          <View style={[styles.inputContainer, dyn.inputContainer]}>
            <TextInput style={[styles.input, dyn.textMain, { marginLeft: 12 }]} placeholder="1-2 kalimat rangkuman untuk tampilan kartu berita..." placeholderTextColor="#64748b" value={excerpt} onChangeText={setExcerpt} />
          </View>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Foto Utama / Sampul Tulisan <Text style={styles.optional}>(Maksimal 5MB - format JPG/PNG/WebP)</Text></Text>
          <TouchableOpacity style={[styles.uploadBox, dyn.uploadBox]}>
            <View style={styles.uploadIconWrap}>
              <Ionicons name="image-outline" size={24} color="#ef4444" />
            </View>
            <Text style={[styles.uploadTitle, dyn.textMain]}>Klik untuk memilih atau unggah foto sampul</Text>
            <Text style={[styles.uploadDesc, dyn.textMuted]}>Foto yang jernih dan menarik meningkatkan pembaca secara drastis</Text>
            <View style={[styles.uploadBtn, dyn.uploadBtn]}>
              <Text style={[styles.uploadBtnText, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Pilih File Gambar</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Isi Tulisan <Text style={styles.required}>*</Text> <Text style={styles.optional}>({content.length} karakter)</Text></Text>
          <View style={[styles.editorBox, dyn.editorBox]}>
            {/* Toolbar */}
            <View style={[styles.editorToolbar, dyn.editorToolbar]}>
              <View style={styles.editorTabs}>
                <View style={[styles.editorTab, styles.editorTabActive]}>
                  <Ionicons name="pencil" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.editorTabTextActive}>Tulis</Text>
                </View>
                <View style={styles.editorTab}>
                  <Ionicons name="eye-outline" size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text style={styles.editorTabText}>Pratinjau (Preview)</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.editorTools, dyn.borderB]}>
              {['Tebal', 'Miring', 'Subjudul (H2)', 'Kutipan', 'Daftar Poin'].map((tool, idx) => (
                <View key={idx} style={[styles.toolBtn, dyn.toolBtn]}>
                  <Text style={[styles.toolBtnText, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>{tool}</Text>
                </View>
              ))}
            </View>

            <TextInput 
              style={[styles.editorInput, dyn.textMain]}
              placeholder="Tuliskan isi artikel atau ceritamu di sini...&#10;Gunakan enter 2 kali untuk membuat paragraf baru yang rapi."
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
          </View>
        </View>

        {/* 3. Pernyataan Keaslian */}
        <View style={[styles.sectionBlock, dyn.borderB]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
            <Text style={[styles.sectionTitle, dyn.textMain]}>3. Pernyataan Keaslian & Kode Etik</Text>
          </View>
          
          <TouchableOpacity style={[styles.checkboxContainer, dyn.checkboxContainer]} onPress={() => setIsAgreed(!isAgreed)} activeOpacity={0.8}>
            <View style={[styles.checkbox, dyn.checkbox, isAgreed && styles.checkboxActive]}>
              {isAgreed && <Ionicons name="checkmark" size={16} color="#ffffff" />}
            </View>
            <Text style={[styles.checkboxText, dyn.textMuted]}>
              Saya menyatakan bahwa tulisan ini adalah <Text style={{fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a'}}>karya asli saya</Text> (bukan hasil plagiarisme atau AI murni tanpa penyuntingan), tidak mengandung unsur SARA/hoaks, dan menyetujui Hak redaksi <Text style={{fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a'}}>Bedain News</Text> untuk menyunting judul atau tata bahasa sebelum ditayangkan.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitMainBtn, !isAgreed && styles.submitMainBtnDisabled]} disabled={!isAgreed}>
          <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.submitMainBtnText}>Kirim Tulisan Sekarang</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingBottom: 40 },
  
  // Hero
  heroSection: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 12 },
  heroBadgeText: { color: '#ef4444', fontSize: 11, fontWeight: '700', marginLeft: 6 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  textRed: { color: '#ef4444' },
  heroDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },

  // Sections
  sectionBlock: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginLeft: 10 },
  
  // Inputs
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  required: { color: '#ef4444' },
  optional: { color: '#94a3b8', fontWeight: '400' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 16 },
  inputIcon: { marginLeft: 12, marginRight: 8 },
  input: { flex: 1, color: '#0f172a', fontSize: 13, paddingVertical: 10, paddingHorizontal: 12 },
  
  // Upload Box
  uploadBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  uploadIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  uploadTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  uploadDesc: { fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 12, lineHeight: 16 },
  uploadBtn: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  uploadBtnText: { color: '#334155', fontSize: 12, fontWeight: '600' },

  // Editor
  editorBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  editorToolbar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  editorTabs: { flexDirection: 'row' },
  editorTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  editorTabActive: { backgroundColor: '#ef4444' },
  editorTabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  editorTabTextActive: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  editorTools: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  toolBtn: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  toolBtnText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  editorInput: { minHeight: 140, padding: 12, color: '#0f172a', fontSize: 13, lineHeight: 20 },

  // Checkbox
  checkboxContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', marginTop: 2 },
  checkboxActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkboxText: { flex: 1, fontSize: 11, color: '#475569', lineHeight: 18 },

  // Submit Main Btn
  submitMainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', marginHorizontal: 20, marginTop: 20, paddingVertical: 14, borderRadius: 8 },
  submitMainBtnDisabled: { opacity: 0.5 },
  submitMainBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});
