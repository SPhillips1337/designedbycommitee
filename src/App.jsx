import { useState, useEffect, useRef } from 'react';
import './index.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [borderRadius, setBorderRadius] = useState(16);
  const [primaryColor, setPrimaryColor] = useState('#A3A6FF');
  const [isConnected, setIsConnected] = useState(false);
  const [aiMembers, setAiMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [userId] = useState(`user_${Math.floor(Math.random() * 1000)}`);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    let socket;
    let timeoutId;

    const connect = () => {
      // Use 127.0.0.1 explicitly to avoid IPv6 resolution issues in some environments
      socket = new WebSocket('ws://127.0.0.1:4002');
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        socket.send(JSON.stringify({ type: 'user_join', userId }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setBorderRadius(data.state.borderRadius);
          setPrimaryColor(data.state.primaryColor);
          setMessages(data.messages);
          if (data.aiMembers) setAiMembers(data.aiMembers);
        } else if (data.type === 'state_update') {
          setBorderRadius(data.state.borderRadius);
          setPrimaryColor(data.state.primaryColor);
          if (data.new_message) {
            setMessages(prev => [...prev, data.new_message]);
          }
        } else if (data.type === 'new_message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'presence') {
          if (data.aiMembers) setAiMembers(data.aiMembers);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        timeoutId = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null; 
        socket.close();
      }
      clearTimeout(timeoutId);
    };
  }, [userId]);

  const updateDesign = (changes) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_design',
        userId,
        changes
      }));
    }
  };

  const sendChat = () => {
    if (comment.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        userId,
        text: comment
      }));
      setComment('');
    }
  };

  const handleRequestAccess = () => {
    if (email.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        userId: 'New Candidate',
        text: `is requesting access for: ${email}`
      }));
      setEmail('');
      setIsLoginModalOpen(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 'var(--radius-md)', position: 'relative' }}>
      {/* Login Modal */}
      {isLoginModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-high)',
            padding: '40px',
            borderRadius: `${borderRadius}px`,
            border: `1px solid var(--outline-variant)`,
            width: '100%', maxWidth: '400px',
            display: 'flex', flexDirection: 'column', gap: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Join the Committee</h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.9rem' }}>
              Your voice shapes the product. Participate in real-time design decisions.
            </p>
            <input 
              type="email" 
              placeholder="Email address" 
              className="recessed-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              className="btn-primary" 
              style={{ background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor})` }}
              onClick={handleRequestAccess}
            >
              Request Access
            </button>
          </div>
        </div>
      )}

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
            {aiMembers.map(member => (
              <div key={member.id} title={member.name} style={{
                height: '32px', 
                padding: '0 12px',
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 'bold',
                color: 'var(--tertiary)'
              }}>
                {member.name}
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
          <button 
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={() => setIsLoginModalOpen(true)}
          >
            Login
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Main Area: Committee Feed */}
        <main style={{ 
          flex: 2, 
          backgroundColor: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          padding: '24px',
          border: '1px solid var(--surface-container-low)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Committee Debate Feed</h3>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
            <ul className="no-line-list">
              {messages.map(msg => (
                <li key={msg.id} style={{ 
                  backgroundColor: 'var(--surface-container-low)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '12px',
                  borderLeft: msg.type === 'vote' ? '4px solid var(--tertiary)' : msg.type === 'system' ? '4px solid var(--error)' : '4px solid var(--primary)'
                }}>
                  <strong style={{ color: msg.type === 'vote' ? 'var(--tertiary)' : msg.type === 'system' ? 'var(--error)' : 'var(--primary)' }}>
                    {msg.sender}
                  </strong> {msg.action} <span style={{ color: 'var(--on-surface-variant)', lineHeight: '1.5', display: 'inline-block', marginTop: '4px' }}>{msg.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Propose a design change or ask a question..." 
              className="recessed-input" 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChat()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" style={{ padding: '12px 24px' }} onClick={sendChat}>Send</button>
          </div>
        </main>

        {/* Sidebar: Voting */}
        <aside style={{ 
          flex: 1, 
          display: 'flex', flexDirection: 'column', gap: '24px',
          overflowY: 'auto'
        }}>
          {/* Voting Widget */}
          <section className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--primary)' }}>Live Voting</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.9rem' }}>Border Radius</label>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{borderRadius}px</span>
              </div>
              <input 
                type="range" 
                min="0" max="48" 
                value={borderRadius} 
                onChange={(e) => updateDesign({ borderRadius: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.9rem' }}>Primary Accent</label>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{primaryColor}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['#A3A6FF', '#FFA5D9', '#FF6E84', '#6063EE'].map(color => (
                  <button 
                    key={color}
                    onClick={() => updateDesign({ primaryColor: color })}
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: color, border: 'none', cursor: 'pointer',
                      boxShadow: primaryColor === color ? '0 0 0 2px var(--surface), 0 0 0 4px var(--on-surface)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
