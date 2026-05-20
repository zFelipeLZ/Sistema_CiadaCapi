// ============================================================
// STORAGE.JS — Camada de dados (localStorage) + Dados fictícios
// Cia da Capivara Turismo
// ============================================================

const DB = {
  KEYS: {
    USERS: 'cct_users',
    CLIENTS: 'cct_clients',
    PACKAGES: 'cct_packages',
    BOOKINGS: 'cct_bookings',
    PROVIDERS: 'cct_providers',
    CARS: 'cct_cars',
    TASKS: 'cct_tasks',
    CASHFLOW: 'cct_cashflow',
    DOCUMENTS: 'cct_documents',
    NOTIFICATIONS: 'cct_notifications',
    DAYBYDAY: 'cct_daybyday',
    COMPANY_SETTINGS: 'cct_company_settings',
    SEEDED: 'cct_seeded',
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getOne(key, id) {
    return this.get(key).find(i => i.id === id) || null;
  },

  save(key, item) {
    const list = this.get(key);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    this.set(key, list);
    return item;
  },

  remove(key, id) {
    const list = this.get(key).filter(i => i.id !== id);
    this.set(key, list);
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ——— SEED DATA ————————————————————————————————————————————
  seed() {
    // Migração de Funcionários antigos para Fornecedores novos
    const legacyEmployees = localStorage.getItem('cct_employees');
    if (legacyEmployees && !localStorage.getItem(this.KEYS.PROVIDERS)) {
      try {
        const parsed = JSON.parse(legacyEmployees);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map(emp => {
            let standardRole = 'outros';
            const lowerRole = emp.role ? emp.role.toLowerCase() : '';
            if (lowerRole.includes('guia') || lowerRole.includes('condutor') || lowerRole.includes('arqueó')) {
              standardRole = 'guia';
            } else if (lowerRole.includes('motorista')) {
              standardRole = 'motorista';
            } else if (lowerRole.includes('hotel')) {
              standardRole = 'hotel';
            }
            return {
              id: emp.id,
              name: emp.name,
              role: standardRole,
              phone: emp.phone || '',
              email: emp.email || '',
              notes: emp.notes || '',
              carId: '',
              hotelLocation: '',
              createdAt: emp.createdAt || today(),
            };
          });
          this.set(this.KEYS.PROVIDERS, migrated);
          console.log('✅ Migrado cct_employees para cct_providers:', migrated);
        }
      } catch (e) {
        console.error('Erro na migração de funcionários antigos:', e);
      }
    }

    if (localStorage.getItem(this.KEYS.SEEDED) === 'v6') return;

    // --- USERS (Apenas os admins necessários para login) ---
    if (!localStorage.getItem(this.KEYS.USERS) || this.get(this.KEYS.USERS).length === 0) {
      const users = [
        {
          id: 'u1', username: 'admin', password: 'admin123', email: 'admin@ciacapivara.com', role: 'admin', name: 'Administrador'
        },
        {
          id: 'u2', username: 'felipe.admin', password: 'felipe321', email: 'felipe@gmail.com', role: 'admin', name: 'Felipe Louzeiro'
        },
      ];
      this.set(this.KEYS.USERS, users);
    }

    // --- CARS (Carros) ---
    const cars = [
      { id: 'car_1', model: 'Chevrolet Spin 1.8 (7 Lugares)', plate: 'CAP-4E26', type: 'local', status: 'em_uso', description: 'Veículo próprio da agência, ideal para passeios urbanos e traslados com grupos de até 6 passageiros.', createdAt: today() },
      { id: 'car_2', model: 'Toyota Hilux SRX 4x4', plate: 'CIA-9B99', type: 'local', status: 'em_uso', description: 'Caminhonete própria equipada para trilhas off-road, passeios em fazendas pantaneiras e travessia de rios rasos.', createdAt: today() },
      { id: 'car_3', model: 'Renault Master Minivan (15 Lugares)', plate: 'TUR-1F20', type: 'rented', status: 'disponivel', description: 'Veículo terceirizado alugado sob demanda de alta temporada para grupos maiores. Equipado com ar-condicionado de teto.', createdAt: today() }
    ];
    this.set(this.KEYS.CARS, cars);

    // --- PROVIDERS (Fornecedores) ---
    const providers = [
      { id: 'prov_1', name: 'Carlos Alberto Guia', role: 'guia', phone: '(67) 98888-1111', email: 'carlos.guia@ciacapivara.com', notes: 'Guia credenciado CADASTUR. Especialista em ecoturismo, flutuação e observação de aves. Bilíngue (Inglês e Português).', carId: '', hotelLocation: '', createdAt: today() },
      { id: 'prov_2', name: 'Mariana Souza Condutora', role: 'guia', phone: '(67) 99999-2222', email: 'mariana.cond@ciacapivara.com', notes: 'Condutora de aventura local com especialidade em trilhas arqueológicas e escaladas ecológicas.', carId: '', hotelLocation: '', createdAt: today() },
      { id: 'prov_3', name: 'João da Silva (Motorista)', role: 'motorista', phone: '(67) 97777-3333', email: 'joao.silva@ciacapivara.com', notes: 'Motorista com Categoria D e certificação de transporte de passageiros. Muito experiente em estradas de terra.', carId: 'car_1', hotelLocation: '', createdAt: today() },
      { id: 'prov_4', name: 'Pedro Antunes (Hilux Driver)', role: 'motorista', phone: '(67) 96666-4444', email: 'pedro.antunes@ciacapivara.com', notes: 'Motorista habilitado para trilhas e veículos 4x4. Responsável pela Hilux nas rotas de difícil acesso.', carId: 'car_2', hotelLocation: '', createdAt: today() },
      { id: 'prov_5', name: 'Hotel Paraíso das Águas', role: 'hotel', phone: '(67) 3255-1234', email: 'reservas@paraisodasaguashotel.com', notes: 'Hotel de categoria superior com piscina de água natural, café da manhã regional de alto padrão e lounge social.', carId: '', hotelLocation: 'Av. Coronel Pilad Rebuá, 1800 - Centro, Bonito - MS', createdAt: today() },
      { id: 'prov_6', name: 'Recanto das Capivaras Pousada', role: 'hotel', phone: '(67) 3255-5678', email: 'contato@recantocapivara.com', notes: 'Pousada ecológica com chalés privativos integrados à mata nativa e trilha para observação no próprio local.', carId: '', hotelLocation: 'Rodovia MS-178, Km 4 - Zona Rural, Bonito - MS', createdAt: today() }
    ];
    this.set(this.KEYS.PROVIDERS, providers);

    // --- CLIENTS (Clientes) ---
    const clients = [
      { id: 'cli_1', name: 'Família Oliveira (Grupo RJ)', phone: '(21) 97777-8888', email: 'ricardo.oliveira@email.com', location: 'Rio de Janeiro - RJ', peopleCount: 4, ageGroup: '3 Adultos e 1 Criança (10 anos)', description: 'Grupo familiar de férias. Foco em passeios de flutuação, banho de cachoeira e trilhas fáceis. Preferem passeios matinais.', createdAt: today() },
      { id: 'cli_2', name: 'Dr. Marcos & Sandra (Viagem de Bodas)', phone: '(11) 99111-2222', email: 'marcos.adv@email.com', location: 'São Paulo - SP', peopleCount: 2, ageGroup: 'Casal de Idosos (Melhor Idade)', description: 'Casal comemorando bodas de prata. Preferem passeios calmos, históricos, de contemplação, e sem caminhadas íngremes. Desejam hospedagem silenciosa.', createdAt: today() }
    ];
    this.set(this.KEYS.CLIENTS, clients);

    // --- DAYBYDAY (Itinerários) ---
    const daybyday = [
      {
        id: 'dbd_1',
        clientId: 'cli_1',
        date: today(),
        status: 'in_progress',
        guideId: 'prov_1',
        driverId: 'prov_3',
        carId: 'car_1',
        description: 'Recepção no Aeroporto de Bonito (BYO) às 10h40 pelo motorista João. Traslado privativo na Chevrolet Spin até o Recanto das Capivaras Pousada para check-in e almoço de boas-vindas. À tarde, às 14h30, caminhada ecológica guiada pelo guia Carlos Alberto nas trilhas de contemplação da pousada para avistamento de animais silvestres.',
        notes: 'Levar protetor solar, bonés e calçados confortáveis para trilha leve.',
        createdAt: today()
      },
      {
        id: 'dbd_2',
        clientId: 'cli_1',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'pending',
        guideId: 'prov_1',
        driverId: 'prov_3',
        carId: 'car_1',
        description: 'Saída às 08h00 da pousada com destino ao Rio Sucuri para atividade de Flutuação nas águas cristalinas. O passeio consiste em um leve treinamento na piscina, seguido por uma subida de barco elétrico e flutuação de 1.500 metros no rio com observação de peixes tropicais e vegetação subaquática. Almoço regional incluso no receptivo do local.',
        notes: 'Uso obrigatório de colete salva-vidas e roupa de neoprene fornecidas pelo atrativo. Não é permitido o uso de protetor solar ou repelente no rio para preservação da água.',
        createdAt: today()
      },
      {
        id: 'dbd_3',
        clientId: 'cli_1',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        status: 'pending',
        guideId: 'prov_2',
        driverId: 'prov_4',
        carId: 'car_2',
        description: 'Saída às 07h30 na Hilux 4x4 guiados pela condutora Mariana Souza para o passeio de Aventura Pantaneira na Fazenda San Francisco. Dia inteiramente dedicado ao Safári Fotográfico em veículo aberto adaptado pela reserva pantaneira, navegação de chalana no Rio Miranda com pesca recreativa de piranhas e observação de jacarés.',
        notes: 'Caminho em estrada de terra de cerca de 90 km. Garantir hidratação, repelente potente e agasalhos corta-vento.',
        createdAt: today()
      },
      {
        id: 'dbd_4',
        clientId: 'cli_2',
        date: today(),
        status: 'done',
        guideId: 'prov_1',
        driverId: 'prov_3',
        carId: 'car_1',
        description: 'Chegada terrestre no terminal rodoviário. Traslado de táxi executivo conveniado até o Hotel Paraíso das Águas para check-in e acomodação em Suíte Master Premium. Tarde reservada para descanso e adaptação.',
        notes: 'Check-in antecipado autorizado pelo hotel parceiro.',
        createdAt: today()
      },
      {
        id: 'dbd_5',
        clientId: 'cli_2',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'pending',
        guideId: 'prov_1',
        driverId: 'prov_3',
        carId: 'car_1',
        description: 'Saída privativa às 09h00 com o motorista João e guia Carlos rumo à Gruta do Lago Azul. Trata-se de um dos monumentos naturais mais imponentes do país, com uma descida de escadaria rústica de 300 degraus cercada por estalactites até a belíssima lagoa de águas azuis intensas. Contemplação fotográfica de 40 minutos no local e retorno ao centro para almoço livre.',
        notes: 'A descida requer atenção e calçado fechado antiderrapante. O casal informou preferir descida lenta. Apoio constante do guia Carlos.',
        createdAt: today()
      }
    ];
    this.set(this.KEYS.DAYBYDAY, daybyday);

    // --- PACKAGES (Pacotes) ---
    const packages = [
      { id: 'pack_1', name: 'Aventura Ecológica Bonito Cristalino', destination: 'Bonito - MS', duration: 5, price: 2450.00, capacity: 12, status: 'active', description: 'Roteiro completo de tirar o fôlego focado em flutuações fluviais, grutas fascinantes e trilhas ecológicas.', createdAt: today() },
      { id: 'pack_2', name: 'Expedição Safári Pantanal Selvagem', destination: 'Pantanal - MS', duration: 4, price: 3800.00, capacity: 8, status: 'active', description: 'Safári fotográfico, travessias 4x4, navegação de chalana, e observação da fauna do Pantanal Sul.', createdAt: today() }
    ];
    this.set(this.KEYS.PACKAGES, packages);

    // --- BOOKINGS (Reservas) ---
    const bookings = [
      { id: 'book_1', clientId: 'cli_1', packageId: 'pack_1', checkIn: today(), checkOut: new Date(Date.now() + 345600000).toISOString().split('T')[0], people: 4, status: 'confirmed', guideId: 'prov_1', driverId: 'prov_3', totalValue: 9800.00, paid: 9800.00, notes: 'Reserva totalmente quitada. Voucher de viagem gerado.', createdAt: today() },
      { id: 'book_2', clientId: 'cli_2', packageId: 'pack_2', checkIn: today(), checkOut: new Date(Date.now() + 259200000).toISOString().split('T')[0], people: 2, status: 'confirmed', guideId: 'prov_1', driverId: 'prov_3', totalValue: 7600.00, paid: 3800.00, notes: 'Sinal de 50% pago. Restante a ser faturado no check-out.', createdAt: today() }
    ];
    this.set(this.KEYS.BOOKINGS, bookings);

    // --- CASHFLOW (Fluxo de Caixa) ---
    const cashflow = [
      { id: 'cash_1', date: today(), type: 'income', category: 'Reserva', amount: 9800.00, description: 'Pagamento integral reserva Familia Oliveira (BYO-109)', createdAt: today() },
      { id: 'cash_2', date: today(), type: 'income', category: 'Reserva', amount: 3800.00, description: 'Sinal de 50% reserva Dr. Marcos Bodas', createdAt: today() },
      { id: 'cash_3', date: today(), type: 'expense', category: 'Combustível', amount: 250.00, description: 'Abastecimento Hilux 4x4 (placa CIA-9B99) - Expedição Pantanal', createdAt: today() },
      { id: 'cash_4', date: today(), type: 'expense', category: 'Comissão', amount: 400.00, description: 'Comissão diária guia Carlos Alberto Sucuri', createdAt: today() }
    ];
    this.set(this.KEYS.CASHFLOW, cashflow);

    // --- TASKS (Escalas) ---
    const tasks = [
      { id: 'task_1', title: 'Recepção e Transfer Aeroporto Bonito', employeeId: 'prov_3', departure: 'Aeroporto BYO', destination: 'Recanto das Capivaras Pousada', date: today(), time: '10:40', status: 'done', description: 'Buscar a Família Oliveira na Chevrolet Spin às 10h40.', createdAt: today() },
      { id: 'task_2', title: 'Caminhada Ecológica de Boas-Vindas', employeeId: 'prov_1', departure: 'Pousada Recanto', destination: 'Trilhas Internas Pousada', date: today(), time: '14:30', status: 'done', description: 'Guiamento leve para identificação de capivaras e aves.', createdAt: today() },
      { id: 'task_3', title: 'Flutuação no Rio Sucuri', employeeId: 'prov_1', departure: 'Pousada Recanto', destination: 'Rio Sucuri Receptivo', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '08:00', status: 'pending', description: 'Guiamento e flutuação nas águas do Rio Sucuri.', createdAt: today() },
      { id: 'task_4', title: 'Safári Fotográfico Pantanal', employeeId: 'prov_4', departure: 'Pousada Recanto', destination: 'Fazenda San Francisco', date: new Date(Date.now() + 172800000).toISOString().split('T')[0], time: '07:30', status: 'pending', description: 'Direção do veículo Hilux 4x4 e apoio na expedição pantaneira.', createdAt: today() }
    ];
    this.set(this.KEYS.TASKS, tasks);

    // --- COMPANY SETTINGS (Configurações da Empresa) ---
    if (!localStorage.getItem(this.KEYS.COMPANY_SETTINGS)) {
      this.set(this.KEYS.COMPANY_SETTINGS, {
        logoName: 'Cia da Capivara Turismo',
        logoEmoji: '🦔',
        cadastur: '12.345.678/0001-90',
        instagram: '@ciadacapivara',
        website: 'www.ciadacapivara.com'
      });
    }

    localStorage.setItem(this.KEYS.SEEDED, 'v6');
    console.log('✅ Banco de dados atualizado e inicializado com dados ricos (v6)!');
  },
};

// ——— HELPERS —————————————————————————————————————————————————
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatDateFull(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function today() { return new Date().toISOString().split('T')[0]; }
function generateId() { return DB.generateId(); }

const STATUS_LABELS = {
  arriving: { label: 'Chegando Hoje', cls: 'badge-warning' },
  arrived: { label: 'Em Andamento', cls: 'badge-info' },
  confirmed: { label: 'Confirmado', cls: 'badge-success' },
  finished: { label: 'Finalizado', cls: 'badge-secondary' },
  cancelled: { label: 'Cancelado', cls: 'badge-danger' },
  pending: { label: 'Pendente', cls: 'badge-warning' },
  in_progress: { label: 'Em Andamento', cls: 'badge-info' },
  done: { label: 'Concluído', cls: 'badge-success' },
  active: { label: 'Ativo', cls: 'badge-success' },
  inactive: { label: 'Inativo', cls: 'badge-secondary' },
  sold_out: { label: 'Esgotado', cls: 'badge-danger' },
};
