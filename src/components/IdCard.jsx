import React from 'react';
import QRCode from 'react-qr-code';

const IdCard = ({ data, idRef }) => {
  const { name, regNumber, roleTitle, region, photoURL } = data;

  const defaultPhoto = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "Bedain News") + "&background=333&color=fff&size=512";
  const verificationUrl = `https://bedainnews.com/verify?id=${encodeURIComponent(regNumber || 'B-00.00-000')}`;

  return (
    <div 
      ref={idRef}
      style={{
        width: '400px',
        height: '680px', // Adjusted for 784x1332 ratio
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px', // Match the curve if needed, but background has its own border
        fontFamily: "'Inter', sans-serif",
        color: '#fff',
        margin: '0 auto',
        backgroundImage: 'url(/assets/KARTUPERS.png)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
    >
      {/* Photo Box */}
      <div style={{
        position: 'absolute',
        top: '37.5%',
        left: '21.5%',
        width: '57%',
        height: '29.5%',
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 2,
        backgroundColor: '#002244' // fallback behind image
      }}>
        <img 
          src={photoURL || defaultPhoto} 
          alt="Profile" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          /* Removed crossOrigin="anonymous" to fix broken image */
        />
      </div>

      {/* Text Details Container */}
      <div style={{
        position: 'absolute',
        top: '68%',
        left: '10%',
        width: '80%',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px', // Reduced gap to save space
        zIndex: 5
      }}>
        {/* Text */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '2px' }}>
          <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NAMA</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>: {name || 'NAMA LENGKAP'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '2px' }}>
          <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NO. REG</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {regNumber || 'B-00.00-000'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '2px' }}>
          <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>JABATAN</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>: {roleTitle || 'JABATAN'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '2px' }}>
          <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>WILAYAH</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>: {region || 'NASIONAL'}</div>
        </div>
      </div>

      {/* QR Code Container (Absolutely positioned at bottom) */}
      <div style={{
        position: 'absolute',
        bottom: '3%', // Anchored to bottom so it never gets pushed out
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        display: 'flex', 
        justifyContent: 'center'
      }}>
        <div style={{ padding: '4px', backgroundColor: '#fff', borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          <QRCode 
            value={verificationUrl} 
            size={48} 
            level="M"
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
      </div>
    </div>
  );
};

export default IdCard;
