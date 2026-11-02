'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, X, Sliders } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '16:9 (Berita Web)', value: 16 / 9, desc: 'Rekomendasi Utama' },
  { label: '4:3 (Standar Foto)', value: 4 / 3, desc: 'Standar' },
  { label: '1:1 (Bujur Sangkar)', value: 1 / 1, desc: 'Kotak' },
];

export default function ImageCropModal({
  isOpen,
  imageSrc,
  fileName = 'article-image.jpg',
  onClose,
  onCropComplete,
  onUseOriginal,
}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setAspectRatio(16 / 9);
      setImageLoaded(false);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc]);

  // Handle Drag / Pan with Mouse
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Touch for Mobile / Tablets
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Handle Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Execute Crop and Export Canvas
  const handleExecuteCrop = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const is90or270 = rotation % 180 !== 0;
      const naturalWidth = is90or270 ? img.naturalHeight : img.naturalWidth;
      const naturalHeight = is90or270 ? img.naturalWidth : img.naturalHeight;

      // 1. Create offscreen rotated canvas
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = naturalWidth;
      rotCanvas.height = naturalHeight;
      const rotCtx = rotCanvas.getContext('2d');
      rotCtx.translate(naturalWidth / 2, naturalHeight / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // 2. Calculate crop box dimension in UI
      const container = containerRef.current;
      const boxWidth = container ? container.clientWidth : 560;
      const boxHeight = boxWidth / aspectRatio;

      // 3. Compute scale & source crop coordinates
      const baseScale = Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
      const currentScale = baseScale * zoom;
      const dispW = naturalWidth * currentScale;
      const dispH = naturalHeight * currentScale;

      const cropLeftInDisp = dispW / 2 - boxWidth / 2 - offset.x;
      const cropTopInDisp = dispH / 2 - boxHeight / 2 - offset.y;

      const sourceCropX = cropLeftInDisp / currentScale;
      const sourceCropY = cropTopInDisp / currentScale;
      const sourceCropW = boxWidth / currentScale;
      const sourceCropH = boxHeight / currentScale;

      // 4. Output canvas with high-res target (1280px standard for 16:9)
      const targetWidth = Math.min(1920, Math.max(1280, Math.round(sourceCropW)));
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetWidth;
      outCanvas.height = targetHeight;
      const outCtx = outCanvas.getContext('2d');

      // High quality smoothing
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';

      outCtx.drawImage(
        rotCanvas,
        sourceCropX,
        sourceCropY,
        sourceCropW,
        sourceCropH,
        0,
        0,
        targetWidth,
        targetHeight
      );

      outCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            onCropComplete(blob, croppedUrl);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Gagal memotong gambar:', err);
      setIsProcessing(false);
      alert('Gagal memproses potongan gambar. Silakan coba lagi.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          background: 'var(--admin-card-bg, #1a1c23)',
          border: '1px solid var(--admin-card-border, #2d3139)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'cropModalIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border, #282a36)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--admin-sidebar-bg, #15161c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crop size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-primary, #fff)' }}>
                Sesuaikan & Potong Gambar Artikel
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--admin-text-secondary, #8b949e)' }}>
                Posisikan gambar agar pas dengan bingkai kartu berita 16:9
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--admin-text-secondary, #8b949e)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid var(--admin-border, #282a36)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--admin-text-secondary, #8b949e)', marginRight: '4px' }}>
            Rasio Frame:
          </span>
          {ASPECT_RATIOS.map((ratio) => {
            const isActive = Math.abs(aspectRatio - ratio.value) < 0.01;
            return (
              <button
                key={ratio.label}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio.value);
                  setOffset({ x: 0, y: 0 });
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? '1px solid #3b82f6' : '1px solid var(--admin-border, #333)',
                  background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--admin-text-secondary, #aaa)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ratio.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Viewport Area */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0f',
            userSelect: 'none',
          }}
        >
          {/* Viewport Frame with Aspect Ratio */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            style={{
              width: '100%',
              maxWidth: '560px',
              aspectRatio: `${aspectRatio}`,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '10px',
              border: '2px solid rgba(59, 130, 246, 0.8)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(59, 130, 246, 0.3)',
              cursor: isDragging ? 'grabbing' : 'grab',
              background: '#15161c',
            }}
          >
            {/* The Image being transformed */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Source"
              onLoad={() => setImageLoaded(true)}
              draggable={false}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transformOrigin: 'center center',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: 'none',
                maxHeight: 'none',
                minWidth: '100%',
                minHeight: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
            />

            {/* Rule of Thirds Grid Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)' }} />
              <div style={{ borderRight: '1px dashed rgba(255,255,255,0.3)' }} />
              <div />
            </div>

            {/* Hint overlay badge */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              🖐️ Tarik/geser foto untuk mengatur posisi
            </div>
          </div>
        </div>

        {/* Controls Toolbar (Zoom, Rotate, Reset) */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--admin-sidebar-bg, #15161c)',
            borderTop: '1px solid var(--admin-border, #282a36)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px' }}>
            <ZoomOut size={16} color="var(--admin-text-secondary, #8b949e)" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#3b82f6',
              }}
            />
            <ZoomIn size={16} color="var(--admin-text-secondary, #8b949e)" />
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '35px', color: 'var(--admin-text-primary, #fff)' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Reset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleRotate}
              title="Putar 90 derajat searah jarum jam"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'var(--admin-hover-bg, #282a36)',
                border: '1px solid var(--admin-border, #333)',
                color: 'var(--admin-text-primary, #fff)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RotateCw size={14} />
              <span>Putar 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              title="Reset zoom dan posisi foto"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'var(--admin-hover-bg, #282a36)',
                border: '1px solid var(--admin-border, #333)',
                color: 'var(--admin-text-secondary, #aaa)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--admin-border, #282a36)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--admin-card-bg, #1a1c23)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--admin-border, #333)',
              color: 'var(--admin-text-secondary, #8b949e)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onUseOriginal && (
              <button
                type="button"
                onClick={onUseOriginal}
                disabled={isProcessing}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'var(--admin-hover-bg, #282a36)',
                  border: '1px solid var(--admin-border, #444)',
                  color: 'var(--admin-text-primary, #eee)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Gunakan Asli (Tanpa Crop)
              </button>
            )}

            <button
              type="button"
              onClick={handleExecuteCrop}
              disabled={isProcessing}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              <Check size={16} />
              <span>{isProcessing ? 'Memotong...' : '✓ Potong & Gunakan (16:9)'}</span>
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes cropModalIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
        `
      }} />
    </div>
  );
}
