import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import AppInterface from './pages/AppInterface';
import Documentation from './pages/Documentation';
import Examples from './pages/Examples';

function App() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <nav style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '1.5em',
            fontWeight: 'bold'
          }}>
            SpreadsheetMoment
          </Link>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.1em'
            }}>
              Home
            </Link>
            <Link to="/app" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.1em'
            }}>
              Launch App
            </Link>
            <Link to="/docs" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.1em'
            }}>
              Documentation
            </Link>
            <Link to="/examples" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.1em'
            }}>
              Examples
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<AppInterface />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/examples" element={<Examples />} />
        </Routes>
      </main>

      <footer style={{
        background: '#f8f9fa',
        padding: '20px',
        textAlign: 'center',
        borderTop: '1px solid #ddd'
      }}>
        <p style={{ margin: 0 }}>
          © 2026 SpreadsheetMoment by SuperInstance.ai •
          <a href="https://github.com/SuperInstance/spreadsheet-moment"
             style={{ color: '#667eea', textDecoration: 'none' }}>
            GitHub
          </a> •
          <a href="https://spreadsheet-moment.pages.dev/docs.html"
             style={{ color: '#667eea', textDecoration: 'none' }}>
            Documentation
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
