export const getYouTubeId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = input.match(regExp);
  return match ? match[1] : null;
};

export const getAnyVideoData = (input) => {
  if (!input || typeof input !== 'string') return null;
  
  const ytId = getYouTubeId(input);
  if (ytId) return { type: 'youtube', id: ytId, url: input };
  
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('facebook.com') || lowerInput.includes('fb.watch')) {
    return { type: 'facebook', url: input };
  }
  
  if (lowerInput.includes('tiktok.com')) {
    const tkMatch = input.match(/\/video\/(\d+)/);
    return { type: 'tiktok', id: tkMatch ? tkMatch[1] : null, url: input };
  }
  
  return null;
};

export const getArticleVideoData = (article) => {
  if (!article) return null;
  return getAnyVideoData(article.videoUrl) || getAnyVideoData(article.youtubeUrl) || getAnyVideoData(article.video) || getAnyVideoData(article.content);
};

export const getArticleVideoId = (article) => {
  if (!article) return null;
  return getYouTubeId(article.videoUrl) || getYouTubeId(article.youtubeUrl) || getYouTubeId(article.video) || getYouTubeId(article.content);
};

export const getArticleCardImage = (article) => {
  if (!article) return 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80';
  const videoId = getArticleVideoId(article);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return article.coverImage || article.img || article.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80';
};
