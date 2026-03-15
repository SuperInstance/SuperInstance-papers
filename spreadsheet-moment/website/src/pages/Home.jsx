import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3em', margin: '0 0 20px 0', lineHeight: '1.2' }}>
          Every Cell is an{' '}
          <span style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Intelligent Agent
          </span>
        </h1>
        <p style={{ fontSize: '1.3em', color: '#666', marginBottom: '30px' }}>
          Transform your spreadsheets with AI-powered cells that reason, communicate, and connect to the real world.
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <Link
            to="/app"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              padding: '15px 40px',
              borderRadius: '8px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
            }}
          >
            Launch App 🚀
          </Link>
          <Link
            to="/docs"
            style={{
              background: 'white',
              color: '#667eea',
              textDecoration: 'none',
              padding: '15px 40px',
              borderRadius: '8px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              border: '2px solid #667eea'
            }}
          >
            Read the Docs
          </Link>
        </div>
      </section>

      {/* Features Overview */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.2em' }}>
          Why Spreadsheet Moment?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px'
        }}>
          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🤖</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Agent-Based Cells</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Every cell contains an AI agent that can reason, learn, and make autonomous decisions.
            </p>
          </div>

          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔌</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Universal I/O</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Connect cells to Arduino, ESP32, HTTP APIs, databases, and more.
            </p>
          </div>

          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>⚡</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Real-Time</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Microsecond latency responses for time-critical applications.
            </p>
          </div>

          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🌐</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Multi-Frontend</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Web, desktop, and mobile interfaces for every use case.
            </p>
          </div>

          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🚀</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Cloudflare Workers</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Deploy instantly, scale globally, pay only for what you use.
            </p>
          </div>

          <div style={{
            padding: '30px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔓</div>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Open Source</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              MIT license. Self-hostable. No vendor lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.2em' }}>
          Built for Everyone
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏭</div>
            <h3 style={{ marginTop: 0 }}>Smart Manufacturing</h3>
            <p style={{ color: '#666' }}>
              Monitor sensors, control equipment, detect anomalies, and optimize production.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>💹</div>
            <h3 style={{ marginTop: 0 }}>Financial Trading</h3>
            <p style={{ color: '#666' }}>
              Connect to market data feeds, run predictive models, execute trades.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏠</div>
            <h3 style={{ marginTop: 0 }}>Home Automation</h3>
            <p style={{ color: '#666' }}>
              Control IoT devices, monitor energy usage, automate routines.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔬</div>
            <h3 style={{ marginTop: 0 }}>Research & Science</h3>
            <p style={{ color: '#666' }}>
              Collect experimental data, run analyses, visualize results.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '60px 40px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px', fontSize: '2em' }}>
          Ready to Transform Your Spreadsheets?
        </h2>
        <p style={{ fontSize: '1.2em', marginBottom: '30px', opacity: 0.9 }}>
          Join thousands of users already building intelligent spreadsheets.
        </p>
        <Link
          to="/app"
          style={{
            background: 'white',
            color: '#667eea',
            textDecoration: 'none',
            padding: '15px 40px',
            borderRadius: '8px',
            fontSize: '1.2em',
            fontWeight: 'bold',
            display: 'inline-block'
          }}
        >
          Start Building Now →
        </Link>
      </section>
    </div>
  );
}

export default Home;
