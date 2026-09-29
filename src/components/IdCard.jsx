import React from 'react';

const IdCard = ({ data, idRef }) => {
  const { name, regNumber, roleTitle, region, photoURL } = data;

  const defaultPhoto = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "Bedain News") + "&background=333&color=fff&size=512";

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
      {/* 
        The photo box in the provided image is roughly centered vertically,
        maybe starting at 35% from the top and taking about 30% of height.
        Let's position it absolutely. We can fine-tune these percentages.
      */}
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
          crossOrigin="anonymous" 
        />
      </div>

      {/* Text Details */}
      <div style={{
        position: 'absolute',
        top: '69%',
        left: '10%',
        width: '80%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '4px' }}>
          <div style={{ width: '90px', fontSize: '15px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NAMA</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {name || 'NAMA LENGKAP'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '4px' }}>
          <div style={{ width: '90px', fontSize: '15px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NO. REG</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {regNumber || 'B-00.00-000'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '4px' }}>
          <div style={{ width: '90px', fontSize: '15px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>JABATAN</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {roleTitle || 'JABATAN'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '4px' }}>
          <div style={{ width: '90px', fontSize: '15px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>WILAYAH</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {region || 'NASIONAL'}</div>
        </div>
      </div>
    </div>
  );
};

export default IdCard;
