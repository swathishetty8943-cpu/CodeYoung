import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Calendar, Settings, Lock, LogOut } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const NAV_ITEMS = [
  { to: '/', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mentors', label: 'Mentors', icon: GraduationCap },
  { to: '/bookings', label: 'Bookings', icon: Calendar },
  { to: '/config', label: 'Configuration', icon: Settings },
  { to: '/settings', label: 'Settings', icon: Lock },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-mark">CY</span>
          <span>CodeYoung Admin</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon" aria-hidden="true"><item.icon size={18} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {admin && (
            <div className="admin-mini-profile">
              <div className="avatar-circle">{admin.name.charAt(0)}</div>
              <div>
                <div className="admin-mini-name">{admin.name}</div>
                <div className="admin-mini-email">{admin.email}</div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" /> Log Out
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
