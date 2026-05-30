const API_URL = 'https://ponto-eletronico-api-pis3.onrender.com';

let loggedUser = null;

// Função auxiliar para requisições à API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro na requisição');
  }
  return response.json();
}

// ==================== RENDERIZAÇÃO POR PERFIL ====================
async function renderByRole() {
  const navDiv = document.getElementById('navMenu');
  const pages = ['empresasPage', 'funcionariosPage', 'registrosPage', 'relatoriosPage', 'dashboardPage', 'pontoFuncPage', 'meusRegistrosFuncPage'];
  pages.forEach(p => document.getElementById(p).classList.remove('active-page'));

  if (!loggedUser) {
    document.getElementById('loginPage').classList.add('active-page');
    navDiv.style.display = 'none';
    document.getElementById('userNameDisplay').innerText = 'Não logado';
    document.getElementById('logoutBtn').style.display = 'none';
    return;
  }

  document.getElementById('loginPage').classList.remove('active-page');
  navDiv.style.display = 'flex';
  document.getElementById('logoutBtn').style.display = 'block';

  if (loggedUser.tipo === 'admin') {
    document.getElementById('userNameDisplay').innerText = '👑 Admin Master';
    navDiv.innerHTML = `
      <button class="nav-btn" data-page="empresasPage">🏢 Empresas</button>
      <button class="nav-btn" data-page="funcionariosPage">👥 Funcionários</button>
      <button class="nav-btn" data-page="registrosPage">📋 Registros</button>
      <button class="nav-btn" data-page="relatoriosPage">📊 Relatórios</button>
      <button class="nav-btn" data-page="dashboardPage">📈 Dashboard</button>
    `;
    document.getElementById('empresasPage').classList.add('active-page');
    await carregarEmpresas();
    await carregarFuncionarios();
    await carregarRegistros();
    await atualizarDashboard();
    await carregarRelatoriosFiltros();
  } else {
    document.getElementById('userNameDisplay').innerText = `🧑‍💼 ${loggedUser.nome}`;
    navDiv.innerHTML = `
      <button class="nav-btn" data-page="pontoFuncPage">⏱️ Bater Ponto</button>
      <button class="nav-btn" data-page="meusRegistrosFuncPage">📜 Meus Registros</button>
    `;
    document.getElementById('pontoFuncPage').classList.add('active-page');
    await atualizarInterfacePonto();
    await carregarMeusRegistrosHistorico();
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pageId = btn.getAttribute('data-page');
      pages.forEach(p => document.getElementById(p).classList.remove('active-page'));
      if (pageId) document.getElementById(pageId).classList.add('active-page');
      if (pageId === 'empresasPage') await carregarEmpresas();
      if (pageId === 'funcionariosPage') await carregarFuncionarios();
      if (pageId === 'registrosPage') await carregarRegistros();
      if (pageId === 'dashboardPage') await atualizarDashboard();
      if (pageId === 'relatoriosPage') { await carregarRelatoriosFiltros(); document.getElementById('gerarRelatorioBtn').click(); }
      if (pageId === 'meusRegistrosFuncPage') await carregarMeusRegistrosHistorico();
      if (pageId === 'pontoFuncPage') await atualizarInterfacePonto();
    });
  });
}

// ==================== EMPRESAS (COM VALIDAÇÕES) ====================
async function carregarEmpresas() {
  try {
    const empresas = await apiRequest('/empresas');
    const div = document.getElementById('empresasList');
    if (!div) return;
    div.innerHTML = `
      <table>
        <thead>
          <tr><th>ID</th><th>Nome</th><th>CNPJ</th><th>Endereço</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${empresas.map(emp => `
            <tr>
              <td>${emp.id}</td>
              <td>${emp.nome}</td>
              <td>${emp.cnpj || ''}</td>
              <td>${emp.endereco || ''}</td>
              <td>
                <button class="editEmpresa" data-id="${emp.id}">✏️</button>
                <button class="delEmpresa" data-id="${emp.id}">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.delEmpresa').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Remover empresa?')) {
          await apiRequest(`/empresas/${btn.dataset.id}`, 'DELETE');
          await carregarEmpresas();
          await carregarFuncionarios();
        }
      });
    });

    document.querySelectorAll('.editEmpresa').forEach(btn => {
      btn.addEventListener('click', async () => {
        const empresas = await apiRequest('/empresas');
        const emp = empresas.find(e => e.id == btn.dataset.id);
        mostrarFormEmpresa(emp);
      });
    });
  } catch (err) {
    console.error('Erro ao carregar empresas:', err);
    alert('Erro ao carregar empresas: ' + err.message);
  }
}

