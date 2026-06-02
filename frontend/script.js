// ==================== CONFIGURAÇÕES GLOBAIS ====================
const API_URL = 'http://localhost:3000/api';
let loggedUser = null;
let ultimoRelatorioData = []; // guarda último relatório gerado para exportar

// ==================== FUNÇÃO DE REQUISIÇÃO ====================
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (!response.ok) {
    let errorMessage = 'Erro na requisição';
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || JSON.stringify(error);
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// ==================== CONTROLE DE PÁGINAS (NAVEGAÇÃO) ====================
function showPage(pageId) {
  const allPages = document.querySelectorAll('.page');
  allPages.forEach(page => page.classList.remove('active-page'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
  else console.error(`Página ${pageId} não encontrada`);
}

// ==================== RENDERIZAÇÃO DA INTERFACE ====================
async function renderByRole() {
  const navDiv = document.getElementById('navMenu');
  if (!loggedUser) {
    showPage('loginPage');
    navDiv.style.display = 'none';
    document.getElementById('userNameDisplay').innerText = 'Não logado';
    document.getElementById('logoutBtn').style.display = 'none';
    return;
  }

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
      <button class="nav-btn" data-page="configuracoesPage">⚙️ Configurações</button>
    `;
    // Adiciona eventos de navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.removeEventListener('click', navClickHandler);
      btn.addEventListener('click', navClickHandler);
    });
    showPage('empresasPage');
    await carregarEmpresas();
    await carregarFuncionarios();
    await carregarRegistros();
    await atualizarDashboard();
    await carregarRelatoriosFiltros();
    await carregarConfiguracoes();
  } else {
    document.getElementById('userNameDisplay').innerText = `🧑‍💼 ${loggedUser.nome || 'Funcionário'}`;
    navDiv.innerHTML = `
      <button class="nav-btn" data-page="pontoFuncPage">⏱️ Bater Ponto</button>
      <button class="nav-btn" data-page="meusRegistrosFuncPage">📜 Meus Registros</button>
    `;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.removeEventListener('click', navClickHandler);
      btn.addEventListener('click', navClickHandler);
    });
    showPage('pontoFuncPage');
    await atualizarInterfacePonto();
    await carregarMeusRegistrosHistorico();
  }
}

async function navClickHandler(e) {
  const pageId = e.currentTarget.getAttribute('data-page');
  showPage(pageId);
  // Recarregar dados da página selecionada
  switch (pageId) {
    case 'empresasPage': await carregarEmpresas(); break;
    case 'funcionariosPage': await carregarFuncionarios(); break;
    case 'registrosPage': await carregarRegistros(); break;
    case 'dashboardPage': await atualizarDashboard(); break;
    case 'relatoriosPage':
      await carregarRelatoriosFiltros();
      document.getElementById('gerarRelatorioBtn')?.click();
      break;
    case 'configuracoesPage': await carregarConfiguracoes(); break;
    case 'meusRegistrosFuncPage': await carregarMeusRegistrosHistorico(); break;
    case 'pontoFuncPage': await atualizarInterfacePonto(); break;
  }
}

// ==================== EMPRESAS ====================
async function carregarEmpresas() {
  try {
    const empresas = await apiRequest('/empresas');
    const div = document.getElementById('empresasList');
    if (!div) return;
    div.innerHTML = `
      <table border="1" cellpadding="8" style="width:100%">
        <thead><tr><th>ID</th><th>Nome</th><th>CNPJ</th><th>Endereço</th><th>Jornada (h)</th><th>Ações</th></tr></thead>
        <tbody>
          ${empresas.map(emp => `
            <tr>
              <td>${emp.id}</td>
              <td>${escapeHtml(emp.nome)}</td>
              <td>${escapeHtml(emp.cnpj || '')}</td>
              <td>${escapeHtml(emp.endereco || '')}</td>
              <td>${emp.jornada_diaria_horas || 8.0}</td>
              <td><button class="editEmpresa" data-id="${emp.id}">✏️</button> <button class="delEmpresa" data-id="${emp.id}">🗑️</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    attachEmpresaEvents();
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar empresas: ' + err.message);
  }
}

function attachEmpresaEvents() {
  document.querySelectorAll('.delEmpresa').forEach(btn => {
    btn.removeEventListener('click', handleDeleteEmpresa);
    btn.addEventListener('click', handleDeleteEmpresa);
  });
  document.querySelectorAll('.editEmpresa').forEach(btn => {
    btn.removeEventListener('click', handleEditEmpresa);
    btn.addEventListener('click', handleEditEmpresa);
  });
}

async function handleDeleteEmpresa(e) {
  const id = e.currentTarget.dataset.id;
  if (confirm('Remover empresa? Isso também removerá seus funcionários e registros.')) {
    await apiRequest(`/empresas/${id}`, 'DELETE');
    await carregarEmpresas();
    await carregarFuncionarios();
  }
}

async function handleEditEmpresa(e) {
  const id = e.currentTarget.dataset.id;
  const empresas = await apiRequest('/empresas');
  const emp = empresas.find(e => e.id == id);
  mostrarFormEmpresa(emp);
}

function mostrarFormEmpresa(emp = null) {
  const div = document.getElementById('empresaFormDiv');
  if (!div) return;
  div.style.display = 'block';
  div.innerHTML = `
    <h3>${emp ? 'Editar' : 'Nova'} Empresa</h3>
    <div class="form-group"><label>Nome *</label><input id="empNome" value="${escapeHtml(emp?.nome || '')}"></div>
    <div class="form-group"><label>CNPJ *</label><input id="empCnpj" value="${escapeHtml(emp?.cnpj || '')}"></div>
    <div class="form-group"><label>Endereço</label><input id="empEnd" value="${escapeHtml(emp?.endereco || '')}"></div>
    <div class="form-group"><label>Jornada diária (horas)</label><input type="number" step="0.5" id="empJornada" value="${emp?.jornada_diaria_horas || 8.0}"></div>
    <button id="salvarEmpresaBtn">Salvar</button>
    <button id="cancelEmpBtn">Cancelar</button>
    <div id="empresaFormError" style="color:red"></div>
  `;
  const salvarBtn = document.getElementById('salvarEmpresaBtn');
  const cancelBtn = document.getElementById('cancelEmpBtn');
  const errorDiv = document.getElementById('empresaFormError');

  salvarBtn.onclick = async () => {
    const nome = document.getElementById('empNome').value.trim();
    const cnpj = document.getElementById('empCnpj').value.trim();
    const jornada = parseFloat(document.getElementById('empJornada').value);
    if (!nome || !cnpj) {
      errorDiv.innerText = 'Nome e CNPJ são obrigatórios';
      return;
    }
    if (isNaN(jornada) || jornada <= 0) {
      errorDiv.innerText = 'Jornada diária deve ser um número positivo';
      return;
    }
    const dados = {
      nome,
      cnpj,
      endereco: document.getElementById('empEnd').value,
      jornada_diaria_horas: jornada
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
      errorDiv.innerText = err.message;
    }
  };
  cancelBtn.onclick = () => {
    div.style.display = 'none';
    errorDiv.innerText = '';
  };
}

// ==================== FUNCIONÁRIOS ====================
async function carregarFuncionarios() {
  try {
    const funcionarios = await apiRequest('/funcionarios');
    const div = document.getElementById('funcionariosList');
    if (!div) return;
    div.innerHTML = `
      <table border="1" cellpadding="8" style="width:100%">
        <thead>
          <tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>WhatsApp</th><th>Status</th><th>Férias</th><th>Hora Extra</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${funcionarios.map(f => {
            let feriasTexto = '';
            if (f.status === 'ferias' && f.ferias_inicio && f.ferias_fim) {
              feriasTexto = `${f.ferias_inicio} a ${f.ferias_fim}`;
            } else if (f.status === 'ferias') {
              feriasTexto = 'Período não definido';
            } else {
              feriasTexto = '-';
            }
            let statusTexto = '';
            if (f.status === 'ativo') statusTexto = '✅ Ativo';
            else if (f.status === 'ferias') statusTexto = '🏖️ Férias';
            else statusTexto = '❌ Desligado';
            let horaExtraTexto = f.permite_hora_extra ? '✅ Permite' : '❌ Não permite';
            return `
              <tr>
                <td>${escapeHtml(f.matricula)}</td>
                <td>${escapeHtml(f.nome)}</td>
                <td>${escapeHtml(f.empresa_nome)}</td>
                <td>${escapeHtml(f.whatsapp)}</td>
                <td>${statusTexto}</td>
                <td>${feriasTexto}</td>
                <td>${horaExtraTexto}</td>
                <td><button class="editFunc" data-id="${f.id}">✏️</button> <button class="delFunc" data-id="${f.id}">🗑️</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    attachFuncionarioEvents();
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar funcionários: ' + err.message);
  }
}

function attachFuncionarioEvents() {
  document.querySelectorAll('.delFunc').forEach(btn => {
    btn.removeEventListener('click', handleDeleteFunc);
    btn.addEventListener('click', handleDeleteFunc);
  });
  document.querySelectorAll('.editFunc').forEach(btn => {
    btn.removeEventListener('click', handleEditFunc);
    btn.addEventListener('click', handleEditFunc);
  });
}

async function handleDeleteFunc(e) {
  const id = e.currentTarget.dataset.id;
  if (confirm('Remover funcionário?')) {
    await apiRequest(`/funcionarios/${id}`, 'DELETE');
    await carregarFuncionarios();
  }
}

async function handleEditFunc(e) {
  const id = e.currentTarget.dataset.id;
  const funcs = await apiRequest('/funcionarios');
  const f = funcs.find(fx => fx.id == id);
  mostrarFormFuncionario(f);
}

function mostrarFormFuncionario(func = null) {
  const div = document.getElementById('funcionarioFormDiv');
  if (!div) return;
  div.style.display = 'block';
  (async () => {
    const empresas = await apiRequest('/empresas');
    const statusAtual = func?.status || 'ativo';
    const feriasInicio = func?.ferias_inicio || '';
    const feriasFim = func?.ferias_fim || '';
    const permiteHoraExtra = func?.permite_hora_extra !== undefined ? func.permite_hora_extra : true;
    div.innerHTML = `
      <h3>${func ? 'Editar' : 'Novo'} Funcionário</h3>
      <div class="form-group"><label>Matrícula *</label><input id="funcMatricula" value="${escapeHtml(func?.matricula || '')}"></div>
      <div class="form-group"><label>Nome *</label><input id="funcNome" value="${escapeHtml(func?.nome || '')}"></div>
      <div class="form-group"><label>Senha</label><input type="password" id="funcSenha" placeholder="Deixe em branco para manter"></div>
      <div class="form-group"><label>WhatsApp *</label><input id="funcWhats" value="${escapeHtml(func?.whatsapp || '')}"></div>
      <div class="form-group"><label>Empresa *</label><select id="funcEmpresa">
        ${empresas.map(e => `<option value="${e.id}" ${func && func.empresa_id === e.id ? 'selected' : ''}>${escapeHtml(e.nome)}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Status</label>
        <select id="funcStatus">
          <option value="ativo" ${statusAtual === 'ativo' ? 'selected' : ''}>Ativo</option>
          <option value="ferias" ${statusAtual === 'ferias' ? 'selected' : ''}>Férias</option>
          <option value="desligado" ${statusAtual === 'desligado' ? 'selected' : ''}>Desligado</option>
        </select>
      </div>
      <div id="feriasPeriodo" style="display: ${statusAtual === 'ferias' ? 'block' : 'none'};">
        <div class="form-group"><label>Início das férias</label><input type="date" id="funcFeriasInicio" value="${feriasInicio}"></div>
        <div class="form-group"><label>Fim das férias</label><input type="date" id="funcFeriasFim" value="${feriasFim}"></div>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="funcPermiteHoraExtra" ${permiteHoraExtra ? 'checked' : ''}> Permite horas extras</label>
        <small>Desmarque se o funcionário não tem direito a horas extras (ex: vendedores comissionados)</small>
      </div>
      <button id="salvarFuncBtn">Salvar</button>
      <button id="cancelFuncBtn">Cancelar</button>
      <div id="funcFormError" style="color:red"></div>
    `;
    const statusSelect = document.getElementById('funcStatus');
    const feriasDiv = document.getElementById('feriasPeriodo');
    statusSelect.addEventListener('change', () => {
      feriasDiv.style.display = statusSelect.value === 'ferias' ? 'block' : 'none';
    });
    document.getElementById('salvarFuncBtn').onclick = async () => {
      const matricula = document.getElementById('funcMatricula').value.trim();
      const nome = document.getElementById('funcNome').value.trim();
      const whatsapp = document.getElementById('funcWhats').value.trim();
      const status = document.getElementById('funcStatus').value;
      if (!matricula || !nome || !whatsapp) {
        document.getElementById('funcFormError').innerText = 'Matrícula, Nome e WhatsApp são obrigatórios';
        return;
      }
      const dados = {
        empresa_id: parseInt(document.getElementById('funcEmpresa').value),
        matricula,
        nome,
        senha: document.getElementById('funcSenha').value || (func ? undefined : '123'),
        whatsapp,
        ativo: true,
        status,
        permite_hora_extra: document.getElementById('funcPermiteHoraExtra').checked
      };
      if (status === 'ferias') {
        dados.ferias_inicio = document.getElementById('funcFeriasInicio').value || null;
        dados.ferias_fim = document.getElementById('funcFeriasFim').value || null;
      } else {
        dados.ferias_inicio = null;
        dados.ferias_fim = null;
      }
      try {
        if (func) {
          await apiRequest(`/funcionarios/${func.id}`, 'PUT', dados);
        } else {
          await apiRequest('/funcionarios', 'POST', dados);
        }
        await carregarFuncionarios();
        div.style.display = 'none';
      } catch (err) {
        document.getElementById('funcFormError').innerText = err.message;
      }
    };
    document.getElementById('cancelFuncBtn').onclick = () => {
      div.style.display = 'none';
    };
  })();
}

// ==================== REGISTROS GERAIS ====================
async function carregarRegistros() {
  try {
    const registros = await apiRequest('/pontos/todos');
    const container = document.getElementById('todosRegistrosTabela');
    if (!container) return;
    container.innerHTML = `
      <table border="1" cellpadding="8" style="width:100%">
        <thead><tr><th>Data</th><th>Hora</th><th>Funcionário</th><th>Empresa</th><th>Tipo</th></tr></thead>
        <tbody>
          ${registros.map(r => `
            <tr>
              <td>${r.data}</td>
              <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
              <td>${escapeHtml(r.funcionario_nome)}</td>
              <td>${escapeHtml(r.empresa_nome)}</td>
              <td>${r.tipo}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar registros: ' + err.message);
  }
}

// ==================== RELATÓRIOS + IMPRESSÃO + EXCEL ====================
async function carregarRelatoriosFiltros() {
  try {
    const empresas = await apiRequest('/empresas');
    const selectEmp = document.getElementById('relEmpresa');
    if (!selectEmp) return;
    selectEmp.innerHTML = '<option value="">Todas empresas</option>' +
      empresas.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('');
    selectEmp.onchange = () => carregarFuncionariosFiltro();
    await carregarFuncionariosFiltro();
  } catch (err) {
    console.error(err);
  }
}

async function carregarFuncionariosFiltro() {
  try {
    const empresaId = document.getElementById('relEmpresa').value;
    let funcs = await apiRequest('/funcionarios');
    if (empresaId) funcs = funcs.filter(f => f.empresa_id == empresaId);
    const selectFunc = document.getElementById('relFuncionario');
    if (selectFunc) {
      selectFunc.innerHTML = '<option value="">Todos funcionários</option>' +
        funcs.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function gerarRelatorioHTML() {
  const params = new URLSearchParams();
  const empId = document.getElementById('relEmpresa').value;
  const funcId = document.getElementById('relFuncionario').value;
  const dataInicio = document.getElementById('relDataInicio').value;
  const dataFim = document.getElementById('relDataFim').value;
  if (empId) params.append('empresa_id', empId);
  if (funcId) params.append('funcionario_id', funcId);
  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);

  const relatorio = await apiRequest(`/relatorios/horas?${params.toString()}`);
  ultimoRelatorioData = relatorio; // guarda para exportar
  let html = `
    <h2>Relatório de Horas Trabalhadas</h2>
    <p>Período: ${dataInicio || 'início'} a ${dataFim || 'fim'}</p>
    <table border="1" cellpadding="8" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr><th>Data</th><th>Funcionário</th><th>Início Turno</th><th>Fim Turno</th><th>Horas Trabalhadas</th><th>Horas Extras</th></tr>
      </thead>
      <tbody>
  `;
  relatorio.forEach(r => {
    html += `
      <tr>
        <td>${r.data}</td>
        <td>${escapeHtml(r.nome)}</td>
        <td>${r.inicio_turno ? new Date(r.inicio_turno).toLocaleTimeString() : '--'}</td>
        <td>${r.fim_turno ? new Date(r.fim_turno).toLocaleTimeString() : '--'}</td>
        <td>${r.horas_trabalhadas !== null ? r.horas_trabalhadas : '--'}</td>
        <td>${r.horas_extras !== null && r.horas_extras > 0 ? r.horas_extras : '--'}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  return html;
}

// Evento Gerar Relatório
document.getElementById('gerarRelatorioBtn')?.addEventListener('click', async () => {
  try {
    const html = await gerarRelatorioHTML();
    document.getElementById('relatorioResultado').innerHTML = html;
  } catch (err) {
    alert('Erro ao gerar relatório: ' + err.message);
  }
});

// Evento Imprimir
document.getElementById('imprimirRelatorioBtn')?.addEventListener('click', async () => {
  try {
    const html = await gerarRelatorioHTML();
    const win = window.open();
    win.document.write(`
      <html>
        <head>
          <title>Relatório de Ponto</title>
          <style>
            body { font-family: Arial; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.print();
  } catch (err) {
    alert('Erro ao imprimir: ' + err.message);
  }
});

// Função para exportar para Excel
function exportarParaExcel() {
  if (!ultimoRelatorioData || ultimoRelatorioData.length === 0) {
    alert('Nenhum dado para exportar. Gere um relatório primeiro.');
    return;
  }
  const dados = ultimoRelatorioData.map(item => ({
    'Data': item.data,
    'Funcionário': item.nome,
    'Início Turno': item.inicio_turno ? new Date(item.inicio_turno).toLocaleTimeString() : '--',
    'Fim Turno': item.fim_turno ? new Date(item.fim_turno).toLocaleTimeString() : '--',
    'Horas Trabalhadas': item.horas_trabalhadas !== null ? item.horas_trabalhadas : '--',
    'Horas Extras': (item.horas_extras !== null && item.horas_extras > 0) ? item.horas_extras : '--'
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatorio_Ponto');
  const nomeArquivo = `relatorio_ponto_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
document.getElementById('exportarExcelBtn')?.addEventListener('click', exportarParaExcel);

// ==================== DASHBOARD ====================
async function atualizarDashboard() {
  try {
    const dash = await apiRequest('/relatorios/dashboard');
    const cardsDiv = document.getElementById('dashboardCards');
    if (cardsDiv) {
      cardsDiv.innerHTML = `
        <div class="dash-card"><h4>Empresas</h4><div class="number">${dash.total_empresas}</div></div>
        <div class="dash-card"><h4>Funcionários</h4><div class="number">${dash.total_funcionarios}</div></div>
        <div class="dash-card"><h4>Batidas Hoje</h4><div class="number">${dash.batidas_hoje}</div></div>
      `;
    }
    const ultimosDiv = document.getElementById('ultimosPontosDashboard');
    if (ultimosDiv) {
      ultimosDiv.innerHTML = `<ul>${dash.ultimos_pontos.map(p => `<li>${new Date(p.timestamp).toLocaleString()} - ${p.nome} (${p.empresa}) - ${p.tipo}</li>`).join('')}</ul>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ==================== CONFIGURAÇÕES ====================
async function carregarConfiguracoes() {
  try {
    const config = await apiRequest('/configuracoes');
    document.getElementById('cfg_inicio_turno').checked = config.logout_inicio_turno || false;
    document.getElementById('cfg_inicio_intervalo').checked = config.logout_inicio_intervalo || false;
    document.getElementById('cfg_fim_intervalo').checked = config.logout_fim_intervalo || false;
    document.getElementById('cfg_fim_turno').checked = config.logout_fim_turno || false;
  } catch (err) {
    console.error(err);
  }
}
document.getElementById('salvarConfigBtn')?.addEventListener('click', async () => {
  const configs = [
    { chave: 'logout_inicio_turno', valor: document.getElementById('cfg_inicio_turno').checked },
    { chave: 'logout_inicio_intervalo', valor: document.getElementById('cfg_inicio_intervalo').checked },
    { chave: 'logout_fim_intervalo', valor: document.getElementById('cfg_fim_intervalo').checked },
    { chave: 'logout_fim_turno', valor: document.getElementById('cfg_fim_turno').checked }
  ];
  try {
    for (const cfg of configs) {
      await apiRequest(`/configuracoes/${cfg.chave}`, 'PUT', { valor: cfg.valor });
    }
    const msgDiv = document.getElementById('configMsg');
    if (msgDiv) {
      msgDiv.innerHTML = '<span style="color:green">✅ Configurações salvas com sucesso!</span>';
      setTimeout(() => msgDiv.innerHTML = '', 3000);
    }
  } catch (err) {
    alert('Erro ao salvar configurações: ' + err.message);
  }
});

// ==================== FUNCIONÁRIO - PONTO ====================
let relogioInterval;

async function atualizarInterfacePonto() {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  const funcId = loggedUser.funcionarioId;
  try {
    const funcs = await apiRequest('/funcionarios');
    const funcData = funcs.find(f => f.id == funcId);
    if (!funcData) throw new Error('Funcionário não encontrado');
    const empresas = await apiRequest('/empresas');
    const empresaNome = empresas.find(e => e.id == funcData.empresa_id)?.nome || '';
    const nomeDiv = document.getElementById('funcNomeEmpresa');
    if (nomeDiv) nomeDiv.innerHTML = `<strong>${escapeHtml(funcData.nome)}</strong> (${escapeHtml(empresaNome)})`;
    if (relogioInterval) clearInterval(relogioInterval);
    const relogioEl = document.getElementById('relogioAtual');
    if (relogioEl) {
      relogioInterval = setInterval(() => {
        relogioEl.innerText = new Date().toLocaleTimeString();
      }, 1000);
    }
    await atualizarStatusBotoes(funcId);
    await carregarRegistrosHoje(funcId);
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar interface de ponto: ' + err.message);
  }
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
  if (msgDiv) {
    if (tipos.includes('fim_turno')) msgDiv.innerHTML = "✅ Jornada finalizada hoje.";
    else msgDiv.innerHTML = "📌 Botões habilitados conforme ordem.";
  }
}

async function carregarRegistrosHoje(funcId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const pontos = await apiRequest(`/pontos/funcionario/${funcId}?inicio=${hoje}&fim=${hoje}`);
  const div = document.getElementById('meusRegistrosHoje');
  if (!div) return;
  if (!pontos.length) {
    div.innerHTML = "Nenhum registro hoje.";
    return;
  }
  div.innerHTML = `
    <table border="1" cellpadding="8" style="width:100%">
      <thead><tr><th>Tipo</th><th>Horário</th></tr></thead>
      <tbody>
        ${pontos.map(p => `<tr><td>${p.tipo}</td><td>${new Date(p.timestamp).toLocaleTimeString()}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function carregarMeusRegistrosHistorico() {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  try {
    const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}`);
    const div = document.getElementById('historicoPessoal');
    if (!div) return;
    div.innerHTML = `
      <table border="1" cellpadding="8" style="width:100%">
        <thead><tr><th>Data</th><th>Tipo</th><th>Horário</th></tr></thead>
        <tbody>
          ${pontos.map(p => `<tr><td>${p.data}</td><td>${p.tipo}</td><td>${new Date(p.timestamp).toLocaleTimeString()}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar histórico: ' + err.message);
  }
}

async function registrarPontoCliente(tipo) {
  if (!loggedUser || loggedUser.tipo !== 'func') return;
  try {
    const resp = await apiRequest('/pontos/registrar', 'POST', { funcionarioId: loggedUser.funcionarioId, tipo });
    alert(`${tipo} registrado com sucesso!`);
    if (tipo === 'fim_turno') {
      const funcs = await apiRequest('/funcionarios');
      const funcData = funcs.find(f => f.id == loggedUser.funcionarioId);
      if (funcData && funcData.whatsapp) {
        const hoje = new Date().toISOString().slice(0, 10);
        const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}?inicio=${hoje}&fim=${hoje}`);
        let msg = `Resumo do ponto - ${hoje}\n`;
        pontos.forEach(p => msg += `${p.tipo}: ${new Date(p.timestamp).toLocaleTimeString()}\n`);
        const numero = funcData.whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        alert('WhatsApp não cadastrado para este funcionário.');
      }
    }
    if (resp.logout) {
      alert('⚠️ Você será desconectado conforme configuração do sistema.');
      loggedUser = null;
      renderByRole();
    } else {
      await atualizarInterfacePonto();
      await carregarMeusRegistrosHistorico();
    }
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
    const funcs = await apiRequest('/funcionarios');
    const funcData = funcs.find(f => f.id == loggedUser.funcionarioId);
    const hoje = new Date().toISOString().slice(0, 10);
    const pontos = await apiRequest(`/pontos/funcionario/${loggedUser.funcionarioId}?inicio=${hoje}&fim=${hoje}`);
    let msg = `Resumo do ponto - ${hoje}\n`;
    pontos.forEach(p => msg += `${p.tipo}: ${new Date(p.timestamp).toLocaleTimeString()}\n`);
    if (funcData && funcData.whatsapp) {
      window.open(`https://wa.me/${funcData.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      alert('WhatsApp não cadastrado.');
    }
  }
});

// ==================== LOGIN / LOGOUT ====================
document.getElementById('doLoginBtn')?.addEventListener('click', async () => {
  const matricula = document.getElementById('loginMatricula').value.trim();
  const senha = document.getElementById('loginSenha').value;
  if (!matricula || !senha) {
    document.getElementById('loginError').innerText = 'Preencha matrícula e senha.';
    return;
  }
  try {
    const resp = await apiRequest('/auth/login', 'POST', { matricula, senha });
    loggedUser = resp;
    renderByRole();
    document.getElementById('loginError').innerText = '';
  } catch (err) {
    document.getElementById('loginError').innerText = err.message;
  }
});
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  loggedUser = null;
  renderByRole();
});

// ==================== UTILITÁRIOS ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  renderByRole();
  const showAddEmpresaBtn = document.getElementById('showAddEmpresaBtn');
  if (showAddEmpresaBtn) {
    const newBtn = showAddEmpresaBtn.cloneNode(true);
    showAddEmpresaBtn.parentNode.replaceChild(newBtn, showAddEmpresaBtn);
    newBtn.addEventListener('click', () => mostrarFormEmpresa(null));
  }
  const showAddFuncBtn = document.getElementById('showAddFuncBtn');
  if (showAddFuncBtn) {
    const newFuncBtn = showAddFuncBtn.cloneNode(true);
    showAddFuncBtn.parentNode.replaceChild(newFuncBtn, showAddFuncBtn);
    newFuncBtn.addEventListener('click', () => mostrarFormFuncionario(null));
  }
});