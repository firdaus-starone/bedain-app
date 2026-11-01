import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface LanguageSelectorProps {
  variant?: 'button' | 'menu-item';
  onLanguageSelected?: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'button', onLanguageSelected }) => {
  const { lang, languages, currentLanguage, changeLanguage, t } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (code: LanguageCode) => {
    changeLanguage(code);
    setModalVisible(false);
    if (onLanguageSelected) {
      onLanguageSelected();
    }
  };

  return (
    <>
      {variant === 'button' ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
          style={[
            styles.headerBtn,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            },
          ]}
        >
          <Text style={styles.flagText}>{currentLanguage.flag}</Text>
          <Text style={[styles.codeText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
            {currentLanguage.shortLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
          style={[
            styles.menuItem,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderColor: isDarkMode ? '#334155' : '#f1f5f9',
            },
          ]}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: isDarkMode ? '#334155' : '#eff6ff' }]}>
              <Text style={{ fontSize: 18 }}>{currentLanguage.flag}</Text>
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                {t('navigation.language_choice', 'Pilihan Bahasa')}
              </Text>
              <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                {currentLanguage.label} ({currentLanguage.shortLabel})
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
      )}

      {/* Modal Pilihan Bahasa */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                    {t('navigation.language_choice', 'Pilih Bahasa / Language')}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsList}>
                  {languages.map((item) => {
                    const isSelected = item.code === lang;
                    return (
                      <TouchableOpacity
                        key={item.code}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(item.code)}
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected
                              ? isDarkMode
                                ? '#1e3a8a33'
                                : '#eff6ff'
                              : 'transparent',
                            borderColor: isSelected
                              ? colors.primary
                              : isDarkMode
                              ? '#334155'
                              : '#f1f5f9',
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <Text style={styles.optionFlag}>{item.flag}</Text>
                          <View>
                            <Text
                              style={[
                                styles.optionLabel,
                                {
                                  color: isSelected
                                    ? colors.primary
                                    : isDarkMode
                                    ? '#f8fafc'
                                    : '#0f172a',
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                            <Text style={styles.optionSubLabel}>
                              {item.code.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 13,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionFlag: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
});