function mostrarFormEmpresa(emp = null) {
  const div = document.getElementById('empresaFormDiv');
  if (!div) return;

  div.style.display = 'block';
  div.innerHTML = `
    <h3>${emp ? 'Editar' : 'Nova'} Empresa</h3>
    <div class="form-group">
      <label>Nome *</label>
      <input type="text" id="empNome" value="${emp?.nome || ''}" autocomplete="off">
    </div>
    <div class="form-group">
      <label>CNPJ *</label>
      <input type="text" id="empCnpj" value="${emp?.cnpj || ''}" placeholder="00.000.000/0001-00">
      <small>Obrigatório e único</small>
    </div>
    <div class="form-group">
      <label>Endereço</label>
      <input type="text" id="empEnd" value="${emp?.endereco || ''}">
    </div>
    <button id="salvarEmpresaBtn">Salvar</button>
    <button id="cancelEmpBtn">Cancelar</button>
    <div id="empresaFormError" style="color:#dc2626; margin-top:0.8rem; font-size:0.9rem;"></div>
  `;

  const salvarBtn = document.getElementById('salvarEmpresaBtn');
  const cancelBtn = document.getElementById('cancelEmpBtn');
  const errorDiv = document.getElementById('empresaFormError');

  salvarBtn.onclick = async () => {
    // Validação
    const nome = document.getElementById('empNome').value.trim();
    const cnpj = document.getElementById('empCnpj').value.trim();

    if (!nome) {
      errorDiv.innerText = '❌ O campo Nome é obrigatório.';
      return;
    }
    if (!cnpj) {
      errorDiv.innerText = '❌ O campo CNPJ é obrigatório. Insira um CNPJ válido e único.';
      return;
    }

    const dados = {
      nome: nome,
      cnpj: cnpj,
      endereco: document.getElementById('empEnd').value
    };

    try {
      if (emp) {
        await apiRequest(`/empresas/${emp.id}`, 'PUT', dados);
      } else {
        await apiRequest('/empresas', 'POST', dados);
      }
      await carregarEmpresas();
      div.style.display = 'none';
      errorDiv.innerText = '';
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      // Mensagem amigável para violação de unicidade
      if (err.message.includes('duplicar valor da chave viola a restrição de unicidade') || err.message.includes('cnpj_key')) {
        errorDiv.innerText = '❌ Este CNPJ já está cadastrado. Informe um CNPJ diferente.';
      } else {
        errorDiv.innerText = `❌ Erro: ${err.message}`;
      }
    }
  };

  cancelBtn.onclick = () => {
    div.style.display = 'none';
    errorDiv.innerText = '';
  };
}

// Evento do botão "+ Nova Empresa"
const showAddEmpresaBtn = document.getElementById('showAddEmpresaBtn');
if (showAddEmpresaBtn) {
  const newBtn = showAddEmpresaBtn.cloneNode(true);
  showAddEmpresaBtn.parentNode.replaceChild(newBtn, showAddEmpresaBtn);
  newBtn.addEventListener('click', () => mostrarFormEmpresa(null));
}

// ==================== FUNCIONÁRIOS ====================
async function carregarFuncionarios() {
  try {
    const funcionarios = await apiRequest('/funcionarios');
    const div = document.getElementById('funcionariosList');
    if (!div) return;
    div.innerHTML = `
      <table>
        <thead>
          <tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>WhatsApp</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${funcionarios.map(f => `
            <tr>
              <td>${f.matricula}</td>
              <td>${f.nome}</td>
              <td>${f.empresa_nome}</td>
              <td>${f.whatsapp}</td>
              <td>
                <button class="editFunc" data-id="${f.id}">✏️</button>
                <button class="delFunc" data-id="${f.id}">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.delFunc').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Remover funcionário?')) {
          await apiRequest(`/funcionarios/${btn.dataset.id}`, 'DELETE');
          await carregarFuncionarios();
        }
      });
    });

    document.querySelectorAll('.editFunc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const funcs = await apiRequest('/funcionarios');
        const f = funcs.find(fx => fx.id == btn.dataset.id);
        mostrarFormFuncionario(f);
      });
    });
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar funcionários');
  }
}

