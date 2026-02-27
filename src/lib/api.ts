const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('afc_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const err = await res.json().catch(() => ({}));
    const message = typeof err?.message === 'string' ? err.message : 'Non autorisé';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('afc_token');
      localStorage.removeItem('afc_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new Error(message);
  }
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    const message = typeof err?.message === 'string' ? err.message : 'Accès refusé';
    if (typeof window !== 'undefined') {
      const suspended = /suspendu|suspended/i.test(message);
      if (suspended) {
        localStorage.removeItem('afc_token');
        localStorage.removeItem('afc_user');
        window.location.href = '/compte-suspendu';
        throw new Error(message);
      }
    }
    throw new Error(message);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  return res.json();
}

export const authApi = {
  login: (phone: string, password: string) =>
    api<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  me: () => api<AuthUser>('/auth/me'),
  sendActivationOtp: (phone: string) =>
    api<{ ok: boolean; message?: string; demoCode?: string }>('/auth/send-activation-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyActivationOtp: (phone: string, code: string) =>
    api<{ activationToken: string }>('/auth/verify-activation-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  setPassword: (activationToken: string, password: string) =>
    api<{ ok: boolean; message?: string }>('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ activationToken, password }),
    }),
};

export const membersApi = {
  list: () => api<Member[]>('/members'),
  one: (id: string) => api<Member>(`/members/${id}`),
  me: () => api<Member>('/members/me'),
  completeProfile: (data: CompleteProfileInput) =>
    api<Member>('/members/me/complete-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadAvatar: async (file: Blob | File): Promise<{ url: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file, file instanceof File ? file.name : 'avatar.jpg');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/members/me/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('afc_token');
        localStorage.removeItem('afc_user');
        window.location.href = '/login';
      }
      throw new Error('Non autorisé');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return res.json();
  },
  invite: (data: { phone: string }) =>
    api<
      Member & {
        activationLink?: string;
        whatsappSent?: boolean;
        whatsappError?: string;
      }
    >('/members/invite', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: CreateMemberInput) =>
    api<Member>('/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateMemberInput> & { isSuspended?: boolean; role?: string }) =>
    api<Member>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/members/${id}`, { method: 'DELETE' }),
  auditLog: (id: string) =>
    api<MemberAuditLogEntry[]>(`/members/${id}/audit-log`),
};

export type MemberAuditLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  performedById: string | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
  details: string | null;
};

export type AuthUser = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  profileCompleted: boolean;
  profilePhotoUrl: string | null;
  email: string | null;
  isSuspended?: boolean;
  /** Date de réactivation manuelle par l'admin : le membre a 24 h pour payer, sinon re-suspension. */
  reactivatedAt?: string | null;
};

export type Member = AuthUser & {
  neighborhood?: string | null;
  secondaryContact?: string | null;
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompleteProfileInput = {
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
  email?: string;
  neighborhood?: string;
  secondaryContact?: string;
};

export type CreateMemberInput = {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePhotoUrl?: string;
  email?: string;
  neighborhood?: string;
  secondaryContact?: string;
};

// ========== Cotisations ==========

export type Contribution = {
  id: string;
  name: string;
  type: string;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  targetAmount: number | null;
  receivedAmount: number | null;
  frequency: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { payments: number };
};

export type Payment = {
  id: string;
  memberId: string;
  contributionId: string;
  amount: number;
  paidAt: string;
  periodYear: number | null;
  periodMonth: number | null;
  member?: { id: string; firstName: string; lastName: string; phone: string };
  contribution?: Contribution;
};

export type ArrearsResult = {
  periodYear: number;
  periodMonth: number;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    isSuspended: boolean;
  }>;
  total: number;
};

export type CreateContributionInput = {
  name: string;
  type: 'MONTHLY' | 'EXCEPTIONAL' | 'PROJECT';
  amount?: number;
  startDate?: string;
  endDate?: string;
  targetAmount?: number;
  frequency?: string;
};

export const contributionsApi = {
  list: () => api<Contribution[]>('/contributions'),
  one: (id: string) => api<Contribution>(`/contributions/${id}`),
  create: (data: CreateContributionInput) =>
    api<Contribution>('/contributions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; amount?: number; startDate?: string; endDate?: string }) =>
    api<Contribution>(`/contributions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  monthly: () => api<Contribution>('/contributions/monthly'),
  arrears: (year?: number, month?: number) =>
    api<ArrearsResult>(
      year != null && month != null
        ? `/contributions/arrears?year=${year}&month=${month}`
        : '/contributions/arrears',
    ),
  applySuspensions: () =>
    api<{ applied: number; periodYear?: number; periodMonth?: number; message?: string }>(
      '/contributions/apply-suspensions',
      { method: 'POST' },
    ),
  payments: (params?: { memberId?: string; contributionId?: string; year?: number; month?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.memberId) search.set('memberId', params.memberId);
    if (params?.contributionId) search.set('contributionId', params.contributionId);
    if (params?.year != null) search.set('year', String(params.year));
    if (params?.month != null) search.set('month', String(params.month));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const q = search.toString();
    return api<Payment[]>(`/contributions/payments${q ? `?${q}` : ''}`);
  },
  recordPayment: (data: {
    memberId: string;
    contributionId: string;
    amount: number;
    periodYear?: number;
    periodMonth?: number;
  }) =>
    api<Payment>('/contributions/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Paiement par le membre pour lui-même (tous les rôles). */
  recordSelfPayment: (data: {
    contributionId: string;
    amount: number;
    periodYear?: number;
    periodMonth?: number;
  }) =>
    api<Payment>('/contributions/payments/me', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Init paiement CinetPay : retourne paymentUrl et transactionId. */
  initCinetPay: (data: {
    contributionId: string;
    amount: number;
    periodYear?: number;
    periodMonth?: number;
  }) =>
    api<{ paymentUrl: string; transactionId: string }>(
      '/contributions/payments/cinetpay/init',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  /** Vérification manuelle après retour CinetPay (page success). Retourne les mois encore impayés. */
  verifyCinetPayTransaction: (transactionId: string) =>
    api<{ status: string; completed?: boolean; remainingUnpaidMonths?: { year: number; month: number }[] }>(
      `/contributions/payments/cinetpay/verify/${encodeURIComponent(transactionId)}`,
    ),
  historySummary: (year?: number, month?: number) =>
    api<HistorySummary>(
      year != null && month != null
        ? `/contributions/history/summary?year=${year}&month=${month}`
        : '/contributions/history/summary',
    ),
  memberHistory: (memberId: string) =>
    api<MemberHistory>(`/contributions/history/member/${memberId}`),
  /** Statut cotisation du membre connecté (tous les rôles). */
  me: () => api<MemberHistory>('/contributions/me'),
  /** Mois non payés (cotisation mensuelle) — blocage accès tant que liste non vide. */
  meUnpaidMonths: () =>
    api<{ unpaidMonths: Array<{ year: number; month: number }>; monthlyContributionId: string | null }>(
      '/contributions/me/unpaid-months',
    ),
};

export type HistorySummary = {
  totalCollected: number;
  byMonth: Array<{ year: number; month: number; totalCollected: number; paymentsCount: number }>;
  monthlyContributionId: string | null;
};

export type MemberHistory = {
  member: { id: string; firstName: string; lastName: string; phone: string; role: string; isSuspended: boolean };
  payments: Payment[];
  byMonth: Array<{ year: number; month: number; amount: number; paidAt: string }>;
  totalPaid: number;
};

// ========== Caisse (sous-caisses type Wave) ==========

export type CashBox = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CashBoxSummary = CashBox & {
  solde: number;
  totalEntries: number;
  totalExits: number;
};

export type CaisseSummary = {
  boxes: CashBoxSummary[];
  defaultCashBoxId: string;
  global: {
    solde: number;
    totalEntries: number;
    totalExits: number;
  };
  lastUpdated: string;
};

export type Expense = {
  id: string;
  amount: number | string;
  description: string;
  expenseDate: string;
  beneficiary?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  cashBox?: { id: string; name: string } | null;
  requestedBy: { id: string; firstName: string; lastName: string };
  treasurerApprovedBy?: { id: string; firstName: string; lastName: string } | null;
  commissionerApprovedBy?: { id: string; firstName: string; lastName: string } | null;
  treasurerApprovedAt?: string | null;
  commissionerApprovedAt?: string | null;
  rejectReason?: string | null;
};

/** Entrée du livre de caisse (cotisation, allocation, dépense, retrait). */
export type LivreEntry =
  | {
      type: 'entree';
      kind?: 'payment' | 'allocation';
      date: string;
      id: string;
      amount: number;
      label: string;
      contribution?: string;
      cashBox: string | null;
      member?: { id: string; firstName: string; lastName: string };
      periodYear?: number | null;
      periodMonth?: number | null;
      description?: string | null;
      requestedBy?: { id: string; firstName: string; lastName: string };
      treasurerApprovedBy?: { id: string; firstName: string; lastName: string } | null;
      commissionerApprovedBy?: { id: string; firstName: string; lastName: string } | null;
    }
  | {
      type: 'sortie';
      kind?: 'expense' | 'withdrawal';
      date: string;
      id: string;
      amount: number;
      description?: string | null;
      label?: string | null;
      beneficiary?: string | null;
      expenseDate?: string;
      cashBox: string | null;
      requestedBy: { id: string; firstName: string; lastName: string };
      treasurerApprovedBy: { id: string; firstName: string; lastName: string } | null;
      commissionerApprovedBy: { id: string; firstName: string; lastName: string } | null;
    };

export type CashBoxTransferType = 'ALLOCATION' | 'WITHDRAWAL';

export type CashBoxTransfer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: CashBoxTransferType;
  amount: number | { toNumber?: () => number };
  description: string | null;
  status: string;
  fromCashBoxId: string | null;
  fromCashBox: { id: string; name: string } | null;
  toCashBoxId: string | null;
  toCashBox: { id: string; name: string } | null;
  requestedById: string;
  requestedBy: { id: string; firstName: string; lastName: string };
  treasurerApprovedById: string | null;
  treasurerApprovedBy: { id: string; firstName: string; lastName: string } | null;
  commissionerApprovedById: string | null;
  commissionerApprovedBy: { id: string; firstName: string; lastName: string } | null;
  rejectReason: string | null;
};

// ========== Rapports ==========

export type MonthlyReport = {
  period: { year: number; month: number; label: string };
  totalEntries: number;
  totalExits: number;
  solde: number;
  payments: Array<{ amount: number; paidAt: string; member: { firstName: string; lastName: string; phone: string }; contribution: { name: string } }>;
  expenses: Array<{ amount: number; expenseDate: string; description: string; requestedBy: { firstName: string; lastName: string } }>;
};

export type AnnualReport = {
  year: number;
  months: Array<{ year: number; month: number; label: string; totalEntries: number; totalExits: number; solde: number }>;
  totalEntries: number;
  totalExits: number;
  solde: number;
};

export const reportsApi = {
  monthly: (year?: number, month?: number) => {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    return api<MonthlyReport>(`/reports/monthly?year=${y}&month=${m}`);
  },
  annual: (year?: number) => {
    const y = year ?? new Date().getFullYear();
    return api<AnnualReport>(`/reports/annual?year=${y}`);
  },
  downloadCsv: (year?: number, month?: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('afc_token') : null;
    let url = `${base}/reports/export/csv`;
    if (year != null) url += `?year=${year}`;
    if (month != null) url += `${year != null ? '&' : '?'}month=${month}`;
    if (typeof window !== 'undefined' && token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `rapport-transactions${year ?? ''}${month != null ? `-${month}` : ''}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
    }
  },
  downloadPdf: (year?: number, month?: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('afc_token') : null;
    let url = `${base}/reports/export/pdf`;
    if (year != null) url += `?year=${year}`;
    if (month != null) url += `${year != null ? '&' : '?'}month=${month}`;
    if (typeof window !== 'undefined' && token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `rapport-transactions${year ?? ''}${month != null ? `-${month}` : ''}.pdf`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
    }
  },
};

// ========== Activités ==========

export type Activity = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  result: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { photos: number };
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
};

export type Photo = {
  id: string;
  url: string;
  caption: string | null;
  activityId: string | null;
  createdAt: string;
};

export const activitiesApi = {
  list: () => api<Activity[]>('/activities'),
  recentCount: () => api<{ count: number }>('/activities/recent-count'),
  markSeen: () => api<{ ok: boolean }>('/activities/seen', { method: 'POST' }),
  one: (id: string) => api<Activity & { photos: Photo[] }>(`/activities/${id}`),
  create: (data: { type: string; title: string; description?: string; date: string; endDate?: string; result?: string }) =>
    api<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),
  announcements: () => api<Announcement[]>('/activities/announcements'),
  createAnnouncement: (data: { title: string; content: string }) =>
    api<Announcement>('/activities/announcements', { method: 'POST', body: JSON.stringify(data) }),
  photos: (activityId: string) => api<Photo[]>(`/activities/${activityId}/photos`),
  createPhoto: (data: { url: string; caption?: string; activityId?: string }) =>
    api<Photo>('/activities/photos', { method: 'POST', body: JSON.stringify(data) }),
};

export const caisseApi = {
  summary: () => api<CaisseSummary>('/caisse'),
  livre: (limit?: number) =>
    api<LivreEntry[]>(limit ? `/caisse/livre?limit=${limit}` : '/caisse/livre'),
  boxes: () => api<CashBox[]>('/caisse/boxes'),
  createCashBox: (data: { name: string; description?: string; order?: number; isDefault?: boolean }) =>
    api<CashBox>('/caisse/boxes', { method: 'POST', body: JSON.stringify(data) }),
  updateCashBox: (id: string, data: { name?: string; description?: string; order?: number; isDefault?: boolean }) =>
    api<CashBox>(`/caisse/boxes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCashBox: (id: string) =>
    api<{ success: boolean }>(`/caisse/boxes/${id}`, { method: 'DELETE' }),
  pendingCount: () =>
    api<{ pendingTreasurer: number; pendingCommissioner: number }>('/caisse/pending-count'),
  expenses: (cashBoxId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (cashBoxId) params.set('cashBoxId', cashBoxId);
    if (limit != null) params.set('limit', String(limit));
    const q = params.toString();
    return api<Expense[]>(`/caisse/expenses${q ? `?${q}` : ''}`);
  },
  expense: (id: string) => api<Expense>(`/caisse/expenses/${id}`),
  createExpense: (data: {
    amount: number;
    description: string;
    expenseDate: string;
    cashBoxId?: string;
    beneficiary?: string;
  }) =>
    api<Expense>('/caisse/expenses', { method: 'POST', body: JSON.stringify(data) }),
  validateTreasurer: (id: string) =>
    api<Expense>(`/caisse/expenses/${id}/validate-treasurer`, { method: 'PATCH' }),
  validateCommissioner: (id: string) =>
    api<Expense>(`/caisse/expenses/${id}/validate-commissioner`, { method: 'PATCH' }),
  rejectExpense: (id: string, motif?: string) =>
    api<Expense>(`/caisse/expenses/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ motif: motif ?? '' }),
    }),
  transfers: (cashBoxId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (cashBoxId) params.set('cashBoxId', cashBoxId);
    if (limit != null) params.set('limit', String(limit));
    const q = params.toString();
    return api<CashBoxTransfer[]>(`/caisse/transfers${q ? `?${q}` : ''}`);
  },
  transfer: (id: string) => api<CashBoxTransfer>(`/caisse/transfers/${id}`),
  createTransfer: (data: { type: CashBoxTransferType; cashBoxId: string; amount: number; description?: string }) =>
    api<CashBoxTransfer>('/caisse/transfers', { method: 'POST', body: JSON.stringify(data) }),
  validateTransferTreasurer: (id: string) =>
    api<CashBoxTransfer>(`/caisse/transfers/${id}/validate-treasurer`, { method: 'PATCH' }),
  validateTransferCommissioner: (id: string) =>
    api<CashBoxTransfer>(`/caisse/transfers/${id}/validate-commissioner`, { method: 'PATCH' }),
  rejectTransfer: (id: string, motif?: string) =>
    api<CashBoxTransfer>(`/caisse/transfers/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ motif: motif ?? '' }),
    }),
};

// ========== Notifications ==========

export type NotificationLog = {
  id: string;
  sentAt: string;
  memberId: string;
  channel: string;
  type: string;
  payload: string | null;
  member: { id: string; firstName: string; lastName: string; phone: string };
};

export type InAppNotification = {
  id: string;
  createdAt: string;
  memberId: string;
  title: string | null;
  message: string;
  read: boolean;
};

export const notificationsApi = {
  status: () => api<{ whatsappConfigured: boolean }>('/notifications/status'),
  logs: (memberId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (memberId) params.set('memberId', memberId);
    if (limit != null) params.set('limit', String(limit));
    const q = params.toString();
    return api<NotificationLog[]>(`/notifications/logs${q ? `?${q}` : ''}`);
  },
  remindCotisation: (memberId: string, periodLabel: string) =>
    api<{ ok: boolean; message: string }>('/notifications/remind-cotisation', {
      method: 'POST',
      body: JSON.stringify({ memberId, periodLabel }),
    }),
  remindAllArrears: (body: { year?: number; month?: number; message: string; title?: string }) =>
    api<{ sent: number; total: number; message: string }>('/notifications/remind-all-arrears', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  inApp: {
    list: (limit?: number) => {
      const q = limit != null ? `?limit=${limit}` : '';
      return api<InAppNotification[]>(`/notifications/in-app${q}`);
    },
    unreadCount: () => api<{ count: number }>('/notifications/in-app/count'),
    markAsRead: (id: string) =>
      api<void>(`/notifications/in-app/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () =>
      api<void>('/notifications/in-app/read-all', { method: 'PATCH' }),
  },
  confirmPayment: (memberId: string, amount: number, periodLabel: string) =>
    api<{ ok: boolean; message: string }>('/notifications/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ memberId, amount, periodLabel }),
    }),
};
