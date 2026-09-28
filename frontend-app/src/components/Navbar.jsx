import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const dashboardPath = user?.role === 'mentor' ? '/mentor/dashboard' : '/parent/dashboard';

  return (
    <header className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'relative' }}>
        <Link to="/" className="brand">CodeYoung</Link>

        <nav>
          {!user && (
            <>
              <Link to="/login">Log In</Link>
              <Link to="/signup" className="btn btn-primary">Book a Free Trial</Link>
            </>
          )}
          {user && (
            <>
              <NavLink to={dashboardPath} className={({ isActive }) => (isActive ? 'nav-link-active' : '')}>
                Dashboard
              </NavLink>
              <NavLink to="/change-password" className={({ isActive }) => (isActive ? 'nav-link-active' : '')}>
                Change Password
              </NavLink>
              <span className="user-chip">
                <span className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.72rem' }}>
                  {user.name.charAt(0)}
                </span>
                {user.name} · {user.role}
              </span>
              <button className="btn btn-secondary" onClick={handleLogout}>Log Out</button>
            </>
          )}
        </nav>

        <button
          className="mobile-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          {!user && (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Book a Free Trial</Link>
            </>
          )}
          {user && (
            <>
              <Link to={dashboardPath} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/change-password" onClick={() => setMenuOpen(false)}>Change Password</Link>
              <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem', padding: '6px 4px' }}>
                {user.name} · {user.role}
              </span>
              <button onClick={handleLogout}>Log Out</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
