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
  const [status, setStatus] = useState<{ whatsappConfigured: boolean } | null>(null);
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
    Promise.all([
      notificationsApi.status(),
      notificationsApi.logs(undefined, 50),
    ])
      .then(([s, l]) => {
        setStatus(s);
        setLogs(l);
      })
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {canAccess ? 'Notifications' : 'Mes notifications'}
        </h1>
        <p className="text-gray-600 mt-1">
          {canAccess
            ? 'Statut WhatsApp, envoi de messages aux membres en retard et historique.'
            : 'Les messages du bureau vous concernant.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3">{success}</div>
      )}

      {/* Mes notifications (tous les utilisateurs) */}
      <div className="card w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Mes notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[var(--sky-blue)] text-white text-xs font-bold min-w-[1.25rem] h-5 px-1.5">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllAsRead} className="text-sm text-[var(--sky-blue)] hover:underline">
              Tout marquer comme lu
            </button>
          )}
        </div>
        {inAppLoading ? (
          <div className="py-8 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--sky-blue)] border-r-transparent" />
          </div>
        ) : inAppList.length === 0 ? (
          <p className="py-6 text-gray-500 text-sm">Aucune notification.</p>
        ) : (
          <ul className="space-y-3">
            {inAppList.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border p-4 ${n.read ? 'bg-gray-50/50 border-gray-100' : 'bg-sky-50/50 border-[var(--sky-blue-soft)]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {n.title && (
                      <p className="font-medium text-[var(--foreground)]">{n.title}</p>
                    )}
                    <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{n.message}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(n.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 text-xs text-[var(--sky-blue)] hover:underline"
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
            <div className="card flex justify-center py-12">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
            </div>
          ) : (
            <>
              {status && (
                <div className="card border-l-4 border-l-[var(--sky-blue)]">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">WhatsApp</h2>
                  <p className="mt-2 text-[var(--foreground)]">
                    {status.whatsappConfigured ? (
                      <span className="text-green-700 font-medium">Configuré — les messages sont envoyés par WhatsApp.</span>
                    ) : (
                      <span className="text-amber-700">Non configuré — les envois sont uniquement enregistrés (pas d’envoi réel).</span>
                    )}
                  </p>
                </div>
              )}

              <div className="card w-full">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                  Envoyer un message à tous les membres en retard
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Choisissez la période (année / mois) et rédigez un message. Tous les membres en retard pour cette période recevront une notification dans leur tableau de bord (ex. rappel avant le 10, info après suspension, etc.).
                </p>
                <form onSubmit={handleRemindAllArrears} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                      <select
                        value={bulkYear}
                        onChange={(e) => setBulkYear(parseInt(e.target.value, 10))}
                        className="input w-full"
                      >
                        {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                      <select
                        value={bulkMonth}
                        onChange={(e) => setBulkMonth(parseInt(e.target.value, 10))}
                        className="input w-full"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
                    <input
                      type="text"
                      value={bulkTitle}
                      onChange={(e) => setBulkTitle(e.target.value)}
                      placeholder="Message du bureau"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
                    <textarea
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      placeholder="Ex. Merci de régulariser votre cotisation avant le 10 pour éviter toute suspension."
                      className="input w-full min-h-[120px]"
                      required
                      rows={4}
                    />
                  </div>
                  <button type="submit" disabled={sendingBulk} className="btn-primary">
                    {sendingBulk ? 'Envoi en cours…' : 'Envoyer à tous les membres en retard'}
                  </button>
                </form>
              </div>

              <div className="card overflow-hidden p-0">
                <h2 className="px-6 py-4 text-lg font-semibold text-[var(--foreground)] border-b border-gray-100">
                  Historique des envois (WhatsApp / SMS)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[var(--sky-blue-soft)]">
                        <th className="px-6 py-4 text-sm font-semibold text-[var(--sky-blue-dark)]">Date</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Membre</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600">Canal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {new Date(log.sentAt).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                            {log.member.firstName} {log.member.lastName}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{typeLabel(log.type)}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{log.channel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logs.length === 0 && (
                    <div className="py-12 text-center text-gray-500">Aucun envoi enregistré.</div>
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
