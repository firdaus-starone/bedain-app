"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { useArticles } from '../hooks/useArticles';
import { getArticleCardImage } from '../lib/videoHelpers';

const LocalNewsWidget = () => {
  const { articles, loading } = useArticles({ limit: 50 }); // Fetch more to increase chances of matching
  const [location, setLocation] = useState(null);
  const [localArticles, setLocalArticles] = useState([]);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    // Detect location using IP
    const detectLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.city && data.region) {
          setLocation({
            city: data.city,
            region: data.region
          });
        }
      } catch (error) {
        console.error("Error detecting location:", error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectLocation();
  }, []);

  useEffect(() => {
    if (location && articles.length > 0) {
      // Simple algorithm: search for city or region name in article tags, title, or category
      const cityLower = location.city.toLowerCase();
      const regionLower = location.region.toLowerCase();

      const matchedArticles = articles.filter(article => {
        const titleMatch = article.title?.toLowerCase().includes(cityLower) || article.title?.toLowerCase().includes(regionLower);
        const catMatch = article.category?.toLowerCase().includes(cityLower) || article.category?.toLowerCase().includes(regionLower);
        const tagMatch = article.tags && Array.isArray(article.tags) && article.tags.some(tag => 
          tag.toLowerCase().includes(cityLower) || tag.toLowerCase().includes(regionLower)
        );
        
        return titleMatch || catMatch || tagMatch;
      });

      // If no strict match, fallback to just showing recent articles to not leave it empty
      // But for "Berita Sekitar Anda", it's better to show only if there's a match, or fallback to random
      if (matchedArticles.length > 0) {
        setLocalArticles(matchedArticles.slice(0, 4));
      } else {
        // Fallback: Just show latest 4 articles if no local news found, but keep the widget alive
        setLocalArticles(articles.slice(0, 4));
      }
    } else if (!isDetecting && articles.length > 0) {
      // If detection failed, just show latest 4
      setLocalArticles(articles.slice(0, 4));
    }
  }, [location, articles, isDetecting]);

  if (loading || isDetecting) {
    return null;
  }

  if (localArticles.length === 0) return null;

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const topArticle = localArticles[0];
  const restArticles = localArticles.slice(1);

  return (
    <div className="local-news-widget">
      <div className="local-news-header">
        <h2 className="local-news-title">Berita Sekitar Anda</h2>
        <div className="local-news-location">
          <MapPin size={16} color="#ef4444" />
          <span>{location ? location.city : 'Terdekat'}</span>
        </div>
      </div>

      <div className="local-news-content">
        {/* Top Featured Article */}
        <Link href={`/article/${getSlug(topArticle)}`} className="local-featured-card">
          <div className="local-featured-img-wrapper">
            <Image 
              src={getArticleCardImage(topArticle)} 
              alt={topArticle.title}
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className="local-featured-gradient"></div>
          </div>
          <div className="local-featured-info">
            <h3 className="local-featured-title">{topArticle.title}</h3>
            <div className="local-featured-date">
              {topArticle.date || 'Baru saja'}
            </div>
          </div>
        </Link>

        {/* List of other local articles */}
        <div className="local-list-container">
          {restArticles.map((article, idx) => (
            <Link href={`/article/${getSlug(article)}`} key={article.id || idx} className="local-list-item">
              <div className="local-list-region">{location ? location.region : article.category}</div>
              <h4 className="local-list-title">{article.title}</h4>
              <div className="local-list-date">{article.date || 'Baru saja'}</div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LocalNewsWidget;
