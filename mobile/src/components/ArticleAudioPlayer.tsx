import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ArticleAudioPlayerProps {
  article: any;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Pembersih teks berita untuk dibacakan oleh narator AI
 */
const cleanArticleForTTS = (title: string, rawContent: string): string => {
  const cleanStr = (str: string) => {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/&amp;/gi, ' dan ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '')
      .replace(/&gt;/gi, '')
      .replace(/\[[A-Za-z0-9\s/_-]+\]/g, '') // Hapus tag seperti [B]
      .replace(/\(Red[a-z0-9\s/_-]*\)/gi, '') // Hapus tag redaksi
      .replace(/BACA JUGA.*?(?=[.?!]|$)/gi, '') // Hapus kalimat baca juga
      .replace(/([.?!])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanTitle = cleanStr(title);
  let cleanBody = cleanStr(rawContent);

  // Bersihkan kota / dateline media pembuka seperti: "INDRAMAYU - BEDAINNEWS.COM — "
  cleanBody = cleanBody.replace(/^(?:[A-Za-z0-9.\s,]+)?(?:BEDAINNEWS(?:\.COM)?|JAKARTA|INDRAMAYU|BANDUNG|SURABAYA|SEMARANG|MEDAN|ANTARA|KOMPAS|DETIK|CNN)(?:\.COM)?(?:\s*[-–—]+\s*)+/i, '');
  cleanBody = cleanBody.replace(/^[A-Za-z0-9.\s,]{2,25}\s*[-–—]+\s*/, '');

  return `${cleanTitle}. ${cleanBody}`.trim();
};

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({ article, containerStyle }) => {
  const { isDarkMode } = useTheme();
  const webViewRef = useRef<WebView>(null);

  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [rate, setRate] = useState<number>(1.0);
  const [isReady, setIsReady] = useState(false);

  // Animasi Soundwave 4 Bar Equalizer
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.8)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;
  const bar4 = useRef(new Animated.Value(0.9)).current;
  const animLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (status === 'playing') {
      const createBarAnim = (animVal: Animated.Value, toVal: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animVal, { toValue: toVal, duration, useNativeDriver: true }),
            Animated.timing(animVal, { toValue: 0.3, duration, useNativeDriver: true }),
          ])
        );
      };

      const loop = Animated.parallel([
        createBarAnim(bar1, 1.4, 380),
        createBarAnim(bar2, 1.8, 460),
        createBarAnim(bar3, 1.2, 320),
        createBarAnim(bar4, 1.6, 500),
      ]);
      animLoop.current = loop;
      loop.start();
    } else {
      if (animLoop.current) {
        animLoop.current.stop();
      }
      Animated.parallel([
        Animated.timing(bar1, { toValue: 0.4, duration: 200, useNativeDriver: true }),
        Animated.timing(bar2, { toValue: 0.4, duration: 200, useNativeDriver: true }),
        Animated.timing(bar3, { toValue: 0.4, duration: 200, useNativeDriver: true }),
        Animated.timing(bar4, { toValue: 0.4, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  // Hentikan audio jika user keluar / berpindah screen
  useEffect(() => {
    return () => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.stopArticle) { window.stopArticle(); }
          true;
        `);
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (!webViewRef.current || !article) return;

    if (status === 'idle') {
      const fullSpeechText = cleanArticleForTTS(article.title || '', article.content || '');
      if (!fullSpeechText) return;

      const js = `
        if (window.speakArticle) {
          window.speakArticle(${JSON.stringify(fullSpeechText)}, ${rate});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
      setStatus('playing');
    } else if (status === 'playing') {
      webViewRef.current.injectJavaScript(`
        if (window.pauseArticle) { window.pauseArticle(); }
        true;
      `);
      setStatus('paused');
    } else if (status === 'paused') {
      webViewRef.current.injectJavaScript(`
        if (window.resumeArticle) { window.resumeArticle(); }
        true;
      `);
      setStatus('playing');
    }
  };

  const handleStop = () => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      if (window.stopArticle) { window.stopArticle(); }
      true;
    `);
    setStatus('idle');
  };

  const handleChangeRate = (newRate: number) => {
    setRate(newRate);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.setRate) { window.setRate(${newRate}); }
        true;
      `);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsReady(true);
      } else if (data.type === 'start') {
        setStatus('playing');
      } else if (data.type === 'pause') {
        setStatus('paused');
      } else if (data.type === 'resume') {
        setStatus('playing');
      } else if (data.type === 'end' || data.type === 'error') {
        setStatus('idle');
      }
    } catch (e) {
      // ignore
    }
  };

  // HTML Headless untuk engine TTS
  const webViewSource = {
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script>
          const synth = window.speechSynthesis;
          let chunks = [];
          let currentChunkIndex = 0;
          let currentRate = 1.0;
          let isPaused = false;
          let isSpeaking = false;

          function sendStatus(type, extra = {}) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...extra }));
            }
          }

          function getBestIndonesianVoice() {
            if (!synth) return null;
            const voices = synth.getVoices() || [];
            return voices.find(v => v.lang && (v.lang.startsWith('id') || v.lang.startsWith('in'))) || null;
          }

          function splitTextIntoSentences(text) {
            if (!text) return [];
            // Pecah berdasarkan tanda baca kalimat agar narasi mengalir alami
            const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
            const cleanParts = [];
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i].trim();
              if (part.length > 0) {
                cleanParts.push(part);
              }
            }
            return cleanParts;
          }

          function playNextChunk() {
            if (!isSpeaking) return;
            if (currentChunkIndex >= chunks.length) {
              isSpeaking = false;
              sendStatus('end');
              return;
            }

            const sentence = chunks[currentChunkIndex];
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = 'id-ID';
            utterance.rate = currentRate;

            const idVoice = getBestIndonesianVoice();
            if (idVoice) {
              utterance.voice = idVoice;
            }

            utterance.onend = function() {
              if (isSpeaking && !isPaused) {
                currentChunkIndex++;
                playNextChunk();
              }
            };

            utterance.onerror = function(e) {
              if (e.error !== 'interrupted' && e.error !== 'canceled') {
                currentChunkIndex++;
                playNextChunk();
              }
            };

            synth.speak(utterance);
          }

          window.speakArticle = function(text, rate = 1.0) {
            if (!synth) {
              sendStatus('error', { message: 'TTS tidak didukung' });
              return;
            }
            synth.cancel();
            isPaused = false;
            isSpeaking = true;
            currentRate = rate;
            currentChunkIndex = 0;
            chunks = splitTextIntoSentences(text);

            if (chunks.length === 0) {
              sendStatus('end');
              return;
            }

            sendStatus('start');
            playNextChunk();
          };

          window.pauseArticle = function() {
            if (synth && isSpeaking && !isPaused) {
              synth.pause();
              isPaused = true;
              sendStatus('pause');
            }
          };

          window.resumeArticle = function() {
            if (synth && isPaused) {
              synth.resume();
              isPaused = false;
              sendStatus('resume');
            }
          };

          window.stopArticle = function() {
            if (synth) {
              synth.cancel();
              isSpeaking = false;
              isPaused = false;
              currentChunkIndex = 0;
              chunks = [];
              sendStatus('end');
            }
          };

          window.setRate = function(rate) {
            currentRate = rate;
          };

          document.addEventListener('DOMContentLoaded', function() {
            sendStatus('ready');
          });
        </script>
      </body>
      </html>
    `
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode
            ? (status === 'playing' ? 'rgba(239, 68, 68, 0.12)' : '#1e2430')
            : (status === 'playing' ? '#fff1f2' : '#f8fafc'),
          borderColor: status === 'playing'
            ? '#ef4444'
            : (isDarkMode ? '#334155' : '#e2e8f0'),
        },
        status === 'playing' && styles.playingShadow,
        containerStyle,
      ]}
    >
      {/* Headless WebView untuk speech synthesis engine */}
      <View style={{ width: 0, height: 0, overflow: 'hidden', position: 'absolute' }}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={webViewSource}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
        />
      </View>

      {/* Bagian Atas: Ikon, Info & Equalizer */}
      <View style={styles.topRow}>
        <View style={styles.iconInfoRow}>
          <View style={[styles.iconWrapper, status === 'playing' ? styles.iconWrapperPlaying : styles.iconWrapperIdle]}>
            <Ionicons
              name={status === 'playing' ? "headset" : "volume-medium"}
              size={22}
              color={status === 'playing' ? "#ffffff" : "#ef4444"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                Dengarkan Berita AI
              </Text>
              {status === 'playing' && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE AUDIO</Text>
                </View>
              )}
              {status === 'paused' && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedBadgeText}>DIJEDA</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              {status === 'playing'
                ? 'Narator AI sedang membacakan artikel ini...'
                : status === 'paused'
                ? 'Narasi dijeda. Ketuk tombol untuk lanjut.'
                : 'Dengarkan layaknya podcast saat beraktivitas'}
            </Text>
          </View>
        </View>

        {/* Animasi Soundwave Bar */}
        {status === 'playing' && (
          <View style={styles.soundwaveContainer}>
            <Animated.View style={[styles.soundwaveBar, { transform: [{ scaleY: bar1 }] }]} />
            <Animated.View style={[styles.soundwaveBar, { transform: [{ scaleY: bar2 }] }]} />
            <Animated.View style={[styles.soundwaveBar, { transform: [{ scaleY: bar3 }] }]} />
            <Animated.View style={[styles.soundwaveBar, { transform: [{ scaleY: bar4 }] }]} />
          </View>
        )}
      </View>

      {/* Bagian Bawah: Tombol Play/Pause/Stop & Kontrol Kecepatan */}
      <View style={styles.controlsRow}>
        {/* Tombol Play / Pause */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTogglePlay}
          style={[
            styles.playButton,
            {
              backgroundColor: status === 'playing' ? '#dc2626' : '#ef4444',
            },
          ]}
        >
          <Ionicons
            name={status === 'playing' ? "pause" : "play"}
            size={16}
            color="#ffffff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.playButtonText}>
            {status === 'playing' ? 'Jeda Suara' : status === 'paused' ? 'Lanjutkan' : 'Putar Suara'}
          </Text>
        </TouchableOpacity>

        {/* Tombol Stop jika sedang aktif */}
        {status !== 'idle' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStop}
            style={[
              styles.stopButton,
              { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' },
            ]}
          >
            <Ionicons name="stop" size={16} color={isDarkMode ? '#f8fafc' : '#475569'} />
          </TouchableOpacity>
        )}

        {/* Pilihan Kecepatan */}
        <View style={styles.speedRow}>
          {[1.0, 1.25, 1.5].map((speed) => {
            const isSelected = rate === speed;
            return (
              <TouchableOpacity
                key={speed}
                activeOpacity={0.7}
                onPress={() => handleChangeRate(speed)}
                style={[
                  styles.speedChip,
                  {
                    backgroundColor: isSelected
                      ? '#ef4444'
                      : (isDarkMode ? '#0f172a' : '#ffffff'),
                    borderColor: isSelected
                      ? '#ef4444'
                      : (isDarkMode ? '#334155' : '#cbd5e1'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.speedChipText,
                    { color: isSelected ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b') },
                  ]}
                >
                  {speed}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default ArticleAudioPlayer;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.2,
    marginVertical: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  playingShadow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperIdle: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  iconWrapperPlaying: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  liveBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  pausedBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  pausedBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingRight: 4,
  },
  soundwaveBar: {
    width: 3.5,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#ef4444',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.1)',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 'auto',
  },
  speedChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  speedChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
