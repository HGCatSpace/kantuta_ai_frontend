import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Scale, Eye, EyeOff } from 'lucide-react';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import './LoginPage.css';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormData>();

  // Redirigir si ya está autenticado
  if (token) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const response = await login(data.username, data.password);
      setAuth(response.access_token, response.user_data);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object'
      ) {
        const axiosErr = err as { response: { status: number } };
        if (axiosErr.response.status === 401) {
          setError('Credenciales incorrectas. Verifique su usuario y contraseña.');
        } else {
          setError('Error del servidor. Intente nuevamente más tarde.');
        }
      } else {
        setError('No se pudo conectar al servidor.');
      }
    }
  };

  return (
    <div className="login-page">
      {/* Panel Izquierdo - Branding */}
      <div className="login-branding">
        <div className="login-branding__content">
          <div className="login-branding__icon-wrapper">
            <Scale className="login-branding__icon" />
          </div>
          <h1 className="login-branding__title">Kantuta AI</h1>
          <p className="login-branding__tagline">
            "Elevando la excelencia jurídica a través de la inteligencia artificial"
          </p>
        </div>
        <div className="login-branding__copyright">
          © 2024 Kantuta AI - Plataforma Legal
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="login-form-panel">
        <div className="login-form-panel__content">
          <div className="login-form-panel__inner">
            {/* Logo móvil */}
            <div className="login-mobile-logo">
              <div className="login-mobile-logo__icon-wrapper">
                <Scale className="login-mobile-logo__icon" />
              </div>
              <h1 className="login-mobile-logo__title">Kantuta AI</h1>
            </div>

            <h2 className="login-heading">Bienvenido de nuevo</h2>
            <p className="login-subheading">
              Ingrese sus credenciales para acceder a su panel
            </p>

            {error && <div className="login-form__error">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Email / Usuario */}
              <div className="login-form__field">
                <label htmlFor="username" className="login-form__label">
                  Nombre de usuario o Correo electrónico
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="ej. abogado@firma.com"
                  className="login-form__input"
                  autoComplete="username"
                  {...register('username', { required: true })}
                />
              </div>

              {/* Contraseña */}
              <div className="login-form__field">
                <label htmlFor="password" className="login-form__label">
                  Contraseña
                </label>
                <div className="login-form__password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="login-form__input"
                    autoComplete="current-password"
                    {...register('password', { required: true })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-form__password-toggle"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              

              {/* Botón */}
              <button
                type="submit"
                className="login-form__submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </form>

            
          </div>
        </div>

        {/* Copyright solo visible en móvil */}
        <div className="login-copyright-mobile">
          © 2026 Kantuta AI - Plataforma Legal Premium
        </div>
      </div>
    </div>
  );
}
