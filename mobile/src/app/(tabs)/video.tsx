import { View, Text, StyleSheet, FlatList, Dimensions, Image, TouchableOpacity, StatusBar, BackHandler, AppState, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRouter, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

const getYouTubeId = (input: string) => {
  if (!input || typeof input !== 'string') return null;
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = input.match(regExp);
  return match ? match[1] : null;
};
const getArticleVideoId = (article: any) => {
  if (!article) return null;
  return getYouTubeId(article.videoUrl) || getYouTubeId(article.youtubeUrl) || getYouTubeId(article.video) || getYouTubeId(article.content);
};

const VideoItem = ({ item, index, activeIndex, width, containerHeight, router, isScreenFocused }: any) => {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showTitleBlocker, setShowTitleBlocker] = useState(true);
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || Math.floor(Math.random() * 5) + 1);

  const handleLike = () => {
    if (isLiked) {
      setLikeCount((prev: number) => prev - 1);
      setIsLiked(false);
    } else {
      setLikeCount((prev: number) => prev + 1);
      setIsLiked(true);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Tonton video menarik ini di Bedain News: ${item.title}\n\nhttps://bedainnews.com/article/${item.id}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const ytId = getArticleVideoId(item);
  const coverUri = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (item.coverImage || item.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80');
  
  const isActive = index === activeIndex && isScreenFocused;

  useEffect(() => {
    if (!isActive) {
      setIsVideoReady(false);
      setShowTitleBlocker(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (isVideoReady) {
      const timer = setTimeout(() => setShowTitleBlocker(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isVideoReady]);

  let isShort = [item.videoUrl, item.youtubeUrl, item.video].some(u => typeof u === 'string' && u.includes('/shorts/'));
  
  if (!isShort && typeof item.video === 'string') {
    const wMatch = item.video.match(/width=["']?(\d+)/);
    const hMatch = item.video.match(/height=["']?(\d+)/);
    if (wMatch && hMatch && parseInt(hMatch[1]) > parseInt(wMatch[1])) {
      isShort = true;
    }
  }

  const playerHeight = containerHeight;
  const playerWidth = width;

  const customYoutubeHtml = ytId ? `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; background-color: #000; overflow: hidden; }
        .container { position: relative; width: 100vw; height: 100vh; }
        .video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="video" id="player"></div>
      </div>
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        var player;
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            width: '100%',
            height: '100%',
            videoId: '${ytId}',
            playerVars: {
              playsinline: 1,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              fs: 0
            },
            events: {
              'onReady': function(event) {
                 event.target.playVideo();
              }
            }
          });
        }
      </script>
    </body>
  </html>
  ` : null;

  let embedUrl = null;
  let isRawHtml = false;
  
  if (!ytId) {
     const urlSources = [item.videoUrl, item.youtubeUrl, item.video].filter(u => typeof u === 'string');
     
     if (urlSources.length === 0 && typeof item.content === 'string') {
       const iframeMatch = item.content.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
       if (iframeMatch) {
         urlSources.push(`<iframe src="${iframeMatch[1]}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`);
       } else if (item.content.includes('<video')) {
         const videoMatch = item.content.match(/<video[^>]*>.*?<\/video>/is);
         if (videoMatch) {
           urlSources.push(videoMatch[0].replace(/<video/, '<video width="100%" height="100%" autoplay muted loop playsinline style="object-fit:cover;"'));
         }
       }
     }

     for (const u of urlSources) {
       if (u.includes('<iframe')) {
         embedUrl = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="margin:0;padding:0;background-color:#000;display:flex;justify-content:center;align-items:center;">${u}</body></html>`;
         isRawHtml = true;
         break;
       } else if (u.includes('.mp4')) {
         embedUrl = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="margin:0;padding:0;background-color:#000;"><video width="100%" height="100%" autoplay muted loop playsinline style="object-fit:cover;"><source src="${u}" type="video/mp4"></video></body></html>`;
         isRawHtml = true;
         break;
       } else if (u.includes('http')) {
         embedUrl = u;
         break;
       }
     }
  }

  return (
    <View style={{ width, height: containerHeight, backgroundColor: '#000', overflow: 'hidden' }}>
      {(isActive && ytId && customYoutubeHtml) && (
        <WebView
          style={{ position: 'absolute', top: 0, left: 0, width: playerWidth, height: playerHeight, backgroundColor: '#000' }}
          source={{ html: customYoutubeHtml, baseUrl: 'https://lonelycpp.github.io' }}
          javaScriptEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          scrollEnabled={false}
        />
      )}
      
      {(isActive && !ytId && embedUrl) && (
        <WebView
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
          javaScriptEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          source={isRawHtml ? { html: embedUrl, baseUrl: 'https://www.youtube.com' } : { uri: embedUrl }}
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.infoContainer} pointerEvents="none" />
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#ff2d55" : "#ffffff"} />
            </View>
            <Text style={styles.actionText}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/watch/${item.id}` as any)}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-outline" size={22} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>{item.comments || Math.floor(Math.random() * 2)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <View style={styles.iconCircle}>
              <Ionicons name="share-social-outline" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function VideoScreen() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const [articles, setArticles] = useState<any[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      
      const onBackPress = () => {
        router.replace('/');
        return true; 
      };
      
      const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        setIsFocused(false);
        backSubscription.remove();
      };
    }, [router])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  useEffect(() => {
    const fetchVids = async () => {
      const isValidVideo = (data: any) => {
        if (getArticleVideoId(data)) return true;
        if (typeof data.videoUrl === 'string' && data.videoUrl.includes('http')) return true;
        if (typeof data.youtubeUrl === 'string' && data.youtubeUrl.includes('http')) return true;
        if (typeof data.video === 'string' && data.video.includes('http')) return true;
        if (typeof data.content === 'string' && (data.content.includes('<iframe') || data.content.includes('<video'))) return true;
        return false;
      };

      try {
        const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(300));
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'published' && isValidVideo(data)) {
            fetched.push({ id: doc.id, ...data });
          }
        });
        
        setArticles(fetched);
      } catch (e) {
        console.error("Gagal menarik data video:", e);
      }
    };
    fetchVids();
  }, []);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    return (
      <VideoItem 
        item={item} 
        index={index} 
        activeIndex={activeIndex} 
        width={width} 
        containerHeight={containerHeight} 
        router={router} 
        isScreenFocused={isFocused && appState === 'active'}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topHeaderText}>Video Pilihan</Text>
        <View style={{ width: 24 }} />
      </View>

      <View 
        style={{ flex: 1 }} 
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {containerHeight > 0 && (
          <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          bounces={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerPlayBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topHeader: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
    zIndex: 100,
  },
  backBtn: {
    padding: 5,
    marginLeft: -5,
  },
  topHeaderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  infoContainer: {
    flex: 1,
    marginRight: 20,
    justifyContent: 'flex-end',
  },
  tagWrap: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 4
  },
  tagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  titleText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  authorText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 16,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  }
});
