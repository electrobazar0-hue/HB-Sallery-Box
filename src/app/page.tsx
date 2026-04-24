export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
          margin: '0 auto 32px',
          background: 'white'
        }}>
          <img
            src="/logo.jpg"
            alt="HB Sallery Box"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px',
          marginTop: '0',
          lineHeight: '1.2'
        }}>
          HB Sallery Box
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          Secure Staff Management
        </p>

        <div style={{
          padding: '16px 32px',
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '500',
          display: 'inline-block',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}>
          Loading Application...
        </div>

        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginTop: '24px'
        }}>
          © 2024 HB Sallery Box
        </p>
      </div>
    </div>
  );
}
