'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  notificationsApi,
  type NotificationLog,
  type InAppNotification,
} from '@/lib/api';

const NOTIFICATION_ROLES = ['ADMIN', 'TREASURER', 'COMMISSIONER'];
const CAN_SEND = ['ADMIN', 'TREASURER'];

function typeLabel(type: string) {
  if (type === 'RAPPEL_COTISATION') return 'Rappel cotisation';
  if (type === 'CONFIRMATION_PAIEMENT') return 'Confirmation paiement';
  return type;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [inAppList, setInAppList] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [inAppLoading, setInAppLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkYear, setBulkYear] = useState(() => new Date().getFullYear());
  const [bulkMonth, setBulkMonth] = useState(() => new Date().getMonth() + 1);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkTitle, setBulkTitle] = useState('Message du bureau');
  const [sendingBulk, setSendingBulk] = useState(false);

  const canAccess = user && NOTIFICATION_ROLES.includes(user.role);
  const canSend = user && CAN_SEND.includes(user.role);

  const loadAdmin = () => {
    if (!canAccess) return;
    setLoading(true);
    notificationsApi.logs(undefined, 50)
      .then(setLogs)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  };

  const loadInApp = () => {
    setInAppLoading(true);
    notificationsApi.inApp
      .list(50)
      .then(setInAppList)
      .catch(() => setInAppList([]))
      .finally(() => {
        setInAppLoading(false);
        window.dispatchEvent(new Event('notifications-inapp-updated'));
      });
  };

  useEffect(() => {
    loadAdmin();
  }, [canAccess]);

  useEffect(() => {
    if (user) loadInApp();
  }, [user]);

  const handleRemindAllArrears = (e: React.FormEvent) => {
    e.preventDefault();
    const message = bulkMessage.trim();
    if (!message) {
      toast.error('Veuillez saisir un message.');
      return;
    }
    setError(null);
    setSuccess(null);
    setSendingBulk(true);
    notificationsApi
      .remindAllArrears({
        year: bulkYear,
        month: bulkMonth,
        message,
        title: bulkTitle.trim() || undefined,
      })
      .then((r) => {
        setSuccess(r.message);
        toast.success(r.message);
        loadAdmin();
        loadInApp();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setSendingBulk(false));
  };

  const markAsRead = (id: string) => {
    notificationsApi.inApp.markAsRead(id).then(() => {
      setInAppList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      window.dispatchEvent(new Event('notifications-inapp-updated'));
    });
  };

  const markAllAsRead = () => {
    notificationsApi.inApp.markAllAsRead().then(() => {
      setInAppList((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new Event('notifications-inapp-updated'));
    });
  };

  const unreadCount = inAppList.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">
          {canAccess ? 'Notifications' : 'Mes notifications'}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">
          {canAccess
            ? 'Envoi de messages aux membres en retard et historique.'
            : 'Les messages du bureau vous concernant.'}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-700/30 bg-red-900/20 px-4 py-3 text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/20 px-4 py-3 text-emerald-400">{success}</div>
      )}

      {/* Mes notifications (tous les utilisateurs) */}
      <div className="w-full rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center text-lg font-semibold text-[var(--afc-text)]">
            Mes notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#C9A048] px-1.5 text-xs font-bold text-[#171308]">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllAsRead} className="text-sm font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline">
              Tout marquer comme lu
            </button>
          )}
        </div>
        {inAppLoading ? (
          <div className="flex justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#C9A048] border-r-transparent" />
          </div>
        ) : inAppList.length === 0 ? (
          <p className="py-6 text-sm text-[var(--afc-muted)]">Aucune notification.</p>
        ) : (
          <ul className="space-y-3">
            {inAppList.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border p-4 ${n.read ? 'border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)]' : 'border-[#C9A048]/30 bg-[#C9A048]/[0.06]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {n.title && (
                      <p className="font-medium text-[var(--afc-text)]">{n.title}</p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--afc-text-soft)]">{n.message}</p>
                    <p className="mt-2 text-xs text-[var(--afc-muted)]">
                      {new Date(n.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 text-xs font-medium text-[#C9A048] transition hover:text-[#DDB65C] hover:underline"
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canSend && (
        <>
          {loading ? (
            <div className="flex justify-center rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] py-12">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#C9A048] border-r-transparent" />
            </div>
          ) : (
            <>
              <div className="w-full rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[var(--afc-text)]">
                  Envoyer un message à tous les membres en retard
                </h2>
                <p className="mb-4 text-sm text-[var(--afc-muted-2)]">
                  Choisissez la période (année / mois) et rédigez un message. Tous les membres en retard pour cette période recevront une notification dans leur tableau de bord (ex. rappel avant le 10, info après suspension, etc.).
                </p>
                <form onSubmit={handleRemindAllArrears} className="max-w-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Année</label>
                      <select
                        value={bulkYear}
                        onChange={(e) => setBulkYear(parseInt(e.target.value, 10))}
                        className="afc-login-input w-full text-sm"
                      >
                        {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Mois</label>
                      <select
                        value={bulkMonth}
                        onChange={(e) => setBulkMonth(parseInt(e.target.value, 10))}
                        className="afc-login-input w-full text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Titre (optionnel)</label>
                    <input
                      type="text"
                      value={bulkTitle}
                      onChange={(e) => setBulkTitle(e.target.value)}
                      placeholder="Message du bureau"
                      className="afc-login-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--afc-text-soft)]">Message <span className="text-red-400">*</span></label>
                    <textarea
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      placeholder="Ex. Merci de régulariser votre cotisation avant le 10 pour éviter toute suspension."
                      className="afc-login-input min-h-[120px] w-full text-sm"
                      required
                      rows={4}
                    />
                  </div>
                  <button type="submit" disabled={sendingBulk} className="afc-button-primary disabled:opacity-60">
                    {sendingBulk ? 'Envoi en cours…' : 'Envoyer à tous les membres en retard'}
                  </button>
                </form>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
                <h2 className="border-b border-[var(--afc-border)] px-6 py-4 text-lg font-semibold text-[var(--afc-text)]">
                  Historique des envois
                </h2>
                <div className="overflow-x-auto">
                  <table className="afc-table-dark w-full text-left">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Date</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Type</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Canal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]">
                          <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">
                            {new Date(log.sentAt).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-6 py-3 font-medium text-[var(--afc-text)]">
                            {log.member.firstName} {log.member.lastName}
                          </td>
                          <td className="px-6 py-3 text-[var(--afc-text-soft)]">{typeLabel(log.type)}</td>
                          <td className="px-6 py-3 text-sm text-[var(--afc-muted-2)]">{log.channel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logs.length === 0 && (
                    <div className="py-12 text-center text-[var(--afc-muted)]">Aucun envoi enregistré.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
