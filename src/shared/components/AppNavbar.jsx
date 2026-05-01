import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import ROUTES from '../../app/router/routePaths';
import { getAdminNotificationsRequest } from '../../app/api/client';
import { translateText } from '../i18n/translate';

function getAccountRoutesByRole(role) {
  switch (role) {
    case 'Student':
      return {
        profile: ROUTES.ACCOUNT.STUDENT_PROFILE,
        changePassword: ROUTES.ACCOUNT.STUDENT_CHANGE_PASSWORD,
      };
    case 'AcademicAdvisor':
      return {
        profile: ROUTES.ACCOUNT.ACADEMIC_ADVISOR_PROFILE,
        changePassword: ROUTES.ACCOUNT.ACADEMIC_ADVISOR_CHANGE_PASSWORD,
      };
    case 'Administrator':
      return {
        profile: ROUTES.ACCOUNT.ADMINISTRATOR_PROFILE,
        changePassword: ROUTES.ACCOUNT.ADMINISTRATOR_CHANGE_PASSWORD,
      };
    default:
      return {
        profile: ROUTES.PUBLIC.ROOT,
        changePassword: ROUTES.PUBLIC.ROOT,
      };
  }
}

function getUserInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => (part[0] || '').toUpperCase()).join('');
}

function formatClock(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatShortDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatNotificationDate(value, locale) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sanitizeExpression(expression = '') {
  return String(expression)
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/%/g, '/100');
}

function evaluateExpression(expression = '') {
  const prepared = sanitizeExpression(expression);
  if (!prepared || !/^[0-9+\-*/().\s]+$/.test(prepared)) {
    throw new Error('Invalid expression');
  }

  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${prepared});`)();
  if (!Number.isFinite(value)) {
    throw new Error('Invalid result');
  }

  return Number(value.toFixed(6));
}

function notificationBelongsToCurrentUser(notification, user) {
  if (!notification || !user) return false;

  if (user.role === 'Administrator') return true;

  const notificationUserId = notification.recipient_user_id ?? notification.recipientUserId;
  const notificationEmail = String(
    notification.recipient_email || notification.recipientEmail || ''
  ).toLowerCase();

  const currentUserId = user.id ?? user.user_id ?? user.userId;
  const currentEmail = String(user.email || '').toLowerCase();

  const isSystemWide = !notificationUserId && !notificationEmail;
  const isUserMatched = notificationUserId && Number(notificationUserId) === Number(currentUserId);
  const isEmailMatched = notificationEmail && notificationEmail === currentEmail;

  return Boolean(isSystemWide || isUserMatched || isEmailMatched);
}

function normalizeNotification(notification, locale) {
  const createdAt =
    notification.created_at ||
    notification.createdAt ||
    notification.created_on ||
    notification.createdOn ||
    '';

  const type = notification.type || 'System';
  const status = notification.status || 'Pending';

  return {
    id: notification.id,
    title: notification.title || '-',
    message: notification.message || '',
    type,
    status,
    createdAt,
    readAt: notification.read_at || notification.readAt || null,
    meta: `${type} • ${status} • ${formatNotificationDate(createdAt, locale)}`,
  };
}

function isUnreadNotification(notification) {
  const status = String(notification.status || '').toLowerCase();
  return !notification.readAt && status !== 'read';
}

function TopIconButton({ icon, label, onClick, badge = null, isActive = false }) {
  return (
    <button
      type="button"
      className={`ims-topbar-icon-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="ims-topbar-icon-symbol" aria-hidden="true">
        {icon}
      </span>
      {badge ? <span className="ims-chip-badge">{badge}</span> : null}
    </button>
  );
}

function CalendarGrid({ baseDate, markedDates, locale }) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startIndex = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdayLabels = locale.startsWith('ar')
    ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const cells = [];
  for (let i = 0; i < startIndex; i += 1) {
    cells.push(
      <div
        key={`empty-${i}`}
        className="border rounded-2 bg-light-subtle"
        style={{ minHeight: 38 }}
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isMarked = markedDates.has(key);
    cells.push(
      <div
        key={key}
        className={`border rounded-2 d-flex align-items-center justify-content-center fw-semibold ${
          isMarked ? 'bg-primary text-white' : 'bg-white'
        }`}
        style={{ minHeight: 38 }}
      >
        {day}
      </div>
    );
  }

  return (
    <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {weekdayLabels.map((label) => (
        <div key={label} className="text-center text-muted small fw-semibold">
          {label}
        </div>
      ))}
      {cells}
    </div>
  );
}

