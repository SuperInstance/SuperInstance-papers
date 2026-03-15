import React from 'react';

function App() {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px' 
    }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '60px 20px',
        textAlign: 'center',
        borderRadius: '10px',
        marginBottom: '40px'
      }}>
        <h1 style={{ margin: 0, fontSize: '3em' }}>
          Spreadsheet Moment
        </h1>
        <p style={{ fontSize: '1.5em', marginTop: '20px' }}>
          Every Cell is an Intelligent Agent
        </p>
        <p style={{ fontSize: '1.1em', marginTop: '20px' }}>
          Transform your spreadsheets with AI-powered cells that reason, communicate, and connect to the real world.
        </p>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
          Why Spreadsheet Moment?
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{ 
            padding: '30px', 
            border: '1px solid #ddd', 
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>🤖 Agent-Based Cells</h3>
            <p>Every cell contains an AI agent that can reason, learn, and make autonomous decisions.</p>
          </div>
          
          <div style={{ 
            padding: '30px', 
            border: '1px solid #ddd', 
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>🔌 Universal I/O</h3>
            <p>Connect cells to Arduino, ESP32, HTTP APIs, databases, and more.</p>
          </div>
          
          <div style={{ 
            padding: '30px', 
            border: '1px solid #ddd', 
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>⚡ Real-Time</h3>
            <p>Microsecond latency responses for time-critical applications.</p>
          </div>
        </div>
      </section>

      <section style={{ 
        background: '#f8f9fa',
        padding: '40px',
        borderRadius: '10px',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h2>Ready to Transform Your Spreadsheets?</h2>
        <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>
          Join thousands of users already building intelligent spreadsheets.
        </p>
        <button style={{
          background: '#667eea',
          color: 'white',
          border: 'none',
          padding: '15px 40px',
          fontSize: '1.2em',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          Get Started Free
        </button>
      </section>

      <footer style={{ 
        textAlign: 'center', 
        padding: '20px',
        borderTop: '1px solid #ddd'
      }}>
        <p>© 2026 Spreadsheet Moment by SuperInstance.ai</p>
        <p>
          <a href="#" style={{ color: '#667eea', textDecoration: 'none' }}>Documentation</a> • 
          <a href="#" style={{ color: '#667eea', textDecoration: 'none' }}>GitHub</a> • 
          <a href="#" style={{ color: '#667eea', textDecoration: 'none' }}>Discord</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
