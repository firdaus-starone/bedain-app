import React from 'react';

const IdCard = ({ data, idRef }) => {
  const { name, regNumber, roleTitle, region, photoURL } = data;

  const defaultPhoto = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "Bedain News") + "&background=333&color=fff&size=512";

  return (
    <div 
      ref={idRef}
      style={{
        width: '400px',
        height: '700px',
        backgroundColor: '#111',
        backgroundImage: 'linear-gradient(45deg, #111 25%, #1a1a1a 25%, #1a1a1a 50%, #111 50%, #111 75%, #1a1a1a 75%, #1a1a1a 100%)',
        backgroundSize: '4px 4px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 4px #000, inset 0 0 0 6px #666',
        fontFamily: "'Inter', sans-serif",
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '30px 20px',
        boxSizing: 'border-box',
        margin: '0 auto'
      }}
    >
      {/* Top corners border overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: '24px',
        border: '8px solid transparent',
        background: 'linear-gradient(to bottom, #d4af37, #f3e5ab, #aa771c) border-box',
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'destination-out',
        maskComposite: 'exclude',
        zIndex: 2,
        pointerEvents: 'none'
      }}></div>

      {/* Header Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '10px',
        zIndex: 5
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '2px solid #d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #222, #000)'
        }}>
          {/* Faux logo icon */}
          <div style={{ width: '30px', height: '30px', border: '3px solid #d4af37', borderRadius: '50%', position: 'relative' }}>
             <div style={{ position: 'absolute', top: '50%', left: '-5px', right: '-5px', height: '3px', background: '#d4af37', transform: 'translateY(-50%)' }}></div>
             <div style={{ position: 'absolute', top: '20%', bottom: '20%', left: '50%', width: '3px', background: '#d4af37', transform: 'translateX(-50%)' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', color: '#fff', lineHeight: 1 }}>bedain</div>
          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: '#ccc', lineHeight: 1 }}>news.com</div>
          <div style={{ fontSize: '9px', color: '#d4af37', letterSpacing: '0.5px', marginTop: '2px' }}>Berita Daerah untuk Indonesia</div>
        </div>
      </div>

      {/* PERS Text */}
      <h1 style={{
        fontSize: '70px',
        fontWeight: 900,
        margin: '25px 0',
        background: 'linear-gradient(to bottom, #f3e5ab, #d4af37, #8a5a19)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8))',
        letterSpacing: '4px',
        zIndex: 5
      }}>
        PERS
      </h1>

      {/* Photo Frame */}
      <div style={{
        width: '220px',
        height: '220px',
        borderRadius: '12px',
        padding: '6px',
        background: 'linear-gradient(to bottom right, #f3e5ab, #d4af37, #aa771c, #f3e5ab)',
        boxShadow: '0 10px 20px rgba(0,0,0,0.8)',
        zIndex: 5,
        marginBottom: '35px'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#002244',
          backgroundImage: 'radial-gradient(circle at center, #004488 0%, #001122 100%)', // Faux globe background
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Globe lines faux */}
          <div style={{ position: 'absolute', width: '200%', height: '200%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', top: '-50%', left: '-50%' }}></div>
          <div style={{ position: 'absolute', width: '100%', height: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', width: '50%', height: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          
          <img 
            src={photoURL || defaultPhoto} 
            alt="Profile" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 2 }}
            crossOrigin="anonymous" // Important for html2canvas
          />
        </div>
      </div>

      {/* Details */}
      <div style={{
        width: '85%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '4px' }}>
          <div style={{ width: '100px', fontSize: '18px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NAMA</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {name || 'NAMA LENGKAP'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '4px' }}>
          <div style={{ width: '100px', fontSize: '18px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>NO. REG</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {regNumber || 'B-00.00-000'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '4px' }}>
          <div style={{ width: '100px', fontSize: '18px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>JABATAN</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {roleTitle || 'JABATAN'}</div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '4px' }}>
          <div style={{ width: '100px', fontSize: '18px', fontWeight: 600, color: '#d4af37', letterSpacing: '1px' }}>WILAYAH</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>: {region || 'NASIONAL'}</div>
        </div>
      </div>

      {/* Barcode area */}
      <div style={{
        marginTop: '30px',
        padding: '10px 15px',
        background: 'linear-gradient(to right, #d4af37, #f3e5ab, #d4af37)',
        borderRadius: '8px',
        width: '260px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
      }}>
        {/* Faux Barcode lines */}
        <div style={{ display: 'flex', height: '100%', width: '100%', gap: '2px', alignItems: 'center' }}>
          {Array.from({ length: 45 }).map((_, i) => (
            <div key={i} style={{
              width: `${Math.floor(Math.random() * 4) + 1}px`,
              height: '100%',
              backgroundColor: '#000',
              opacity: Math.random() > 0.1 ? 1 : 0
            }}></div>
          ))}
        </div>
      </div>

      {/* Bottom Wave/Curve */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(to right, #003366, #ff8c00)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        zIndex: 1,
        clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0% 100%)'
      }}></div>
    </div>
  );
};

export default IdCard;
