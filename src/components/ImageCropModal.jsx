'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, X, Maximize2, Minimize2 } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '16:9 (Berita Web)', value: 16 / 9, desc: 'Standar Portal Berita' },
  { label: '4:3 (Standar Foto)', value: 4 / 3, desc: 'Standar Foto' },
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
  const [fitMode, setFitMode] = useState('cover'); // 'cover' (isi penuh) | 'contain' (muat semua)
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageObj, setImageObj] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Load and prepare image object with CORS safety
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImageObj(null);
      return;
    }

    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setFitMode('cover');
    setIsProcessing(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    // If remote URL, use proxy to bypass canvas taint
    let srcToLoad = imageSrc;
    if (
      typeof imageSrc === 'string' &&
      imageSrc.startsWith('http') &&
      !imageSrc.includes(window.location.host)
    ) {
      srcToLoad = `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`;
    }

    img.onload = () => {
      setImageObj(img);
    };

    img.onerror = () => {
      // Fallback: try loading directly without proxy
      if (srcToLoad !== imageSrc) {
        const directImg = new Image();
        directImg.crossOrigin = 'anonymous';
        directImg.onload = () => setImageObj(directImg);
        directImg.src = imageSrc;
      }
    };

    img.src = srcToLoad;
  }, [isOpen, imageSrc]);

  // Redraw preview canvas whenever state changes
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Prepare rotated dimensions
    const is90or270 = rotation % 180 !== 0;
    const imgW = is90or270 ? imageObj.naturalHeight : imageObj.naturalWidth;
    const imgH = is90or270 ? imageObj.naturalWidth : imageObj.naturalHeight;

    if (!imgW || !imgH) return;

    // 2. Base scale calculation based on fitMode
    // In 'cover' mode, scale so that the image fills the 16:9 canvas
    // In 'contain' mode, scale so the entire image fits inside with blurred background
    const scaleCover = Math.max(width / imgW, height / imgH);
    const scaleContain = Math.min(width / imgW, height / imgH);
    const baseScale = fitMode === 'contain' ? scaleContain : scaleCover;

    const currentScale = baseScale * zoom;
    const drawW = imgW * currentScale;
    const drawH = imgH * currentScale;

    // Center coordinates + user pan offset
    const drawX = (width - drawW) / 2 + offset.x;
    const drawY = (height - drawH) / 2 + offset.y;

    // 3. Draw blurred background if in 'contain' mode or zoomed out
    if (fitMode === 'contain' || zoom < 0.95) {
      ctx.save();
      ctx.filter = 'blur(18px) brightness(0.4)';
      ctx.drawImage(imageObj, -20, -20, width + 40, height + 40);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f1015';
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Draw rotated and scaled image
    ctx.save();
    // Translate to center of image drawing area
    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const unrotatedW = is90or270 ? drawH : drawW;
    const unrotatedH = is90or270 ? drawW : drawH;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageObj, -unrotatedW / 2, -unrotatedH / 2, unrotatedW, unrotatedH);
    ctx.restore();
  }, [imageObj, fitMode, zoom, rotation, offset]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

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

  // Handle Touch for Mobile
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
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setZoom((prev) => Math.min(3, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setFitMode('cover');
  };

  // Execute High-Resolution Output Crop
  const handleExecuteCrop = async () => {
    if (!imageObj) return;
    setIsProcessing(true);

    try {
      const previewCanvas = canvasRef.current;
      if (!previewCanvas) return;

      // High quality export target: 1280px width (standard HD 16:9 = 1280 x 720)
      const targetWidth = 1280;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetWidth;
      outCanvas.height = targetHeight;
      const outCtx = outCanvas.getContext('2d');

      // Scaling factor from preview canvas to export canvas
      const scaleToExport = targetWidth / previewCanvas.width;

      // 1. Prepare rotated dimensions
      const is90or270 = rotation % 180 !== 0;
      const imgW = is90or270 ? imageObj.naturalHeight : imageObj.naturalWidth;
      const imgH = is90or270 ? imageObj.naturalWidth : imageObj.naturalHeight;

      const scaleCover = Math.max(previewCanvas.width / imgW, previewCanvas.height / imgH);
      const scaleContain = Math.min(previewCanvas.width / imgW, previewCanvas.height / imgH);
      const baseScale = fitMode === 'contain' ? scaleContain : scaleCover;

      const currentScale = baseScale * zoom;
      const drawW = imgW * currentScale * scaleToExport;
      const drawH = imgH * currentScale * scaleToExport;

      const drawX = ((previewCanvas.width - imgW * currentScale) / 2 + offset.x) * scaleToExport;
      const drawY = ((previewCanvas.height - imgH * currentScale) / 2 + offset.y) * scaleToExport;

      // Draw background if contain or zoomed out
      if (fitMode === 'contain' || zoom < 0.95) {
        outCtx.save();
        outCtx.filter = 'blur(28px) brightness(0.4)';
        outCtx.drawImage(imageObj, -30, -30, targetWidth + 60, targetHeight + 60);
        outCtx.restore();
      } else {
        outCtx.fillStyle = '#0f1015';
        outCtx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // Draw image
      outCtx.save();
      outCtx.translate(drawX + drawW / 2, drawY + drawH / 2);
      outCtx.rotate((rotation * Math.PI) / 180);

      const unrotatedW = is90or270 ? drawH : drawW;
      const unrotatedH = is90or270 ? drawW : drawH;

      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(imageObj, -unrotatedW / 2, -unrotatedH / 2, unrotatedW, unrotatedH);
      outCtx.restore();

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

  const canvasWidth = 560;
  const canvasHeight = Math.round(canvasWidth / aspectRatio);

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

        {/* Aspect Ratio & Fit Mode Selector */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid var(--admin-border, #282a36)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Ratio Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--admin-text-secondary, #8b949e)', marginRight: '2px' }}>
              Rasio:
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
                    padding: '5px 10px',
                    borderRadius: '16px',
                    fontSize: '11px',
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

          {/* Fit Mode Toggle (Cover vs Contain) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setFitMode('cover');
                setOffset({ x: 0, y: 0 });
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: fitMode === 'cover' ? 600 : 400,
                border: fitMode === 'cover' ? '1px solid #22c55e' : '1px solid var(--admin-border, #333)',
                background: fitMode === 'cover' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                color: fitMode === 'cover' ? '#4ade80' : 'var(--admin-text-secondary, #aaa)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Isi penuh bingkai 16:9 tanpa latar belakang"
            >
              <Maximize2 size={12} />
              <span>Isi Penuh (Fill)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFitMode('contain');
                setOffset({ x: 0, y: 0 });
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: fitMode === 'contain' ? 600 : 400,
                border: fitMode === 'contain' ? '1px solid #a855f7' : '1px solid var(--admin-border, #333)',
                background: fitMode === 'contain' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: fitMode === 'contain' ? '#c084fc' : 'var(--admin-text-secondary, #aaa)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Muat seluruh gambar tanpa terpotong (dengan blur artistik di samping)"
            >
              <Minimize2 size={12} />
              <span>Muat Semua (Fit)</span>
            </button>
          </div>
        </div>

        {/* Interactive Viewport Area */}
        <div
          ref={containerRef}
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
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            style={{
              width: '100%',
              maxWidth: `${canvasWidth}px`,
              aspectRatio: `${aspectRatio}`,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '10px',
              border: '2px solid rgba(59, 130, 246, 0.85)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 25px rgba(59, 130, 246, 0.35)',
              cursor: isDragging ? 'grabbing' : 'grab',
              background: '#15161c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* The Canvas for smooth preview */}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
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
              🖐️ Tarik foto untuk geser posisi • Scroll untuk zoom
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
          {/* Zoom Slider (0.5x to 3x) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px' }}>
            <ZoomOut size={16} color="var(--admin-text-secondary, #8b949e)" />
            <input
              type="range"
              min="0.5"
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
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '40px', color: 'var(--admin-text-primary, #fff)' }}>
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
