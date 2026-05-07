import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FolderOpen,
  BookOpen,
  MessageSquareText,
  Database,
  Users,
  Library,
  BarChart3,
  LogOut,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getRecentCasos } from '../api/casos';
import type { Caso } from '../types/caso';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [casosOpen, setCasosOpen] = useState(true);
  const [conocimientoOpen, setConocimientoOpen] = useState(true);
  const [recentCasos, setRecentCasos] = useState<Caso[]>([]);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    getRecentCasos()
      .then(setRecentCasos)
      .catch(() => setRecentCasos([]));
  }, []);

  const hasAction = (action: string) => user?.actions?.includes(action) ?? false;
  const isAdmin = user?.rolNombre?.toLowerCase().includes('admin') ?? false;
  const showConocimientoGroup =
    hasAction('Biblioteca y consulta') ||
    hasAction('Gestión de documentos para la base de conocimiento') ||
    hasAction('Gestión de prompts');
  const showReportes = hasAction('Informes y reportes') || isAdmin;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar__logo">
          <span className="sidebar__logo-text">Kantuta</span>
          <span className="sidebar__logo-badge">AI</span>
        </div>

        {/* Navegación */}
        <nav className="sidebar__nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
            }
          >
            <MessageSquare className="sidebar__nav-icon" />
            <span className="sidebar__nav-label">Consulta por chat</span>
          </NavLink>

          {/* Gestión de casos (expandible) */}
          {hasAction('Gestión de casos') && (
            <>
              <button
                className="sidebar__nav-item"
                onClick={() => setCasosOpen(!casosOpen)}
              >
                <FolderOpen className="sidebar__nav-icon" />
                <span className="sidebar__nav-label">Gestión de casos</span>
                <ChevronUp
                  className={`sidebar__nav-chevron ${casosOpen ? 'sidebar__nav-chevron--open' : ''}`}
                />
              </button>

              {casosOpen && (
                <div className="sidebar__subnav">
                  {recentCasos.length === 0 ? (
                    <span className="sidebar__subnav-item sidebar__subnav-item--empty">
                      Sin casos recientes
                    </span>
                  ) : (
                    recentCasos.map((caso) => (
                      <NavLink
                        key={caso.id_caso}
                        to={`/casos/${caso.id_caso}`}
                        className={({ isActive }) =>
                          `sidebar__subnav-item ${isActive ? 'sidebar__subnav-item--active' : ''}`
                        }
                      >
                        {caso.titulo}
                      </NavLink>
                    ))
                  )}
                  <NavLink
                    to="/casos"
                    end
                    className={({ isActive }) =>
                      `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                    }
                  >
                    <button className="sidebar__subnav-more">Ver Todos</button>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {/* Base de Conocimiento Jurídico (agrupa biblioteca + documentos + prompts) */}
          {showConocimientoGroup && (
            <>
              <button
                className="sidebar__nav-item"
                onClick={() => setConocimientoOpen(!conocimientoOpen)}
              >
                <Library className="sidebar__nav-icon" />
                <span className="sidebar__nav-label">Base de Conocimiento Jurídico</span>
                <ChevronUp
                  className={`sidebar__nav-chevron ${conocimientoOpen ? 'sidebar__nav-chevron--open' : ''}`}
                />
              </button>

              {conocimientoOpen && (
                <div className="sidebar__subnav-group">
                  {hasAction('Biblioteca y consulta') && (
                    <NavLink
                      to="/biblioteca"
                      className={({ isActive }) =>
                        `sidebar__nav-item sidebar__nav-item--nested ${isActive ? 'sidebar__nav-item--active' : ''}`
                      }
                    >
                      <BookOpen className="sidebar__nav-icon" />
                      <span className="sidebar__nav-label">Biblioteca y consulta</span>
                    </NavLink>
                  )}
                  {hasAction('Gestión de documentos para la base de conocimiento') && (
                    <NavLink
                      to="/base_de_conocimiento"
                      className={({ isActive }) =>
                        `sidebar__nav-item sidebar__nav-item--nested ${isActive ? 'sidebar__nav-item--active' : ''}`
                      }
                    >
                      <Database className="sidebar__nav-icon" />
                      <span className="sidebar__nav-label">Base de conocimiento</span>
                    </NavLink>
                  )}
                  {hasAction('Gestión de prompts') && (
                    <NavLink
                      to="/prompts"
                      className={({ isActive }) =>
                        `sidebar__nav-item sidebar__nav-item--nested ${isActive ? 'sidebar__nav-item--active' : ''}`
                      }
                    >
                      <MessageSquareText className="sidebar__nav-icon" />
                      <span className="sidebar__nav-label">Gestión de prompts</span>
                    </NavLink>
                  )}
                </div>
              )}
            </>
          )}

          {hasAction('Gestión de usuarios') && (
            <NavLink to="/admin/users" className="sidebar__nav-item">
              <Users className="sidebar__nav-icon" />
              <span className="sidebar__nav-label">Gestión de usuarios</span>
            </NavLink>
          )}

          {showReportes && (
            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
              }
            >
              <BarChart3 className="sidebar__nav-icon" />
              <span className="sidebar__nav-label">Informes y reportes</span>
            </NavLink>
          )}
        </nav>

        {/* Parte inferior */}
        <div className="sidebar__bottom">
          <button
            className="sidebar__nav-item sidebar__logout-btn"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut className="sidebar__nav-icon" />
            <span className="sidebar__nav-label">Cerrar Sesión</span>
          </button>

          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {(user?.nombre?.trim()?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">
                {user?.nombre ?? 'Usuario'}
              </span>
              <span className="sidebar__user-role">{user?.rolNombre ?? 'Sin rol'}</span>
            </div>
          </div>

        </div>
      </aside>

      {/* Contenido principal */}
      <main className="dashboard-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