function mostrarFormFuncionario(func = null) {
  const div = document.getElementById('funcionarioFormDiv');
  if (!div) return;
  div.style.display = 'block';
  (async () => {
    const empresas = await apiRequest('/empresas');
    div.innerHTML = `
      <h3>${func ? 'Editar' : 'Novo'} Funcionário</h3>
      <div class="form-group"><label>Matrícula *</label><input id="funcMatricula" value="${func?.matricula || ''}"></div>
      <div class="form-group"><label>Nome *</label><input id="funcNome" value="${func?.nome || ''}"></div>
      <div class="form-group"><label>Senha</label><input type="password" id="funcSenha" placeholder="Deixe em branco para manter a atual"></div>
      <div class="form-group"><label>WhatsApp *</label><input id="funcWhats" value="${func?.whatsapp || ''}" placeholder="5511999999999"></div>
      <div class="form-group"><label>Empresa *</label><select id="funcEmpresa">${empresas.map(e => `<option value="${e.id}" ${func && func.empresa_id === e.id ? 'selected' : ''}>${e.nome}</option>`).join('')}</select></div>
      <button id="salvarFuncBtn">Salvar</button>
      <button id="cancelFuncBtn">Cancelar</button>
      <div id="funcFormError" style="color:#dc2626; margin-top:0.5rem;"></div>
    `;

    const salvarBtn = document.getElementById('salvarFuncBtn');
    const cancelBtn = document.getElementById('cancelFuncBtn');
    const errorDiv = document.getElementById('funcFormError');

    salvarBtn.onclick = async () => {
      const matricula = document.getElementById('funcMatricula').value.trim();
      const nome = document.getElementById('funcNome').value.trim();
      const whatsapp = document.getElementById('funcWhats').value.trim();
      if (!matricula || !nome || !whatsapp) {
        errorDiv.innerText = 'Matrícula, Nome e WhatsApp são obrigatórios.';
        return;
      }
      const dados = {
        empresa_id: parseInt(document.getElementById('funcEmpresa').value),
        matricula,
        nome,
        senha: document.getElementById('funcSenha').value || (func ? undefined : '123'),
        whatsapp,
        ativo: true
      };
      try {
        if (func) {
          await apiRequest(`/funcionarios/${func.id}`, 'PUT', dados);
        } else {
          await apiRequest('/funcionarios', 'POST', dados);
        }
        await carregarFuncionarios();
        div.style.display = 'none';
      } catch (err) {
        errorDiv.innerText = err.message;
      }
    };
    cancelBtn.onclick = () => div.style.display = 'none';
  })();
}

document.getElementById('showAddFuncBtn')?.addEventListener('click', () => mostrarFormFuncionario(null));

// ==================== REGISTROS GERAIS ====================
async function carregarRegistros() {
  try {
    const registros = await apiRequest('/pontos/todos');
    const container = document.getElementById('todosRegistrosTabela');
    if (!container) return;
    container.innerHTML = `
      <table>
        <thead><tr><th>Data</th><th>Hora</th><th>Funcionário</th><th>Empresa</th><th>Tipo</th></tr></thead>
        <tbody>
          ${registros.map(r => `
            <tr>
              <td>${r.data}</td>
              <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
              <td>${r.funcionario_nome}</td>
              <td>${r.empresa_nome}</td>
              <td>${r.tipo}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
  }
}

// ==================== RELATÓRIOS ====================
async function carregarRelatoriosFiltros() {
  try {
    const empresas = await apiRequest('/empresas');
    const selectEmp = document.getElementById('relEmpresa');
    selectEmp.innerHTML = '<option value="">Todas empresas</option>' + empresas.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
    selectEmp.onchange = () => carregarFuncionariosFiltro();
    await carregarFuncionariosFiltro();
  } catch (err) { console.error(err); }
}

