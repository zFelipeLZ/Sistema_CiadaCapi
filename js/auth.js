// ============================================================
// AUTH.JS — Login, sessão e notificações por email (EmailJS)
// ============================================================

const Auth = {
  SESSION_KEY: 'cct_session',

  currentUser: null,

  init() {
    const saved = sessionStorage.getItem(this.SESSION_KEY);
    if (saved) {
      this.currentUser = JSON.parse(saved);
      return true;
    }
    return false;
  },

  login(username, password) {
    const users = DB.get(DB.KEYS.USERS);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return false;
    this.currentUser = user;
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    return true;
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem(this.SESSION_KEY);
    location.reload();
  },

  isLoggedIn() { return !!this.currentUser; },
  isAdmin()    { return this.currentUser?.role === 'admin'; },
};

// ——— EMAILJS INTEGRATION ————————————————————————————————————
// CONFIGURAÇÃO: Substitua os valores abaixo com suas chaves do EmailJS
// Acesse: https://www.emailjs.com/ → crie conta → Services → Templates
const EMAILJS_CONFIG = {
  publicKey:   'YOUR_PUBLIC_KEY',       // Account → API Keys
  serviceId:   'YOUR_SERVICE_ID',       // Email Services
  templateId:  'YOUR_TEMPLATE_ID',      // Email Templates
};

const EmailNotifier = {
  initialized: false,

  init() {
    if (typeof emailjs === 'undefined') { return; }
    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
      this.initialized = true;
    } catch(e) {
      console.warn('EmailJS não configurado:', e.message);
    }
  },

  async send(toEmail, toName, subject, message) {
    if (!this.initialized || EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
      console.info(`[EMAIL SIMULADO] Para: ${toEmail} | ${subject}\n${message}`);
      showToast('📧 Email simulado (configure o EmailJS para envio real)', 'info');
      return;
    }
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        to_email: toEmail,
        to_name:  toName,
        subject:  subject,
        message:  message,
        from_name: 'Cia da Capivara Turismo',
      });
      showToast(`✅ Email enviado para ${toEmail}`, 'success');
    } catch(e) {
      console.error('Erro ao enviar email:', e);
      showToast('❌ Falha ao enviar email', 'error');
    }
  },

  // ——— Templates de notificação ————————————————————————————
  async notifyNewBooking(booking) {
    const client  = DB.getOne(DB.KEYS.CLIENTS,  booking.clientId);
    const pkg     = DB.getOne(DB.KEYS.PACKAGES, booking.packageId);
    if (!client) return;
    await this.send(
      client.email,
      client.name,
      `Confirmação de Reserva — ${pkg?.name}`,
      `Olá ${client.name}!\n\nSua reserva foi confirmada:\n\n📦 Pacote: ${pkg?.name}\n📅 Check-in: ${formatDate(booking.checkIn)}\n📅 Check-out: ${formatDate(booking.checkOut)}\n👥 Pessoas: ${booking.people}\n💰 Total: ${formatCurrency(booking.totalValue)}\n\nAgradecemos a preferência!\nCia da Capivara Turismo 🦔`
    );
  },

  async notifyCheckInReminder(booking) {
    const client = DB.getOne(DB.KEYS.CLIENTS, booking.clientId);
    const pkg    = DB.getOne(DB.KEYS.PACKAGES, booking.packageId);
    if (!client) return;
    await this.send(
      client.email,
      client.name,
      `Lembrete: Sua viagem começa amanhã! — ${pkg?.name}`,
      `Olá ${client.name}!\n\n🔔 Lembrete: sua viagem começa AMANHÃ!\n\n📦 Pacote: ${pkg?.name}\n📅 Data: ${formatDate(booking.checkIn)}\n📍 Destino: ${pkg?.destination}\n\nPrepare sua bagagem e tenha uma ótima viagem!\nCia da Capivara Turismo 🦔`
    );
  },

  async notifyCheckOut(booking) {
    const client = DB.getOne(DB.KEYS.CLIENTS, booking.clientId);
    if (!client) return;
    await this.send(
      client.email,
      client.name,
      'Obrigado pela sua viagem! — Cia da Capivara Turismo',
      `Olá ${client.name}!\n\nFoi um prazer ter você conosco! 🌟\n\nEsperamos que tenha aproveitado cada momento. Sua opinião é muito importante — entre em contato e nos conte como foi.\n\nAté a próxima aventura!\nCia da Capivara Turismo 🦔`
    );
  },

  async notifyPaymentReceived(booking, amount) {
    const client = DB.getOne(DB.KEYS.CLIENTS, booking.clientId);
    if (!client) return;
    await this.send(
      client.email,
      client.name,
      'Pagamento Recebido — Cia da Capivara Turismo',
      `Olá ${client.name}!\n\n✅ Recebemos seu pagamento de ${formatCurrency(amount)}.\n\nSaldo restante: ${formatCurrency(booking.totalValue - booking.paid)}\n\nObrigado!\nCia da Capivara Turismo 🦔`
    );
  },

  async notifyEmployee(employee, task) {
    if (!employee.email) return;
    await this.send(
      employee.email,
      employee.name,
      `Nova Tarefa Atribuída — ${task.title}`,
      `Olá ${employee.name}!\n\nUma nova tarefa foi atribuída a você:\n\n📋 ${task.title}\n📍 Destino: ${task.destination}\n📅 Data: ${formatDate(task.date)} às ${task.time}\n📝 ${task.description}\n\nCia da Capivara Turismo 🦔`
    );
  },
};