function AppNavbar({ title = 'Internship Management System' }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleLanguage, isArabic } = useLanguage();

  const [activePanel, setActivePanel] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [notificationLimit, setNotificationLimit] = useState(3);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationRows, setNotificationRows] = useState([]);
  const [weather, setWeather] = useState({ temperature: '--', loading: true });
  const [calculator, setCalculator] = useState({ display: '', result: null, history: [] });

  const panelRef = useRef(null);
  const accountRoutes = getAccountRoutesByRole(user?.role);
  const locale = isArabic ? 'ar-SA' : 'en-GB';
  const t = (text) => translateText(text, isArabic);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const controller = new AbortController();

    async function loadWeather() {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=24.4672&longitude=39.6111&current=temperature_2m&timezone=Asia%2FRiyadh',
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Weather request failed');
        const payload = await response.json();
        const temp = payload?.current?.temperature_2m;
        setWeather({ temperature: Number.isFinite(temp) ? Math.round(temp) : '--', loading: false });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setWeather({ temperature: '--', loading: false });
      }
    }

    loadWeather();
    return () => controller.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setActivePanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotificationRows([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return undefined;
    }

    const normalizedRole = String(user?.role || '')
      .toLowerCase()
      .replace(/[\s_-]/g, '');

    const canLoadAdminNotifications =
      normalizedRole === 'administrator' || normalizedRole === 'admin';

    if (!canLoadAdminNotifications) {
      setNotificationRows([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError('');

      try {
        const rows = await getAdminNotificationsRequest();

        if (!isMounted) return;

        const normalizedRows = Array.isArray(rows)
          ? rows
              .filter((item) => notificationBelongsToCurrentUser(item, user))
              .map((item) => normalizeNotification(item, locale))
              .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          : [];

        setNotificationRows(normalizedRows);
      } catch (error) {
        if (!isMounted) return;
        setNotificationRows([]);
        setNotificationsError(error.message || 'Failed to load notifications.');
      } finally {
        if (isMounted) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, locale]);

  const doctorContact = useMemo(
    () => ({
      name: user?.role === 'Student' ? 'Academic Supervisor' : 'System Coordinator',
      email: '',
      phone: '',
      officeHours: isArabic ? 'الأحد - الخميس | 9:00 ص - 1:00 م' : 'Sun - Thu | 9:00 AM - 1:00 PM',
    }),
    [isArabic, user?.role]
  );

  const calendarMarkedDates = useMemo(() => new Set(), []);

  const unreadNotificationsCount = useMemo(
    () => notificationRows.filter(isUnreadNotification).length,
    [notificationRows]
  );

  const renderedNotifications = notificationRows.slice(0, notificationLimit);

  const handleLogout = async () => {
    setActivePanel(null);
    await logout();
    navigate(ROUTES.PUBLIC.LOGIN);
  };

  const appendCalculatorValue = (value) => {
    setCalculator((current) => ({ ...current, display: `${current.display}${value}` }));
  };

  const applyCalculatorFunction = (fnName) => {
    setCalculator((current) => {
      const raw = current.display || '0';
      let numericValue = 0;

      try {
        numericValue = Number(evaluateExpression(raw));
      } catch {
        numericValue = Number(raw || 0);
      }

      let nextValue = numericValue;
      if (fnName === 'sqrt') nextValue = Math.sqrt(Math.max(0, numericValue));
      if (fnName === 'square') nextValue = numericValue ** 2;
      if (fnName === 'reciprocal') nextValue = numericValue === 0 ? 0 : 1 / numericValue;

      return {
        ...current,
        display: String(Number(nextValue.toFixed(6))),
      };
    });
  };

  const runCalculation = () => {
    try {
      const result = evaluateExpression(calculator.display);
      setCalculator((current) => ({
        display: String(result),
        result,
        history: [
          {
            id: Date.now(),
            expression: current.display,
            result,
          },
          ...current.history,
        ].slice(0, 5),
      }));
    } catch {
      setCalculator((current) => ({ ...current, result: '—' }));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark ims-navbar px-3 px-lg-4">
      <div className="container-fluid gap-3">
        <Link className="navbar-brand fw-semibold" to={ROUTES.PUBLIC.ROOT}>
          {t(title)}
        </Link>

        <div className="ims-navbar-tools" ref={panelRef}>
          <TopIconButton
            icon="✉️"
            label={t('Contact Doctor')}
            onClick={() => setActivePanel((current) => (current === 'doctor' ? null : 'doctor'))}
            isActive={activePanel === 'doctor'}
          />
          <TopIconButton
            icon="🧮"
            label={t('Advanced Calculator')}
            onClick={() => setActivePanel((current) => (current === 'calculator' ? null : 'calculator'))}
            isActive={activePanel === 'calculator'}
          />
          <TopIconButton
            icon="📅"
            label={t('Calendar')}
            onClick={() => setActivePanel((current) => (current === 'calendar' ? null : 'calendar'))}
            isActive={activePanel === 'calendar'}
          />
          <TopIconButton
            icon="🌤️"
            label={t('Madinah Weather')}
            onClick={() => setActivePanel((current) => (current === 'weather' ? null : 'weather'))}
            isActive={activePanel === 'weather'}
          />
          <TopIconButton
            icon="🕒"
            label={t('Current Time')}
            onClick={() => setActivePanel((current) => (current === 'clock' ? null : 'clock'))}
            isActive={activePanel === 'clock'}
          />
          <TopIconButton icon="🌐" label={isArabic ? 'English' : 'العربية'} onClick={toggleLanguage} />
          <TopIconButton
            icon="🔔"
            label={t('Notifications')}
            onClick={() => setActivePanel((current) => (current === 'notifications' ? null : 'notifications'))}
            isActive={activePanel === 'notifications'}
            badge={unreadNotificationsCount || null}
          />

          <div className="ims-user-menu">
            <button
              type="button"
              className="ims-user-menu-trigger"
              onClick={() => setActivePanel((current) => (current === 'user' ? null : 'user'))}
            >
              <div className="ims-avatar-circle">{getUserInitials(user?.fullName || user?.email)}</div>
              <div className="ims-user-menu-text">
                <div className="ims-user-menu-name">{user?.fullName || user?.email || 'Authenticated User'}</div>
                <div className="ims-user-menu-role">{t(user?.role || 'User')}</div>
              </div>
              <span className="ims-user-menu-arrow">▾</span>
            </button>

            {activePanel === 'user' ? (
              <div className="ims-user-menu-dropdown">
                <button
                  type="button"
                  className="ims-user-menu-item"
                  onClick={() => {
                    setActivePanel(null);
                    navigate(accountRoutes.profile);
                  }}
                >
                  {t('View Profile')}
                </button>
                <button
                  type="button"
                  className="ims-user-menu-item"
                  onClick={() => {
                    setActivePanel(null);
                    navigate(accountRoutes.changePassword);
                  }}
                >
                  {t('Change Password')}
                </button>
                <button
                  type="button"
                  className="ims-user-menu-item ims-user-menu-item-danger"
                  onClick={handleLogout}
                >
                  {t('Logout')}
                </button>
              </div>
            ) : null}
          </div>

          {activePanel === 'doctor' ? (
            <div className="ims-floating-panel ims-floating-panel-doctor">
              <div className="ims-floating-panel-title">{t('Contact Doctor')}</div>
              <div className="fw-semibold mb-1">{doctorContact.name}</div>
              <div className="text-muted small mb-1">
                {doctorContact.email || t('Contact email is not configured yet.')}
              </div>
              <div className="text-muted small mb-3">{doctorContact.officeHours}</div>
              <div className="d-flex gap-2 flex-wrap">
                <a
                  className={`btn btn-primary btn-sm ${doctorContact.email ? '' : 'disabled'}`}
                  href={doctorContact.email ? `mailto:${doctorContact.email}` : '#'}
                >
                  {t('Send Email')}
                </a>
                <a
                  className={`btn btn-outline-primary btn-sm ${doctorContact.phone ? '' : 'disabled'}`}
                  href={doctorContact.phone ? `tel:${doctorContact.phone}` : '#'}
                >
                  {t('Call')}
                </a>
              </div>
            </div>
          ) : null}

          {activePanel === 'calculator' ? (
            <div className="ims-floating-panel" style={{ minWidth: 320 }}>
              <div className="ims-floating-panel-title">{t('Advanced Calculator')}</div>
              <div className="d-grid gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('Enter equation')}
                  value={calculator.display}
                  onChange={(event) =>
                    setCalculator((current) => ({ ...current, display: event.target.value }))
                  }
                />
                <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '(', ')'].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => appendCalculatorValue(value)}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
                <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => applyCalculatorFunction('sqrt')}>
                    {t('√x')}
                  </button>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => applyCalculatorFunction('square')}>
                    {t('x²')}
                  </button>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => applyCalculatorFunction('reciprocal')}>
                    {t('1/x')}
                  </button>
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => appendCalculatorValue('%')}>
                    %
                  </button>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-primary btn-sm flex-grow-1" onClick={runCalculation}>
                    {t('Calculate')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setCalculator((current) => ({ ...current, display: current.display.slice(0, -1) }))}
                  >
                    {t('Backspace')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setCalculator({ display: '', result: null, history: [] })}
                  >
                    {t('Clear')}
                  </button>
                </div>
                <div className="ims-calculator-result">
                  {t('Result')}: <strong>{calculator.result ?? '—'}</strong>
                </div>
                {calculator.history.length > 0 ? (
                  <div className="border-top pt-2">
                    <div className="text-muted small fw-semibold mb-2">{t('Recent Calculations')}</div>
                    <div className="d-flex flex-column gap-1">
                      {calculator.history.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="btn btn-light btn-sm text-start"
                          onClick={() =>
                            setCalculator((current) => ({
                              ...current,
                              display: item.expression,
                              result: item.result,
                            }))
                          }
                        >
                          <div className="small">{item.expression}</div>
                          <div className="fw-semibold">= {item.result}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activePanel === 'calendar' ? (
            <div className="ims-floating-panel" style={{ minWidth: 340 }}>
              <div className="ims-floating-panel-title">{t('Calendar')}</div>
              <div className="d-grid gap-3">
                <CalendarGrid baseDate={clock} markedDates={calendarMarkedDates} locale={locale} />
                <div className="text-muted small">
                  {isArabic
                    ? 'تمت إزالة بيانات التقويم التجريبية. يمكن ربط هذا الجزء لاحقًا بتقويم المواعيد والمتابعات الفعلية.'
                    : 'Mock calendar data has been removed. This area can later be connected to real follow-up and meeting schedules.'}
                </div>
              </div>
            </div>
          ) : null}

          {activePanel === 'weather' ? (
            <div className="ims-floating-panel">
              <div className="ims-floating-panel-title">{t('Madinah Weather')}</div>
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <div className="fw-semibold">{isArabic ? 'المدينة المنورة' : 'Madinah'}</div>
                  <div className="text-muted small">{weather.loading ? t('Loading') : `${weather.temperature}°C`}</div>
                </div>
                <div className="display-6 mb-0">🌤️</div>
              </div>
            </div>
          ) : null}

          {activePanel === 'clock' ? (
            <div className="ims-floating-panel">
              <div className="ims-floating-panel-title">{t('Current Time')}</div>
              <div className="fw-semibold fs-4">{formatClock(clock, locale)}</div>
              <div className="text-muted small">{formatShortDate(clock, locale)}</div>
            </div>
          ) : null}

          {activePanel === 'notifications' ? (
            <div className="ims-floating-panel ims-floating-panel-notifications">
              <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
                <div className="ims-floating-panel-title mb-0">{t('Notifications')}</div>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  disabled={notificationRows.length <= 3}
                  onClick={() =>
                    setNotificationLimit((current) => (current < notificationRows.length ? notificationRows.length : 3))
                  }
                >
                  {notificationLimit < notificationRows.length ? t('View more') : t('Show less')}
                </button>
              </div>

              {notificationsLoading ? (
                <div className="text-muted small">{t('Loading')}...</div>
              ) : notificationsError ? (
                <div className="text-muted small">{notificationsError}</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {renderedNotifications.length > 0 ? (
                    renderedNotifications.map((item) => (
                      <div key={item.id} className="ims-notification-item">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="fw-semibold">{item.title}</div>
                          {isUnreadNotification(item) ? (
                            <span className="badge text-bg-primary">{t('New')}</span>
                          ) : null}
                        </div>
                        {item.message ? <div className="small mt-1">{item.message}</div> : null}
                        <div className="text-muted small mt-1">{item.meta}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted small">{t('No new notifications.')}</div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;