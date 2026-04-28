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
  
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [activeTab, setActiveTab] = useState('requirements');

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
          if (data.projects) {
            setProjects(data.projects);
            if (data.projects.length > 0 && !activeProjectId) {
              setActiveProjectId(data.projects[data.projects.length - 1].id);
            }
          }
        } else if (data.type === 'project_updated') {
          setProjects(data.projects);
          if (data.project && !activeProjectId) {
            setActiveProjectId(data.project.id);
          }
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

  // Expose debug helpers to the browser console as window.dbc
  useEffect(() => {
    const api = 'http://localhost:4002';
    window.dbc = {
      synthesize: (projectId) => fetch(`${api}/debug/synthesize/${projectId || activeProjectId}`, { method: 'POST' }).then(r => r.json()).then(console.log),
      projects:   ()           => fetch(`${api}/debug/projects`).then(r => r.json()).then(console.table),
      chat:       (text, pid)  => fetch(`${api}/debug/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, projectId: pid || activeProjectId }) }).then(r => r.json()).then(console.log),
    };
  }, [activeProjectId]);

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
        text: comment,
        projectId: activeProjectId || null,
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

  const handleCreateProject = () => {
    if (newProjectName.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'create_project',
        userId,
        name: newProjectName
      }));
      setNewProjectName('');
    }
  };

  const handleAddItem = (phase) => {
    if (newItemText.trim() && activeProjectId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'add_project_item',
        userId,
        projectId: activeProjectId,
        phase,
        text: newItemText
      }));
      setNewItemText('');
    }
  };

  const handleSignOff = (phase, itemId) => {
    if (activeProjectId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'sign_off_item',
        userId,
        projectId: activeProjectId,
        phase,
        itemId
      }));
    }
  };

  const handlePromotePhase = () => {
    if (activeProjectId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'promote_phase',
        userId,
        projectId: activeProjectId
      }));
    }
  };

  const handleKickoff = () => {
    if (activeProjectId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'kickoff_project',
        userId,
        projectId: activeProjectId
      }));
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

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
            {aiMembers.map((member, idx) => (
              <div key={member.id} title={member.name} className="ai-badge-live" style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 'bold',
                color: 'var(--tertiary)',
                animationDelay: `${idx * 0.6}s`,
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
            <div
              className={isConnected ? 'status-dot-live' : undefined}
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--tertiary)' : 'var(--error)'
              }}
            />
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
              {[...messages].reverse().map(msg => (
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

        {/* Sidebar: Project Tracker */}
        <aside style={{ 
          flex: 1, 
          display: 'flex', flexDirection: 'column', gap: '24px',
          overflowY: 'auto'
        }}>
          <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0, color: 'var(--primary)' }}>Project Tracker</h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="New project name..." 
                className="recessed-input" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={handleCreateProject}>Create</button>
            </div>

            {projects.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>Active Project:</span>
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => {
                    setActiveProjectId(e.target.value);
                    setActiveTab(projects.find(p => p.id === e.target.value)?.status || 'requirements');
                  }}
                  className="recessed-input"
                  style={{ flex: 1, padding: '8px' }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={handleKickoff}
                  disabled={!activeProjectId || activeProject?.status === 'completed'}
                  title="Tell the committee to start working on this project"
                  style={{ padding: '8px 14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  GO
                </button>
              </div>
            )}

            {activeProject && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--surface-container-highest)' }}>
                  {['requirements', 'tasks', 'todos'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{ 
                        flex: 1, 
                        background: 'none', 
                        border: 'none', 
                        padding: '8px', 
                        cursor: 'pointer',
                        color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                        borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                        fontWeight: activeTab === tab ? 'bold' : 'normal',
                        textTransform: 'capitalize'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeProject[activeTab].map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px',
                      backgroundColor: 'var(--surface-container-low)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: item.aiApproved
                        ? '3px solid var(--tertiary)'
                        : (item.aiApprovals && item.aiApprovals.length > 0)
                          ? '3px solid var(--primary-dim)'
                          : '3px solid transparent',
                    }}>
                      <input
                        type="checkbox"
                        checked={item.signedOff}
                        onChange={() => handleSignOff(activeTab, item.id)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <span style={{
                        flex: 1,
                        fontSize: '0.9rem',
                        textDecoration: item.signedOff ? 'line-through' : 'none',
                        color: item.signedOff ? 'var(--on-surface-variant)' : 'var(--on-surface)'
                      }}>
                        {item.text}
                      </span>
                      {activeTab === 'todos' && item.status && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--tertiary)' }}>[{item.status}]</span>
                      )}
                      {activeTab !== 'todos' && item.aiApproved && (
                        <span title="AI consensus reached" style={{
                          fontSize: '0.65rem', fontWeight: 'bold',
                          color: 'var(--tertiary)',
                          border: '1px solid var(--tertiary)',
                          borderRadius: 'var(--radius-full)',
                          padding: '2px 6px',
                          whiteSpace: 'nowrap',
                        }}>AI ✓</span>
                      )}
                      {activeTab !== 'todos' && !item.aiApproved && item.aiApprovals && item.aiApprovals.length > 0 && (
                        <span title={`Approved by: ${item.aiApprovals.join(', ')}`} style={{
                          fontSize: '0.65rem',
                          color: 'var(--on-surface-variant)',
                          border: '1px solid var(--outline-variant)',
                          borderRadius: 'var(--radius-full)',
                          padding: '2px 6px',
                          whiteSpace: 'nowrap',
                        }}>AI {item.aiApprovals.length}</span>
                      )}
                    </div>
                  ))}
                  {activeProject[activeTab].length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textAlign: 'center', padding: '16px 0' }}>
                      No items yet.
                    </div>
                  )}
                </div>

                {activeProject.status === activeTab && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input 
                      type="text" 
                      placeholder={`Add new ${activeTab.slice(0, -1)}...`} 
                      className="recessed-input" 
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddItem(activeTab)}
                      style={{ flex: 1, fontSize: '0.9rem' }}
                    />
                    <button 
                      className="btn-primary" 
                      onClick={() => handleAddItem(activeTab)}
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      Add
                    </button>
                  </div>
                )}

                {activeProject.status === activeTab && activeProject[activeTab].length > 0 && activeProject[activeTab].every(i => i.signedOff) && (
                  <button 
                    className="btn-primary" 
                    onClick={handlePromotePhase}
                    style={{ marginTop: '16px', width: '100%', background: 'linear-gradient(135deg, var(--tertiary), var(--primary))' }}
                  >
                    Promote to Next Phase
                  </button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
