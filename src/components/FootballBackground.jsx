"use client";
import React from 'react';
import './FootballBackground.css';

const FootballBackground = () => {
  // Create an array of balls with random properties
  const balls = Array.from({ length: 15 }).map((_, i) => {
    const size = Math.random() * 40 + 20; // 20px to 60px
    const left = Math.random() * 100; // 0 to 100vw
    const animationDuration = Math.random() * 20 + 20; // 20s to 40s
    const animationDelay = Math.random() * 15; // 0s to 15s
    const opacity = Math.random() * 0.15 + 0.02; // 0.02 to 0.17
    
    return {
      id: i,
      size,
      left,
      animationDuration,
      animationDelay,
      opacity
    };
  });

  return (
    <div className="football-background" aria-hidden="true">
      {balls.map(ball => (
        <div
          key={ball.id}
          className="football-item"
          style={{
            width: `${ball.size}px`,
            height: `${ball.size}px`,
            left: `${ball.left}vw`,
            animationDuration: `${ball.animationDuration}s`,
            animationDelay: `${ball.animationDelay}s`,
            opacity: ball.opacity
          }}
        >
          <svg viewBox="0 0 512 512" width="100%" height="100%" fill="currentColor">
            <path d="M256,0C114.6,0,0,114.6,0,256s114.6,256,256,256s256-114.6,256-256S397.4,0,256,0z M446.4,171L375,194.2l-30.8-74.4 c-2.4-5.8-6.1-11-10.7-15.5l58.9-58.9C418.9,71.2,437,118.2,446.4,171z M342.3,101.9L256,188.2l-86.3-86.3l30.8-74.4 c4.6-4.6,8.3-9.7,10.7-15.5L256,8.2l44.8,3.8C303.2,17.8,306.9,23,311.5,27.5L342.3,101.9z M65.6,171c9.4-52.8,27.5-99.8,54-125.6 L178.5,104c-4.6,4.6-8.3,9.7-10.7,15.5l-30.8,74.4L65.6,171z M40.2,256c0-29.3,5-57.5,14.2-83.8l70.1,22.8 c-3.1,6-5.4,12.5-6.8,19.2l-0.1,70l-71.1,23.1C42.4,291.6,40.2,274.1,40.2,256z M65.6,341l71.4-23.2l30.8,74.4 c4.6,4.6,8.3,9.7,10.7,15.5l-58.9,58.9C93.1,440.8,75,393.8,65.6,341z M169.7,410.1l86.3-86.3l-30.8-74.4c-4.6-4.6-8.3-9.7-10.7-15.5 L256,503.8l-44.8-3.8c-2.4-5.8-6.1-11-10.7-15.5L169.7,410.1z M446.4,341c-9.4,52.8-27.5,99.8-54,125.6l-58.9-58.9 c4.6-4.6,8.3-9.7,10.7-15.5l30.8-74.4L446.4,341z M471.8,256c0,29.3-5,57.5-14.2,83.8l-70.1-22.8c3.1-6,5.4-12.5,6.8-19.2 l0.1-70l71.1-23.1C469.6,220.4,471.8,237.9,471.8,256z M256,368c-61.9,0-112-50.1-112-112c0-61.9,50.1-112,112-112 c61.9,0,112,50.1,112,112C368,317.9,317.9,368,256,368z" />
          </svg>
        </div>
      ))}
    </div>
  );
};

export default FootballBackground;