async function carregarFuncionariosFiltro() {
  const empresaId = document.getElementById('relEmpresa').value;
  let funcs = await apiRequest('/funcionarios');
  if (empresaId) funcs = funcs.filter(f => f.empresa_id == empresaId);
  const selectFunc = document.getElementById('relFuncionario');
  selectFunc.innerHTML = '<option value="">Todos funcionários</option>' + funcs.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
}

document.getElementById('gerarRelatorioBtn')?.addEventListener('click', async () => {
  const params = new URLSearchParams();
  if (document.getElementById('relEmpresa').value) params.append('empresa_id', document.getElementById('relEmpresa').value);
  if (document.getElementById('relFuncionario').value) params.append('funcionario_id', document.getElementById('relFuncionario').value);
  if (document.getElementById('relDataInicio').value) params.append('data_inicio', document.getElementById('relDataInicio').value);
  if (document.getElementById('relDataFim').value) params.append('data_fim', document.getElementById('relDataFim').value);
  const relatorio = await apiRequest(`/relatorios/horas?${params.toString()}`);
  document.getElementById('relatorioResultado').innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Funcionário</th><th>Início Turno</th><th>Fim Turno</th><th>Horas Trabalhadas</th></tr></thead>
      <tbody>
        ${relatorio.map(r => `
          <tr>
            <td>${r.data}</td>
            <td>${r.nome}</td>
            <td>${r.inicio_turno ? new Date(r.inicio_turno).toLocaleTimeString() : '--'}</td>
            <td>${r.fim_turno ? new Date(r.fim_turno).toLocaleTimeString() : '--'}</td>
            <td>${r.horas_trabalhadas || '--'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
});

// ==================== DASHBOARD ====================
async function atualizarDashboard() {
  try {
    const dash = await apiRequest('/relatorios/dashboard');
    document.getElementById('dashboardCards').innerHTML = `
      <div class="dash-card"><h4>Empresas</h4><div class="number">${dash.total_empresas}</div></div>
      <div class="dash-card"><h4>Funcionários</h4><div class="number">${dash.total_funcionarios}</div></div>
      <div class="dash-card"><h4>Batidas Hoje</h4><div class="number">${dash.batidas_hoje}</div></div>
    `;
    document.getElementById('ultimosPontosDashboard').innerHTML = `
      <ul>${dash.ultimos_pontos.map(p => `<li>${new Date(p.timestamp).toLocaleString()} - ${p.nome} (${p.empresa}) - ${p.tipo}</li>`).join('')}</ul>
    `;
  } catch (err) { console.error(err); }
}

// ==================== FUNCIONÁRIO - PONTO ====================
let relogioInterval;

async function atualizarInterfacePonto() {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  const funcId = loggedUser.funcionarioId;
  const funcData = (await apiRequest('/funcionarios')).find(f => f.id == funcId);
  const empresaNome = (await apiRequest('/empresas')).find(e => e.id == funcData.empresa_id)?.nome;
  document.getElementById('funcNomeEmpresa').innerHTML = `<strong>${funcData.nome}</strong> (${empresaNome})`;
  if (relogioInterval) clearInterval(relogioInterval);
  relogioInterval = setInterval(() => { document.getElementById('relogioAtual').innerText = new Date().toLocaleTimeString(); }, 1000);
  await atualizarStatusBotoes(funcId);
  await carregarRegistrosHoje(funcId);
}

async function atualizarStatusBotoes(funcId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const pontos = await apiRequest(`/pontos/funcionario/${funcId}?inicio=${hoje}&fim=${hoje}`);
  const tipos = pontos.map(p => p.tipo);
  const pode = (tipo) => {
    if (tipos.includes('fim_turno')) return false;
    if (tipo === 'inicio_turno') return !tipos.includes('inicio_turno');
    if (tipo === 'inicio_intervalo') return tipos.includes('inicio_turno') && !tipos.includes('inicio_intervalo');
    if (tipo === 'fim_intervalo') return tipos.includes('inicio_intervalo') && !tipos.includes('fim_intervalo');
    if (tipo === 'fim_turno') return tipos.includes('inicio_turno') && (!tipos.includes('inicio_intervalo') || tipos.includes('fim_intervalo')) && !tipos.includes('fim_turno');
    return false;
  };
  document.getElementById('btnInicioTurno').disabled = !pode('inicio_turno');
  document.getElementById('btnInicioIntervalo').disabled = !pode('inicio_intervalo');
  document.getElementById('btnFimIntervalo').disabled = !pode('fim_intervalo');
  document.getElementById('btnFimTurno').disabled = !pode('fim_turno');
  const msgDiv = document.getElementById('statusPontoMsg');
  if (tipos.includes('fim_turno')) msgDiv.innerHTML = "✅ Jornada finalizada hoje.";
  else msgDiv.innerHTML = "📌 Botões habilitados conforme ordem da jornada.";
}

async function carregarRegistrosHoje(funcId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const pontos = await apiRequest(`/pontos/funcionario/${funcId}?inicio=${hoje}&fim=${hoje}`);
  const div = document.getElementById('meusRegistrosHoje');
  if (!pontos.length) div.innerHTML = "Nenhum registro hoje.";
  else {
    div.innerHTML = `
      <table>
        <thead><tr><th>Tipo</th><th>Horário</th></tr></thead>
        <tbody>
          ${pontos.map(p => `<tr><td>${p.tipo}</td><td>${new Date(p.timestamp).toLocaleTimeString()}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }
}

async function carregarMeusRegistrosHistorico() {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}`);
  document.getElementById('historicoPessoal').innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Horário</th></tr></thead>
      <tbody>
        ${pontos.map(p => `<tr><td>${p.data}</td><td>${p.tipo}</td><td>${new Date(p.timestamp).toLocaleTimeString()}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function registrarPontoCliente(tipo) {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  try {
    await apiRequest('/pontos/registrar', 'POST', { funcionarioId: loggedUser.funcionarioId, tipo });
    alert(`${tipo} registrado com sucesso!`);
    if (tipo === 'fim_turno') {
      const funcData = (await apiRequest('/funcionarios')).find(f => f.id == loggedUser.funcionarioId);
      if (funcData.whatsapp) {
        const hoje = new Date().toISOString().slice(0, 10);
        const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}?inicio=${hoje}&fim=${hoje}`);
        let msg = `Resumo do ponto - ${hoje}\n`;
        pontos.forEach(p => msg += `${p.tipo}: ${new Date(p.timestamp).toLocaleTimeString()}\n`);
        window.open(`https://wa.me/${funcData.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      } else alert('WhatsApp não cadastrado');
    }
    await atualizarInterfacePonto();
    await carregarMeusRegistrosHistorico();
  } catch (err) {
    alert(err.message);
  }
}

// Eventos dos botões de ponto
document.getElementById('btnInicioTurno')?.addEventListener('click', () => registrarPontoCliente('inicio_turno'));
document.getElementById('btnInicioIntervalo')?.addEventListener('click', () => registrarPontoCliente('inicio_intervalo'));
document.getElementById('btnFimIntervalo')?.addEventListener('click', () => registrarPontoCliente('fim_intervalo'));
document.getElementById('btnFimTurno')?.addEventListener('click', () => registrarPontoCliente('fim_turno'));
document.getElementById('btnReenviarWhats')?.addEventListener('click', async () => {
  if (loggedUser?.tipo === 'func') {
    const funcData = (await apiRequest('/funcionarios')).find(f => f.id == loggedUser.funcionarioId);
    const hoje = new Date().toISOString().slice(0, 10);
    const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}?inicio=${hoje}&fim=${hoje}`);
    let msg = `Resumo do ponto - ${hoje}\n`;
    pontos.forEach(p => msg += `${p.tipo}: ${new Date(p.timestamp).toLocaleTimeString()}\n`);
    window.open(`https://wa.me/${funcData.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }
});

// ==================== LOGIN ====================
document.getElementById('doLoginBtn').addEventListener('click', async () => {
  const matricula = document.getElementById('loginMatricula').value.trim();
  const senha = document.getElementById('loginSenha').value;
  try {
    const resp = await apiRequest('/auth/login', 'POST', { matricula, senha });
    loggedUser = resp;
    renderByRole();
    document.getElementById('loginError').innerText = '';
  } catch (err) {
    document.getElementById('loginError').innerText = err.message;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  loggedUser = null;
  renderByRole();
});

// Inicialização
renderByRole();