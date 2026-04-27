import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Alex', action: 'upvoted', detail: 'the border radius', type: 'vote' },
    { id: 2, sender: 'Sarah', action: 'commented', detail: 'Maybe a bit more indigo?', type: 'comment' },
    { id: 3, sender: 'Mike', action: 'downvoted', detail: 'the font size', type: 'vote' },
  ]);
  
  const [borderRadius, setBorderRadius] = useState(16);
  const [primaryColor, setPrimaryColor] = useState('#A3A6FF');
  const [isConnected, setIsConnected] = useState(false);
  const [activeMembers, setActiveMembers] = useState(['Alex', 'Sarah', 'Mike']);

  // Simulate WebSocket connection logic adapted from PHPaibot
  useEffect(() => {
    // In a real implementation, this would connect to the Node.js backend
    setIsConnected(true);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 'var(--radius-md)' }}>
      {/* Collaboration Header */}
      <header className="glass-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 32px',
        marginBottom: '24px',
        borderRadius: 'var(--radius-lg)'
      }}>
        <h2>DesignedByCommittee</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeMembers.map(member => (
              <div key={member} style={{
                width: '32px', height: '32px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'var(--surface-container-low)',
                border: '2px solid var(--tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 'bold'
              }}>
                {member[0]}
              </div>
            ))}
          </div>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            color: isConnected ? 'var(--tertiary)' : 'var(--on-surface-variant)',
            fontSize: '0.9rem'
          }}>
            <div style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              backgroundColor: isConnected ? 'var(--tertiary)' : 'var(--error)' 
            }}></div>
            {isConnected ? 'Live Sync' : 'Disconnected'}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Central Preview Area */}
        <main style={{ 
          flex: 2, 
          backgroundColor: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          padding: '48px'
        }}>
          <div style={{ 
            position: 'absolute', top: '24px', left: '24px', 
            color: 'var(--on-surface-variant)', fontSize: '0.9rem' 
          }}>
            Preview: Member Portal Component
          </div>
          
          {/* The Component Under Review */}
          <div style={{
            backgroundColor: 'var(--surface-container-high)',
            padding: '40px',
            borderRadius: `${borderRadius}px`,
            border: `1px solid var(--outline-variant)`,
            width: '100%', maxWidth: '400px',
            display: 'flex', flexDirection: 'column', gap: '24px',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: 0 }}>Join the Committee</h3>
            <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.9rem' }}>
              Your voice shapes the product. Participate in real-time design decisions.
            </p>
            <input 
              type="email" 
              placeholder="Email address" 
              className="recessed-input" 
            />
            <button 
              className="btn-primary" 
              style={{ background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor})` }}
            >
              Request Access
            </button>
          </div>
        </main>

        {/* Sidebar: Committee Feed & Voting */}
        <aside style={{ 
          flex: 1, 
          display: 'flex', flexDirection: 'column', gap: '24px',
          overflowY: 'auto'
        }}>
          {/* Voting Widget */}
          <section className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--primary)' }}>Live Voting</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem' }}>Border Radius</label>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{borderRadius}px</span>
              </div>
              <input 
                type="range" 
                min="0" max="48" 
                value={borderRadius} 
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem' }}>Primary Accent</label>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{primaryColor}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['#A3A6FF', '#FFA5D9', '#FF6E84', '#6063EE'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: color, border: 'none', cursor: 'pointer',
                      boxShadow: primaryColor === color ? '0 0 0 2px var(--surface), 0 0 0 4px var(--on-surface)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Committee Feed */}
          <section className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Committee Feed</h3>
            <ul className="no-line-list" style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {messages.map(msg => (
                <li key={msg.id} style={{ 
                  backgroundColor: 'var(--surface-container-low)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)' 
                }}>
                  <strong style={{ color: msg.type === 'vote' ? 'var(--tertiary)' : 'var(--primary)' }}>
                    {msg.sender}
                  </strong> {msg.action} <span style={{ color: 'var(--on-surface-variant)' }}>{msg.detail}</span>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="Add a comment..." className="recessed-input" />
              <button className="btn-primary" style={{ padding: '12px 16px' }}>&#10148;</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
