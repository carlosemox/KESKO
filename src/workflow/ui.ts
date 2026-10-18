import type { FastifyInstance } from "fastify";
import { isLocalRequest } from "../http/local-boundary.js";

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KESKO · Fluxo de desenvolvimento</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/workflow/style.css"><script src="/workflow/app.js" defer></script></head>
<body><main><header><p>KESKO / DESENVOLVIMENTO</p><h1>Do briefing à entrega</h1>
<p class="notice">Somente ambiente local. Use uma identidade local de desenvolvimento, nunca credenciais reais. PRD preliminar gerado a partir do briefing; não é aprovação por IA. Etapas externas dependem de executores ainda indisponíveis.</p></header>
<form id="context"><fieldset id="context-fields"><legend>Comece por aqui</legend><p>Você pode começar contando sua ideia. Esta versão é uma demonstração local e usa dados sintéticos.</p><button>Começar entrevista</button><details><summary>Configuração técnica (somente demonstração)</summary><p>Não é necessário entender estes campos para usar a entrevista.</p><label for="tenant">Tenant UUID</label><input id="tenant" required autocomplete="off"><label for="actor">Usuário UUID · Bearer local:UUID</label><input id="actor" required autocomplete="off"></details></fieldset></form>
<p id="status" role="status" aria-live="polite" aria-atomic="true">Informe tenant e usuário locais para começar.</p><button id="retry" hidden>Repetir a mesma operação</button>
<div class="layout"><aside aria-label="Projetos"><h2>Projetos e mudanças</h2><button id="new" disabled>Novo projeto ou mudança</button><ul id="projects"></ul></aside>
<section aria-label="Projeto"><h2 id="title" tabindex="-1">Novo projeto</h2><form id="briefing-form"><fieldset id="editor" disabled><legend>Briefing · rascunhos incompletos podem ser salvos</legend><label for="name">Nome</label><input id="name" required maxlength="120"><label for="kind">Tipo</label><select id="kind"><option value="project">Projeto</option><option value="change">Mudança</option></select><div id="fields"></div><button id="save">Criar projeto</button></fieldset></form>
<section id="interview" aria-labelledby="interview-title"><h2 id="interview-title">Vamos começar pela sua ideia</h2><p>Você não precisa saber desenvolver sistemas. Responda uma pergunta por vez; o rascunho fica salvo neste navegador para você continuar depois.</p><p id="interview-progress" role="status"></p><form id="interview-form"><label id="interview-label" for="interview-answer"></label><p id="interview-hint"></p><textarea id="interview-answer" required maxlength="4000"></textarea><button id="interview-back" type="button">Voltar</button><button id="interview-next">Continuar</button></form><button id="interview-clear" type="button">Limpar rascunho da entrevista</button></section>
<section aria-label="Próxima ação"><h2>Próxima ação</h2><p id="next">Salve o briefing para iniciar.</p><button id="run" hidden>Executar etapa local</button><form id="approval" hidden><label for="reason">Justificativa da aprovação humana do PRD (owner/admin)</label><textarea id="reason" required maxlength="2000"></textarea><button id="approve">Aprovar PRD</button></form></section>
<section id="journey-section" hidden aria-labelledby="journey-title"><h2 id="journey-title">Jornada escrita por você</h2><p>Descreva o caminho de cada perfil com base no PRD aprovado. Salve mesmo incompleto e retome depois. Quando não souber, registre DADO INSUFICIENTE; resolva as lacunas antes de aprovar.</p><p id="journey-source"></p><form id="journey-form"><fieldset id="journey-editor"><legend>Rascunho humano · Prompt 03</legend><div id="journey-fields"></div><button id="journey-submit">Salvar rascunho da jornada</button></fieldset></form><form id="journey-approval" hidden><label for="journey-reason">Justificativa da aprovação humana da jornada (owner/admin)</label><p>Confirme que revisou todos os perfis, caminhos e exceções e que nenhum fluxo crítico está indefinido.</p><textarea id="journey-reason" required maxlength="2000"></textarea><button id="journey-approve">Aprovar jornada</button></form></section>
<section id="design-section" hidden aria-labelledby="design-title"><h2 id="design-title">UI/UX e design system</h2><p>Descreva a interface a partir da jornada aprovada. Esta etapa registra decisões humanas sobre telas, componentes, acessibilidade e critérios visuais; não inventa identidade de marca nem afirma que uma tela foi implementada.</p><p id="design-source"></p><form id="design-form"><fieldset id="design-editor"><legend>Especificação humana · Prompt 04</legend><div id="design-fields"></div><button id="design-submit">Salvar rascunho de UI/UX</button></fieldset></form><form id="design-approval" hidden><label for="design-reason">Justificativa da aprovação humana da UI/UX (owner/admin)</label><p>Confirme que a arquitetura de informação, estados, acessibilidade e critérios visuais foram revisados.</p><textarea id="design-reason" required maxlength="2000"></textarea><button id="design-approve">Aprovar UI/UX</button></form></section>
<h2>17 etapas</h2><ol id="steps"></ol><h2>Evidências e PRD</h2><div id="artifacts"></div><h2>Histórico</h2><ol id="history"></ol></section></div></main></body></html>`;

const css = `:root{font:16px/1.6 system-ui,sans-serif;color:#172b36;background:#f5f6f3}*{box-sizing:border-box}body{margin:0}main{max-width:1200px;margin:auto;padding:clamp(16px,4vw,48px)}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}h2{margin-top:2rem}.notice{border-left:4px solid #916200;padding:16px;background:#fff5d9}.layout{display:grid;grid-template-columns:minmax(180px,1fr) minmax(0,3fr);gap:32px}fieldset{border:1px solid #bbc6c9;padding:20px;border-radius:8px}label{display:block;margin-top:12px;font-weight:600}input,textarea,select{width:100%;font:inherit;padding:10px;border:1px solid #617580;border-radius:4px;background:white;color:inherit}textarea{min-height:90px;resize:vertical}button{font:inherit;padding:10px 16px;margin:12px 4px 4px 0;border:1px solid #215c60;background:#215c60;color:white;border-radius:4px;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}:focus-visible{outline:3px solid #ac4b09;outline-offset:3px}li{margin:12px 0;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}details{padding:12px;border:1px solid #bbc6c9;margin:12px 0}summary{cursor:pointer;font-weight:600}[hidden]{display:none!important}#status{min-height:2em}#journey-source,#design-source{overflow-wrap:anywhere}#steps li{padding:12px;background:white;border-left:3px solid #215c60}#projects{padding-left:20px}@media(max-width:700px){.layout{grid-template-columns:1fr}main{padding:16px}}`;

const js = String.raw`"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const fields = {company:'Empresa',problem:'Problema',audience:'Público',objective:'Objetivo',successMetric:'Indicador de sucesso',scope:'Escopo',outOfScope:'Fora do escopo',requirements:'Requisitos',acceptanceCriteria:'Critérios de aceite',nonFunctional:'Requisitos não funcionais',constraints:'Restrições'};
  const interview = [{key:'company',label:'Como se chama a empresa, marca ou projeto?',hint:'Pode ser o nome provisório. Você poderá alterar depois.'},{key:'problem',label:'Que problema você quer resolver?',hint:'Conte o que acontece hoje e por que isso atrapalha.'},{key:'audience',label:'Quem vai usar ou se beneficiar da solução?',hint:'Descreva as pessoas, equipes ou clientes.'},{key:'objective',label:'O que você gostaria que acontecesse depois?',hint:'Explique o resultado esperado em linguagem simples.'},{key:'successMetric',label:'Como saberemos que deu certo?',hint:'Exemplo: reduzir tempo, aumentar vendas ou evitar retrabalho.'},{key:'scope',label:'O que a primeira versão precisa fazer?',hint:'Liste o essencial para começar.'},{key:'outOfScope',label:'O que pode ficar para depois?',hint:'Registrar isso ajuda a manter o primeiro passo pequeno.'},{key:'requirements',label:'Existe alguma regra ou função obrigatória?',hint:'Inclua integrações, aprovações ou informações necessárias.'},{key:'acceptanceCriteria',label:'Como você confirmará que a solução está pronta?',hint:'Descreva um exemplo que precisa funcionar.'},{key:'nonFunctional',label:'Há exigências de segurança, velocidade ou acesso?',hint:'Se não souber, escreva “não sei ainda”.'},{key:'constraints',label:'O que não pode acontecer?',hint:'Informe prazos, orçamento, leis ou sistemas que precisam ser preservados.'}];
  const states = {not_started:'Não iniciada',in_progress:'Em andamento',blocked:'Bloqueada',awaiting_approval:'Aguardando aprovação',completed:'Concluída',failed:'Falhou'};
  const journeyGroups = [
    ['Contexto e caminho principal', {profiles:'Quem usa? Descreva cada perfil',channels:'Em quais canais cada perfil usa o produto?',entry:'Entrada: como cada perfil começa?',preconditions:'Pré-condições: o que precisa existir antes?',mainSteps:'Passos: descreva a sequência de cada perfil',result:'Resultado: o que acontece ao final?'}],
    ['Alternativas e exceções', {alternatives:'Quais caminhos alternativos existem?',errors:'O que pode dar errado em cada passo?',cancellation:'Como cancelar e o que acontece com os dados?',recovery:'Como recuperar ou retomar após erro ou interrupção?'}],
    ['Acesso, dados e telas', {permissions:'Quem pode executar cada passo?',data:'Quais dados são coletados em cada ponto?',states:'Estados de cada tela: carregamento, vazio, sucesso e erro'}],
    ['Medição e abandono', {analytics:'Quais eventos de analytics devem ser registrados e em que ponto?',abandonment:'Onde cada perfil pode abandonar a jornada?'}],
  ];
  const journeyKeys = journeyGroups.flatMap(([,fields]) => Object.keys(fields));
  const designGroups = [
    ['Estrutura e componentes', {informationArchitecture:'Arquitetura de informação: como o conteúdo será organizado?',screenMap:'Mapa de telas: quais telas existem e como se conectam?',visualHierarchy:'Hierarquia visual: o que deve chamar atenção primeiro?',reusableComponents:'Componentes reutilizáveis: quais padrões serão compartilhados?'}],
    ['Linguagem visual', {designTokens:'Design tokens: quais decisões de cor, tipografia, espaço e forma serão nomeadas?',colorsContrast:'Cores e contraste: quais cores e contrastes aprovados serão usados?',typography:'Tipografia: quais fontes, tamanhos e pesos serão usados?',spacing:'Espaçamento: qual escala e regra de composição será usada?'}],
    ['Estados e plataformas', {states:'Estados de carregamento, vazio, erro e sucesso de cada tela',responsiveness:'Responsividade: como a experiência se adapta a desktop, tablet e mobile?',accessibility:'Acessibilidade: quais padrões, foco, teclado e leitura serão garantidos?',microinteractions:'Microinterações: quais respostas visuais ajudam sem distrair?'}],
    ['Aceite visual', {errorMessages:'Mensagens de erro: como orientar a pessoa a se recuperar?',visualAcceptance:'Critérios de aceite visual: como o responsável verificará a interface?',consistencyRules:'Regras para evitar telas duplicadas ou componentes inconsistentes'}],
  ];
  const designKeys = designGroups.flatMap(([,fields]) => Object.keys(fields));
  const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
  let context = null, current = null, action = null, busy = false, pending = null, interviewIndex = 0, interviewAnswers = {}, interviewComplete = false;
  let interviewVersion = null, interviewRemoteReady = false, interviewQueue = Promise.resolve(), interviewGeneration = 0, interviewDirty = false, interviewNotice = '';
  function node(tag, text) { const n = document.createElement(tag); n.textContent = text; return n; }
  function message(text) { $('status').textContent = text; }
  function storageKey() { return context ? 'kesko-interview:' + context.tenant + ':' + context.actor : ''; }
  function saveInterview(unsynced = true) { interviewDirty = unsynced; try { localStorage.setItem(storageKey(), JSON.stringify({index: interviewIndex, answers: interviewAnswers, unsynced})); } catch {} }
  function loadInterview() { try { const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null'); if (saved && saved.answers) { interviewIndex = Math.min(Number(saved.index) || 0, interview.length); interviewAnswers = saved.answers; interviewComplete = interviewIndex >= interview.length; interviewDirty = saved.unsynced === true; } } catch {} }
  function renderInterview() { const item = interview[interviewIndex]; $('interview').hidden = !context || !!current || interviewComplete; if (interviewComplete && !current) { for (const key of Object.keys(fields)) $('brief-' + key).value = interviewAnswers[key] || ''; } if (!item) return; $('interview-progress').textContent = 'Pergunta ' + (interviewIndex + 1) + ' de ' + interview.length; $('interview-label').textContent = item.label; $('interview-hint').textContent = item.hint; $('interview-answer').value = interviewAnswers[item.key] || ''; $('interview-back').disabled = interviewIndex === 0; $('interview-next').textContent = interviewIndex === interview.length - 1 ? 'Concluir entrevista' : 'Continuar'; $('interview-answer').focus(); }
  for (const [key,label] of Object.entries(fields)) {
    const l = node('label',label); l.htmlFor = 'brief-' + key;
    const t = document.createElement('textarea'); t.id = 'brief-' + key; t.maxLength = 4000;
    $('fields').append(l,t);
  }
  for (const [title,fields] of journeyGroups) {
    const group = document.createElement('fieldset'); group.append(node('legend',title));
    for (const [key,label] of Object.entries(fields)) {
      const l = node('label',label); l.htmlFor = 'journey-' + key;
      const t = document.createElement('textarea'); t.id = 'journey-' + key; t.maxLength = 2000;
      group.append(l,t);
    }
    $('journey-fields').append(group);
  }
  for (const [title,fields] of designGroups) {
    const group = document.createElement('fieldset'); group.append(node('legend',title));
    for (const [key,label] of Object.entries(fields)) {
      const l = node('label',label); l.htmlFor = 'design-' + key;
      const t = document.createElement('textarea'); t.id = 'design-' + key; t.maxLength = 4000;
      group.append(l,t);
    }
    $('design-fields').append(group);
  }
  function journeyArtifact() { return current && [...current.artifacts].reverse().find(a => a.stepId === 'journey' && a.revision === current.briefingRevision); }
  function journeySource() { return current && [...current.artifacts].reverse().find(a => a.stepId === 'prd' && a.revision === current.briefingRevision && a.verification === 'human_review'); }
  function designArtifact() { return current && [...current.artifacts].reverse().find(a => a.stepId === 'design' && a.revision === current.briefingRevision); }
  function designSource() { return current && [...current.artifacts].reverse().find(a => a.stepId === 'journey' && a.revision === current.briefingRevision && a.verification === 'human_review'); }
  $('tenant').value = '00000000-0000-0000-0000-000000000010';
  $('actor').value = '00000000-0000-0000-0000-000000000001';
  function approved() { return current && current.steps.some(s => s.id === 'prd' && s.state === 'completed'); }
  function controls() {
    const locked = busy || !!pending;
    $('context-fields').disabled = locked;
    $('editor').disabled = locked || !context || (!current && !interviewComplete) || !!approved();
    $('new').disabled = locked || !context;
    $('name').disabled = !!current; $('kind').disabled = !!current;
    $('run').disabled = locked; $('approve').disabled = locked; $('reason').disabled = locked;
    $('journey-editor').disabled = locked || !approved() || !!(current && current.steps.some(s => s.id === 'journey' && s.state === 'completed'));
    $('journey-approve').disabled = locked; $('journey-reason').disabled = locked;
    $('design-editor').disabled = locked || !journeyApproved() || !!(current && current.steps.some(s => s.id === 'design' && s.state === 'completed'));
    $('design-approve').disabled = locked; $('design-reason').disabled = locked;
    $('retry').hidden = !pending; $('retry').disabled = busy;
    for (const b of $('projects').querySelectorAll('button')) b.disabled = locked;
  }
  function journeyApproved() { return current && current.steps.some(s => s.id === 'journey' && s.state === 'completed'); }
  function render(data) {
    current = data.project; action = data.nextAction;
    interviewComplete = true;
    $('interview').hidden = true;
    $('title').textContent = current.name + ' · versão ' + current.version + ' · briefing ' + current.briefingRevision;
    $('name').value = current.name; $('kind').value = current.kind;
    for (const key of Object.keys(fields)) $('brief-' + key).value = current.briefing[key] || '';
    $('save').textContent = 'Salvar revisão do briefing';
    $('next').textContent = (action ? action.reason : 'Nenhuma ação disponível') + (approved() ? ' PRD aprovado. Para alterar o briefing, crie uma nova mudança.' : '');
    $('run').hidden = !(action && action.type === 'run_step' && ['discovery','prd'].includes(action.stepId));
    $('approval').hidden = !(action && action.type === 'approve_prd');
    $('journey-section').hidden = !approved();
    $('journey-approval').hidden = !(action && action.type === 'approve_journey');
    const source = journeySource(), draft = journeyArtifact();
    $('journey-source').textContent = source ? 'PRD fonte: ' + source.id + ' · SHA-256: ' + source.sha256 : 'PRD aprovado vigente indisponível';
    for (const key of journeyKeys) $('journey-' + key).value = draft && draft.journeyInput ? draft.journeyInput.journey[key] || '' : '';
    $('journey-reason').value = '';
    $('design-section').hidden = !journeyApproved();
    $('design-approval').hidden = !(action && action.type === 'approve_design');
    const designSourceArtifact = designSource(), designDraft = designArtifact();
    $('design-source').textContent = designSourceArtifact ? 'Jornada fonte: ' + designSourceArtifact.id + ' · SHA-256: ' + designSourceArtifact.sha256 : 'Jornada aprovada vigente indisponível';
    for (const key of designKeys) $('design-' + key).value = designDraft && designDraft.designInput ? designDraft.designInput.design[key] || '' : '';
    $('design-reason').value = '';
    $('steps').replaceChildren();
    for (const step of current.steps) {
      const li = node('li',step.title + ' — ' + (states[step.state] || step.state) + ' · tentativas: ' + step.attempts);
      li.append(node('p',step.criterion),node('p','Dependências: ' + (step.dependsOn.join(', ') || 'Nenhuma')));
      if (step.reason) li.append(node('p',step.reason));
      $('steps').append(li);
    }
    $('artifacts').replaceChildren();
    if (!current.artifacts.length) $('artifacts').append(node('p','Nenhuma evidência registrada.'));
    for (const artifact of current.artifacts) {
      const d = document.createElement('details');
      const latest = artifact.revision === current.briefingRevision && (artifact.stepId === 'journey' ? artifact.id === (draft && draft.id) : artifact.stepId === 'design' ? artifact.id === (designDraft && designDraft.id) : true);
      d.append(node('summary',artifact.stepId + ' · revisão ' + artifact.revision + ' · ' + artifact.verification + (latest ? ' · vigente' : ' · histórica')),
        node('pre',artifact.content),node('p','SHA-256: ' + artifact.sha256),node('p','Criado por ' + artifact.createdBy + ' em ' + artifact.createdAt));
      if (artifact.approvedBy) d.append(node('p','Aprovado por ' + artifact.approvedBy + ': ' + artifact.approvalReason));
      $('artifacts').append(d);
    }
    $('history').replaceChildren();
    for (const event of data.history || []) $('history').append(node('li',JSON.stringify(event,null,2)));
    if (!(data.history || []).length) $('history').append(node('li','Nenhum evento registrado.'));
    controls();
  }
  function base() { return '/v1/tenants/' + context.tenant + '/projects'; }
  function interviewBase() { return '/v1/tenants/' + context.tenant + '/interview-draft'; }
  async function request(url, body, identity) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(),15000);
    try {
      const response = await fetch(url,{method:body ? 'POST' : 'GET',headers:{Authorization:'Bearer local:' + identity.actor,...(body ? {'Content-Type':'application/json'} : {})},body,signal:controller.signal,cache:'no-store',redirect:'error'});
      if (!response.ok) {
        const error = new Error('HTTP ' + response.status + (response.status === 409 ? ': conflito de versão/operação. Reabra o projeto antes de tentar uma nova ação.' : response.status === 403 ? ': usuário sem permissão.' : ': não foi possível concluir a solicitação.'));
        error.definitive = response.status >= 400 && response.status < 500; throw error;
      }
      return (await response.json()).data;
    } finally { clearTimeout(timer); }
  }
  async function read(work) {
    if (busy || pending) return;
    busy = true; controls(); message('Carregando…');
    try { await work(); message(interviewNotice || 'Dados carregados.'); }
    catch (e) { message(e.message); }
    finally { busy = false; controls(); }
  }
  async function list() {
    const projects = await request(base(),undefined,context);
    $('projects').replaceChildren();
    if (!projects.length) $('projects').append(node('li','Nenhum projeto neste tenant.'));
    for (const project of projects) {
      const li = document.createElement('li'), b = node('button',project.name + ' · ' + project.kind);
      b.addEventListener('click',() => read(async () => { render(await request(base() + '/' + encodeURIComponent(project.id),undefined,context)); $('title').focus(); }));
      li.append(b); $('projects').append(li);
    }
  }
  async function loadRemoteInterview() {
    try {
      const draft = await request(interviewBase(),undefined,context);
      interviewVersion = draft ? draft.version : null;
      interviewRemoteReady = true;
      if (interviewDirty) interviewNotice = 'Respostas locais não sincronizadas foram preservadas. Confira as respostas antes de continuar; o servidor pode ter outra versão.';
      if (draft && draft.answers && !interviewDirty) {
        interviewIndex = Math.min(Number(draft.index) || 0, interview.length);
        interviewAnswers = draft.answers;
        interviewComplete = interviewIndex >= interview.length;
        saveInterview(false);
      }
    } catch {}
  }
  function saveRemoteInterview() {
    if (!context) return;
    const identity = context, generation = interviewGeneration, snapshot = JSON.stringify({index:interviewIndex,answers:interviewAnswers}), url = interviewBase();
    interviewQueue = interviewQueue.then(async () => {
      if (context !== identity || interviewGeneration !== generation) return;
      if (!interviewRemoteReady) { if (!current) message('Rascunho salvo neste navegador. A sincronização remota está indisponível no momento. Recarregue os projetos para reconectar.'); return; }
      try {
        const saved = await request(url,JSON.stringify({...JSON.parse(snapshot),expectedVersion:interviewVersion}),identity);
        if (context === identity) {
          interviewVersion = saved.version;
          if (interviewGeneration === generation && snapshot === JSON.stringify({index:interviewIndex,answers:interviewAnswers})) saveInterview(false);
        }
      } catch (e) {
        if (context !== identity) return;
        interviewRemoteReady = false;
        if (!current && interviewGeneration === generation) message(e.definitive && e.message.includes('409') ? 'Outra aba alterou a entrevista. Suas respostas permanecem neste navegador. Recarregue os projetos e confira as respostas antes de salvar novamente.' : 'Rascunho salvo neste navegador. A sincronização remota está indisponível no momento.');
      }
    });
  }
  function reset() {
    interviewGeneration += 1;
    interviewDirty = false; interviewNotice = '';
    current = null; action = null; $('briefing-form').reset(); $('approval').reset();
    $('journey-section').hidden = true; $('journey-approval').hidden = true; $('journey-form').reset(); $('journey-reason').value = '';
    interviewIndex = 0; interviewAnswers = {}; interviewComplete = false; renderInterview();
    $('title').textContent = 'Novo projeto ou mudança'; $('save').textContent = 'Criar projeto';
    $('next').textContent = 'Salve o briefing para iniciar.'; $('run').hidden = true; $('approval').hidden = true;
    for (const id of ['steps','artifacts','history']) $(id).replaceChildren(); controls();
  }
  async function send(operation) {
    if (busy) return;
    busy = true; pending = operation; controls(); message('Salvando…');
    try {
      const data = await request(operation.url,operation.body,operation.identity);
      pending = null; render(data); $('reason').value = ''; message('Operação registrada.');
      try { await list(); } catch { message('Operação registrada; não foi possível atualizar a lista. Recarregue os projetos.'); }
    } catch (e) {
      if (e.definitive) { pending = null; message(e.message); }
      else message('Resultado incerto (timeout ou falha de comunicação). Nenhuma repetição automática. Use “Repetir a mesma operação” para reenviar o mesmo operationId e payload. Mantenha esta página aberta.');
    } finally { busy = false; controls(); }
  }
  function mutate(payload) {
    if (!context || busy || pending) return;
    const body = JSON.stringify({...payload,operationId:crypto.randomUUID(),...(current ? {expectedVersion:current.version} : {})});
    return send({url:base() + (current ? '/' + encodeURIComponent(current.id) + '/commands' : ''),body,identity:{...context}});
  }
  $('context').addEventListener('submit',event => {
    event.preventDefault(); if (busy || pending) return;
    const tenant = $('tenant').value.trim(), actor = $('actor').value.trim();
    if (!uuid.test(tenant) || !uuid.test(actor)) { message('Informe UUIDs válidos para tenant e usuário.'); return; }
    context = {tenant,actor}; interviewVersion = null; interviewRemoteReady = false; interviewQueue = Promise.resolve(); reset(); loadInterview(); $('projects').replaceChildren(); read(async () => { await loadRemoteInterview(); renderInterview(); await list(); });
  });
  $('new').addEventListener('click',() => { if (!busy && !pending) { reset(); saveInterview(); saveRemoteInterview(); $('interview-answer').focus(); } });
  $('interview-form').addEventListener('submit',event => { event.preventDefault(); const item = interview[interviewIndex]; const value = $('interview-answer').value.trim(); if (!item || !value) { message('Responda esta pergunta para continuar.'); return; } interviewAnswers[item.key] = value; interviewIndex += 1; interviewComplete = interviewIndex >= interview.length; saveInterview(); saveRemoteInterview(); if (interviewComplete) { for (const key of Object.keys(fields)) $('brief-' + key).value = interviewAnswers[key] || ''; message('Entrevista concluída. Confira o resumo e salve o projeto.'); } renderInterview(); controls(); });
  $('interview-back').addEventListener('click',() => { if (interviewIndex > 0) { interviewIndex -= 1; renderInterview(); } });
  $('interview-clear').addEventListener('click',() => { if (!context || busy || pending) return; interviewGeneration += 1; interviewIndex = 0; interviewAnswers = {}; interviewComplete = false; saveInterview(); saveRemoteInterview(); renderInterview(); controls(); message('Limpeza registrada neste navegador; sincronização remota em andamento.'); });
  $('briefing-form').addEventListener('submit',event => {
    event.preventDefault(); if (approved()) return;
    const briefing = Object.fromEntries(Object.keys(fields).map(k => [k,$('brief-' + k).value]));
    mutate(current ? {type:'update_briefing',briefing} : {name:$('name').value,kind:$('kind').value,briefing});
  });
  $('run').addEventListener('click',() => { if (action && action.type === 'run_step' && ['discovery','prd'].includes(action.stepId)) mutate({type:'run_step',stepId:action.stepId}); });
  $('approval').addEventListener('submit',event => { event.preventDefault(); const reason = $('reason').value.trim(); if (action && action.type === 'approve_prd' && reason) mutate({type:'approve_prd',reason}); });
  $('journey-form').addEventListener('submit',event => {
    event.preventDefault(); const source = journeySource();
    if (!source || !action || !['submit_journey','approve_journey'].includes(action.type)) return;
    const journey = Object.fromEntries(journeyKeys.map(key => [key,$('journey-' + key).value.trim()]));
    mutate({type:'submit_journey',journey,sourcePrdId:source.id,sourcePrdHash:source.sha256});
  });
  $('journey-approval').addEventListener('submit',event => {
    event.preventDefault(); const source = journeySource(), draft = journeyArtifact(), reason = $('journey-reason').value.trim();
    if (!source || !draft || !reason || !action || action.type !== 'approve_journey') return;
    if (journeyKeys.some(key => $('journey-' + key).value.trim() !== draft.journeyInput.journey[key])) { message('Salve as alterações da jornada antes de aprovar.'); return; }
    mutate({type:'approve_journey',artifactId:draft.id,sourcePrdId:source.id,sourcePrdHash:source.sha256,reason});
  });
  $('design-form').addEventListener('submit',event => {
    event.preventDefault(); const source = designSource();
    if (!source || !action || !['submit_design','approve_design'].includes(action.type)) return;
    const design = Object.fromEntries(designKeys.map(key => [key,$('design-' + key).value.trim()]));
    mutate({type:'submit_design',design,sourceJourneyId:source.id,sourceJourneyHash:source.sha256});
  });
  $('design-approval').addEventListener('submit',event => {
    event.preventDefault(); const source = designSource(), draft = designArtifact(), reason = $('design-reason').value.trim();
    if (!source || !draft || !reason || !action || action.type !== 'approve_design') return;
    if (designKeys.some(key => $('design-' + key).value.trim() !== draft.designInput.design[key])) { message('Salve as alterações da UI/UX antes de aprovar.'); return; }
    mutate({type:'approve_design',artifactId:draft.id,sourceJourneyId:source.id,sourceJourneyHash:source.sha256,reason});
  });
  $('retry').addEventListener('click',() => { if (pending) send(pending); });
  window.addEventListener('beforeunload',event => { if (pending) { event.preventDefault(); event.returnValue = ''; } });
})();`;

export function registerWorkflowUi(app: FastifyInstance): void {
  const assets = [
    ["/workflow", "text/html; charset=utf-8", html],
    ["/workflow/style.css", "text/css; charset=utf-8", css],
    ["/workflow/app.js", "application/javascript; charset=utf-8", js],
  ];
  for (const [url, contentType, body] of assets) {
    app.get(url, async (request, reply) => {
      reply.headers({
        "cache-control": "no-store, max-age=0",
        "content-security-policy":
          "default-src 'none'; img-src data:; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      });
      if (
        ![undefined, "development", "test"].includes(process.env.NODE_ENV) ||
        !isLocalRequest(request)
      )
        return reply.code(404).send({ error: "Not found" });
      return reply.type(contentType).send(body);
    });
  }
}
