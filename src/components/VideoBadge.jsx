"use client";
import React from 'react';
import { getArticleVideoId } from '../lib/videoHelpers';

export const VideoBadge = ({ article }) => {
  const videoId = getArticleVideoId(article);
  if (!videoId) return null;

  return (
    <>
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: '#e63946',
        color: '#fff',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        zIndex: 5,
        letterSpacing: '0.5px'
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>VIDEO</span>
      </div>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.65)',
        border: '2px solid #fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: 5,
        transition: 'transform 0.2s',
        pointerEvents: 'none'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </>
  );
};

export default VideoBadge;
