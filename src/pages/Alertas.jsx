import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';

import { executarMotorAlertasGeral } from '../services/motorAlertas';

import icone08 from '../assets/icon8.png';
import icone04 from '../assets/icon4.png';

function Alertas() {
    const navigate = useNavigate();

    const [telaAtual, setTelaAtual] = useState('listagem');

    const [listaTurmasBD, setListaTurmasBD] = useState([]);
    const [mapaAlunosPorTurma, setMapaAlunosPorTurma] = useState({});
    const [carregandoDados, setCarregandoDados] = useState(false);

    const [alertasDisparados, setAlertasDisparados] = useState([]);
    const [alertasCriados, setAlertasCriados] = useState([]);

    const [alertaDetalhado, setAlertaDetalhado] = useState(null);

    const [modoEdicao, setModoEdicao] = useState(false);
    const [idEditando, setIdEditando] = useState(null);

    const [tipoAlvo, setTipoAlvo] = useState('Turma');
    const [escopo, setEscopo] = useState('Todos');
    const [turmaSelecionada, setTurmaSelecionada] = useState('');
    const [alunoSelecionado, setAlunoSelecionado] = useState('');
    const [quantidadeFaltas, setQuantidadeFaltas] = useState('');
    const [tipoPeriodo, setTipoPeriodo] = useState('Mensal');

    const [feedback, setFeedback] = useState(null);
    const [confirmacaoExclusao, setConfirmacaoExclusao] = useState(null);

    const mostrarFeedback = (tipo, titulo, mensagem) => {
        setFeedback({ tipo, titulo, mensagem });

        setTimeout(() => {
            setFeedback(null);
        }, 3200);
    };

    const limparFormulario = () => {
        setModoEdicao(false);
        setIdEditando(null);
        setTipoAlvo('Turma');
        setEscopo('Todos');
        setTurmaSelecionada('');
        setAlunoSelecionado('');
        setQuantidadeFaltas('');
        setTipoPeriodo('Mensal');
    };

    const formatarDataSimples = (dataISO) => {
        if (!dataISO) return 'Data não registrada';

        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const formatarDataHora = (dataISO) => {
        if (!dataISO) return 'Data não registrada';

        const data = new Date(dataISO);

        if (Number.isNaN(data.getTime())) {
            return 'Data não registrada';
        }

        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const carregarDadosIniciais = async () => {
        setCarregandoDados(true);

        try {
            const regrasSnapshot = await getDocs(collection(db, 'config_alertas'));
            const regrasCarregadas = [];

            regrasSnapshot.forEach((docSnap) => {
                regrasCarregadas.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            setAlertasCriados(regrasCarregadas);

            const disparadosSnapshot = await getDocs(collection(db, 'alertas_disparados'));
            const disparosCarregados = [];

            disparadosSnapshot.forEach((docSnap) => {
                disparosCarregados.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            setAlertasDisparados(disparosCarregados);

            const turmasSnapshot = await getDocs(collection(db, 'turmas'));
            const nomesTurmas = [];
            const vinculoAlunos = {};

            turmasSnapshot.forEach((docSnap) => {
                const dados = docSnap.data();

                if (dados.nome) {
                    nomesTurmas.push(dados.nome);
                    vinculoAlunos[dados.nome] = dados.alunos || [];
                }
            });

            nomesTurmas.sort();
            setListaTurmasBD(nomesTurmas);
            setMapaAlunosPorTurma(vinculoAlunos);
        } catch (error) {
            console.error('Erro ao carregar dados do banco:', error);
            mostrarFeedback('erro', 'Erro ao carregar', 'Não foi possível carregar os alertas do banco.');
        } finally {
            setCarregandoDados(false);
        }
    };

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    const abrirTelaCriacao = () => {
        limparFormulario();
        setTelaAtual('criacao');
    };

    const abrirTelaEdicao = (alerta) => {
        setModoEdicao(true);
        setIdEditando(alerta.id);

        setTipoAlvo(alerta.tipoAlvo || 'Turma');
        setEscopo(alerta.escopo || 'Todos');

        setTurmaSelecionada(
            alerta.escopo === 'Especifico' && alerta.turmaAlvo !== 'Todas'
                ? alerta.turmaAlvo
                : ''
        );

        setAlunoSelecionado(
            alerta.escopo === 'Especifico' && alerta.tipoAlvo === 'Aluno' && alerta.alunoAlvo !== 'Todos'
                ? alerta.alunoAlvo
                : ''
        );

        setQuantidadeFaltas(alerta.quantidadeFaltas ? String(alerta.quantidadeFaltas) : '');
        setTipoPeriodo(alerta.tipoPeriodo || 'Mensal');

        setTelaAtual('criacao');
    };

    const gerarTextoLogica = () => {
        let quem = '';

        if (escopo === 'Todos') {
            quem = tipoAlvo === 'Aluno' ? 'qualquer aluno' : 'qualquer turma';
        } else if (tipoAlvo === 'Turma') {
            quem = `a turma ${turmaSelecionada || '___'}`;
        } else {
            quem = `o aluno ${alunoSelecionado || '___'} (${turmaSelecionada || '___'})`;
        }

        const faltas = quantidadeFaltas || 'X';
        const periodo =
            tipoPeriodo === 'Seguidas'
                ? 'seguidas'
                : tipoPeriodo === 'Mensal'
                    ? 'mensais'
                    : 'anuais';

        return `Se ${quem} atingir ${faltas} faltas ${periodo}, gerar alerta.`;
    };

    const marcarDisparosDaRegraComoVistos = async (idRegra) => {
        const disparadosRef = collection(db, 'alertas_disparados');

        const qDisparos = query(
            disparadosRef,
            where('id_regra', '==', idRegra),
            where('lido', '==', false)
        );

        const disparadosSnapshot = await getDocs(qDisparos);
        const agora = new Date().toISOString();

        await Promise.all(
            disparadosSnapshot.docs.map((docSnap) =>
                updateDoc(doc(db, 'alertas_disparados', docSnap.id), {
                    lido: true,
                    vistoEm: agora,
                    motivoVisto: 'Marcado automaticamente como visto após edição da regra.'
                })
            )
        );

        setAlertasDisparados((prev) =>
            prev.map((item) =>
                item.id_regra === idRegra && item.lido === false
                    ? {
                        ...item,
                        lido: true,
                        vistoEm: agora,
                        motivoVisto: 'Marcado automaticamente como visto após edição da regra.'
                    }
                    : item
            )
        );
    };

    const salvarAlerta = async () => {
        const quantidadeConvertida = parseInt(quantidadeFaltas, 10);

        if (!quantidadeFaltas || isNaN(quantidadeConvertida) || quantidadeConvertida < 1) {
            mostrarFeedback('erro', 'Campo inválido', 'Insira uma quantidade válida de faltas.');
            return;
        }

        if (escopo === 'Especifico') {
            if (!turmaSelecionada) {
                mostrarFeedback('erro', 'Seleção incompleta', 'Selecione a turma.');
                return;
            }

            if (tipoAlvo === 'Aluno' && !alunoSelecionado) {
                mostrarFeedback('erro', 'Seleção incompleta', 'Selecione o aluno.');
                return;
            }
        }

        try {
            mostrarFeedback(
                'carregando',
                modoEdicao ? 'Salvando alterações...' : 'Criando alerta...',
                'Aguarde enquanto o sistema grava a regra e recalcula os alertas.'
            );

            const alertaOriginal = alertasCriados.find((item) => item.id === idEditando);

            const dadosAlerta = {
                texto: gerarTextoLogica(),
                tipoAlvo,
                escopo,
                turmaAlvo: escopo === 'Especifico' ? turmaSelecionada : 'Todas',
                alunoAlvo: escopo === 'Especifico' && tipoAlvo === 'Aluno' ? alunoSelecionado : 'Todos',
                quantidadeFaltas: quantidadeConvertida,
                tipoPeriodo,
                ativo: modoEdicao ? (alertaOriginal?.ativo ?? true) : true,
                criadoEm: modoEdicao ? (alertaOriginal?.criadoEm || new Date().toISOString()) : new Date().toISOString(),
                atualizadoEm: new Date().toISOString()
            };

            if (modoEdicao && idEditando) {
                const docRef = doc(db, 'config_alertas', idEditando);

                await updateDoc(docRef, dadosAlerta);
                await marcarDisparosDaRegraComoVistos(idEditando);

                await executarMotorAlertasGeral();
                await carregarDadosIniciais();

                mostrarFeedback('sucesso', 'Alerta editado', 'A regra foi atualizada e os alertas foram recalculados.');
            } else {
                const alertasRef = collection(db, 'config_alertas');

                await addDoc(alertasRef, dadosAlerta);
                await executarMotorAlertasGeral();
                await carregarDadosIniciais();

                mostrarFeedback('sucesso', 'Alerta criado', 'A regra foi salva e o histórico de faltas foi verificado.');
            }

            limparFormulario();
            setTelaAtual('listagem');
        } catch (error) {
            console.error('Erro ao salvar alerta no Firestore:', error);
            mostrarFeedback('erro', 'Erro ao salvar', 'O alerta não foi salvo corretamente. Verifique o console.');
        }
    };

    const marcarOcorrenciaComoLida = async (idOcorrencia) => {
        try {
            const agora = new Date().toISOString();
            const docRef = doc(db, 'alertas_disparados', idOcorrencia);

            await updateDoc(docRef, {
                lido: true,
                vistoEm: agora
            });

            setAlertasDisparados((prev) =>
                prev.map((item) =>
                    item.id === idOcorrencia
                        ? {
                            ...item,
                            lido: true,
                            vistoEm: agora
                        }
                        : item
                )
            );

            mostrarFeedback('sucesso', 'Alerta visto', 'Esse alerta foi enviado para o histórico de vistos.');
        } catch (err) {
            console.error('Erro ao marcar ocorrência como vista:', err);
            mostrarFeedback('erro', 'Erro ao marcar visto', 'Não foi possível marcar esse alerta como visto.');
        }
    };

    const alternarStatusAlerta = async (alerta) => {
        try {
            const novoStatus = !alerta.ativo;
            const docRef = doc(db, 'config_alertas', alerta.id);

            await updateDoc(docRef, {
                ativo: novoStatus,
                atualizadoEm: new Date().toISOString()
            });

            setAlertasCriados((prev) =>
                prev.map((item) =>
                    item.id === alerta.id
                        ? {
                            ...item,
                            ativo: novoStatus
                        }
                        : item
                )
            );

            if (novoStatus) {
                mostrarFeedback('carregando', 'Ligando alerta...', 'O sistema está verificando se essa regra já deve disparar.');
                await executarMotorAlertasGeral();
                await carregarDadosIniciais();
                mostrarFeedback('sucesso', 'Alerta ligado', 'A regra foi ativada e o histórico foi verificado.');
            } else {
                mostrarFeedback('sucesso', 'Alerta desligado', 'A regra foi pausada. Ela não aparecerá como alerta ativo.');
            }
        } catch (err) {
            console.error('Erro ao alternar status da regra:', err);
            mostrarFeedback('erro', 'Erro ao alterar status', 'Não foi possível ligar ou desligar esse alerta.');
        }
    };

    const solicitarExclusaoAlerta = (alerta) => {
        setConfirmacaoExclusao(alerta);
    };

    const excluirAlertaConfirmado = async () => {
        if (!confirmacaoExclusao) return;

        const alerta = confirmacaoExclusao;

        try {
            mostrarFeedback('carregando', 'Excluindo alerta...', 'A regra e seus registros disparados estão sendo removidos.');

            const disparadosRef = collection(db, 'alertas_disparados');

            const qDisparos = query(
                disparadosRef,
                where('id_regra', '==', alerta.id)
            );

            const disparadosSnapshot = await getDocs(qDisparos);

            await Promise.all(
                disparadosSnapshot.docs.map((docSnap) =>
                    deleteDoc(doc(db, 'alertas_disparados', docSnap.id))
                )
            );

            await deleteDoc(doc(db, 'config_alertas', alerta.id));

            setAlertasCriados((prev) =>
                prev.filter((item) => item.id !== alerta.id)
            );

            setAlertasDisparados((prev) =>
                prev.filter((item) => item.id_regra !== alerta.id)
            );

            setAlertaDetalhado(null);
            setConfirmacaoExclusao(null);

            mostrarFeedback('sucesso', 'Alerta excluído', 'A regra e seus registros foram removidos.');
        } catch (err) {
            console.error('Erro ao deletar regra e alertas em cascata:', err);
            mostrarFeedback('erro', 'Erro ao excluir', 'Não foi possível excluir esse alerta.');
        }
    };

    const getOcorrenciasAtivasDaRegra = (alerta) => {
        if (!alerta.ativo) return [];

        return alertasDisparados.filter(
            (item) => item.id_regra === alerta.id && item.lido === false
        );
    };

    const getHistoricoVistosDaRegra = (alerta) => {
        return alertasDisparados
            .filter((item) => item.id_regra === alerta.id && item.lido === true)
            .sort((a, b) => {
                const dataA = new Date(a.vistoEm || a.dataDisparo || 0).getTime();
                const dataB = new Date(b.vistoEm || b.dataDisparo || 0).getTime();

                return dataB - dataA;
            });
    };

    const alertasOrdenados = [...alertasCriados].sort((a, b) => {
        const ocorrenciasA = getOcorrenciasAtivasDaRegra(a).length;
        const ocorrenciasB = getOcorrenciasAtivasDaRegra(b).length;

        if (ocorrenciasA !== ocorrenciasB) {
            return ocorrenciasB - ocorrenciasA;
        }

        if (a.ativo !== b.ativo) {
            return a.ativo ? -1 : 1;
        }

        const dataA = new Date(a.criadoEm || 0).getTime();
        const dataB = new Date(b.criadoEm || 0).getTime();

        return dataB - dataA;
    });

    const renderizarFaltasConsideradas = (ocorrencia) => {
        const faltas = ocorrencia.faltasConsideradas || [];

        if (faltas.length === 0) {
            return (
                <p style={style.textoVazioDetalhes}>
                    Nenhuma data específica foi registrada para este alerta. Isso pode acontecer em alertas antigos, criados antes da melhoria do histórico.
                </p>
            );
        }

        return (
            <div style={style.listaDatas}>
                {faltas.map((item, index) => (
                    <div key={`${item.data}-${index}`} style={style.itemDataFalta}>
                        <div>
                            <strong>{formatarDataSimples(item.data)}</strong>

                            {item.diaDaSemana && (
                                <span style={{ color: '#64748b' }}> — {item.diaDaSemana}</span>
                            )}
                        </div>

                        {item.alunos && item.alunos.length > 0 && (
                            <small style={{ color: '#475569' }}>
                                {item.alunos.length === 1
                                    ? `Aluno: ${item.alunos[0]}`
                                    : `Alunos: ${item.alunos.join(', ')}`
                                }
                            </small>
                        )}

                        {item.quantidadeFaltasDia > 1 && (
                            <small style={{ color: '#991b1b', fontWeight: 'bold' }}>
                                {item.quantidadeFaltasDia} faltas nesse dia
                            </small>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderizarPainelDetalhes = (alerta, ocorrenciasAtivas, historicoVistos) => {
        const possuiAtivos = ocorrenciasAtivas.length > 0;
        const possuiHistorico = historicoVistos.length > 0;

        return (
            <div style={style.painelDetalhes}>
                <div style={style.headerDetalhes}>
                    <div>
                        <h3 style={style.tituloDetalhes}>Detalhes do alerta</h3>

                        <p style={style.subtituloDetalhes}>
                            {alerta.texto}
                        </p>
                    </div>

                    <button
                        className="button-padrao"
                        style={style.btnFecharDetalhes}
                        onClick={() => setAlertaDetalhado(null)}
                    >
                        Fechar
                    </button>
                </div>

                {!possuiAtivos && !possuiHistorico && (
                    <p style={style.textoVazioDetalhes}>
                        Este alerta ainda não possui ocorrências registradas.
                    </p>
                )}

                {possuiAtivos && (
                    <div style={style.blocoDetalhe}>
                        <h4 style={style.tituloBlocoDetalhe}>🚨 Ocorrências ativas</h4>

                        {ocorrenciasAtivas.map((ocorrencia) => (
                            <div key={ocorrencia.id} style={style.cardOcorrenciaDetalhe}>
                                <div style={style.linhaResumoOcorrencia}>
                                    <div>
                                        <strong>{ocorrencia.causador}</strong>
                                        <span> — {ocorrencia.turma}</span>
                                    </div>

                                    <span style={style.tagQuantidade}>
                                        {ocorrencia.quantidadeFaltasAtual} falta(s)
                                    </span>
                                </div>

                                <p style={style.textoInfoOcorrencia}>
                                    Regra: {ocorrencia.textoRegra || alerta.texto}
                                </p>

                                <p style={style.textoInfoOcorrencia}>
                                    Período: {ocorrencia.periodoReferencia || 'não informado'}
                                </p>

                                <h5 style={style.tituloDatas}>Faltas que causaram este alerta:</h5>

                                {renderizarFaltasConsideradas(ocorrencia)}

                                <div style={style.rodapeOcorrencia}>
                                    <small>
                                        Disparado em {formatarDataHora(ocorrencia.dataDisparo)}
                                    </small>

                                    <button
                                        className="button-padrao"
                                        style={style.btnMarcarLido}
                                        onClick={() => marcarOcorrenciaComoLida(ocorrencia.id)}
                                    >
                                        Marcar como visto ✓
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {possuiHistorico && (
                    <div style={style.blocoDetalhe}>
                        <h4 style={style.tituloBlocoDetalhe}>📚 Histórico de vistos</h4>

                        {historicoVistos.map((item) => (
                            <div key={item.id} style={style.cardHistorico}>
                                <p style={style.textoHistoricoPrincipal}>
                                    Visto em <strong>{formatarDataHora(item.vistoEm)}</strong>. Naquele momento, <strong>{item.causador}</strong> tinha <strong>{item.quantidadeFaltasAtual} falta(s)</strong>.
                                </p>

                                {item.descricaoProximoAviso && (
                                    <p style={style.textoDescricaoHistorico}>
                                        {item.descricaoProximoAviso}
                                    </p>
                                )}

                                {item.motivoVisto && (
                                    <p style={style.textoDescricaoHistorico}>
                                        {item.motivoVisto}
                                    </p>
                                )}

                                <details style={style.detailsHistorico}>
                                    <summary>Ver faltas registradas naquele momento</summary>
                                    {renderizarFaltasConsideradas(item)}
                                </details>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className="card-projeto"
            style={{
                ...style.containerPrincipal,
                height: telaAtual === 'listagem' ? '610px' : '440px'
            }}
        >
            {feedback && (
                <div style={style.feedbackOverlay}>
                    <div
                        style={{
                            ...style.feedbackCard,
                            borderColor:
                                feedback.tipo === 'erro'
                                    ? '#fecaca'
                                    : feedback.tipo === 'carregando'
                                        ? '#bfdbfe'
                                        : '#bbf7d0'
                        }}
                    >
                        <div
                            style={{
                                ...style.feedbackIcone,
                                backgroundColor:
                                    feedback.tipo === 'erro'
                                        ? '#fee2e2'
                                        : feedback.tipo === 'carregando'
                                            ? '#dbeafe'
                                            : '#dcfce7',
                                color:
                                    feedback.tipo === 'erro'
                                        ? '#dc2626'
                                        : feedback.tipo === 'carregando'
                                            ? '#2563eb'
                                            : '#16a34a'
                            }}
                        >
                            {feedback.tipo === 'erro' ? '!' : feedback.tipo === 'carregando' ? '⏳' : '✓'}
                        </div>

                        <div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>
                                {feedback.titulo}
                            </h3>

                            <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '19px', lineHeight: 1.45 }}>
                                {feedback.mensagem}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {confirmacaoExclusao && (
                <div style={style.modalOverlay}>
                    <div style={style.modalConfirmacao}>
                        <h2 style={{ margin: 0, color: '#991b1b' }}>Excluir alerta?</h2>

                        <p style={{ color: '#475569', lineHeight: 1.5, fontSize: '18px' }}>
                            Essa ação vai remover a regra e também os registros disparados por ela, incluindo o histórico de vistos.
                        </p>

                        <p style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '18px' }}>
                            {confirmacaoExclusao.texto}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                className="button-padrao"
                                style={style.btnCancelarModal}
                                onClick={() => setConfirmacaoExclusao(null)}
                            >
                                Cancelar
                            </button>

                            <button
                                className="button-padrao"
                                style={style.btnConfirmarExcluir}
                                onClick={excluirAlertaConfirmado}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'center' }}>
                <button
                    className="button-padrao"
                    style={style.buttonVoltar}
                    onClick={() => {
                        if (telaAtual === 'criacao') {
                            limparFormulario();
                            setTelaAtual('listagem');
                        } else {
                            navigate(-1);
                        }
                    }}
                >
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }} />
                </button>

                <h1 style={style.titleStyle}>
                    {telaAtual === 'listagem'
                        ? 'Painel de Alertas'
                        : modoEdicao
                            ? 'Editar Alerta'
                            : 'Criar Nova Lógica de Alerta'
                    }
                </h1>
            </div>

            <hr />

            {telaAtual === 'listagem' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '540px', width: '100%', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
                            Regras Salvas
                        </h2>

                        <button
                            className="button-padrao"
                            style={style.btnAdicionar}
                            onClick={abrirTelaCriacao}
                            disabled={carregandoDados}
                        >
                            {carregandoDados ? 'Carregando dados...' : '➕ Adicionar Novo Alerta'}
                        </button>
                    </div>

                    <div style={style.containerCards}>
                        {alertasOrdenados.map((alerta) => {
                            const ehAluno = alerta.tipoAlvo === 'Aluno' || alerta.texto?.includes('aluno');

                            const ocorrenciasAtivas = getOcorrenciasAtivasDaRegra(alerta);
                            const historicoVistos = getHistoricoVistosDaRegra(alerta);

                            const temOcorrencia = ocorrenciasAtivas.length > 0;
                            const quantidadeOcorrencias = ocorrenciasAtivas.length;
                            const ocorrenciaUnica = quantidadeOcorrencias === 1 ? ocorrenciasAtivas[0] : null;

                            let corFundo = ehAluno ? '#ffe8dd' : '#fccccc';

                            if (temOcorrencia) {
                                corFundo = '#fee2e2';
                            }

                            const opacidadeCard = alerta.ativo ? 1 : 0.6;
                            const estaDetalhado = alertaDetalhado === alerta.id;

                            return (
                                <div key={alerta.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div
                                        style={{
                                            ...style.cardAlertaReal,
                                            backgroundColor: corFundo,
                                            opacity: opacidadeCard,
                                            border: temOcorrencia ? '2px solid #ef4444' : '1px solid rgba(0,0,0,0.05)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setAlertaDetalhado(estaDetalhado ? null : alerta.id)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                            <span style={{ fontSize: '26px' }}>
                                                {temOcorrencia ? '🚨' : alerta.ativo ? '🔔' : '🔕'}
                                            </span>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <p style={{ fontSize: '19px', margin: 0, fontWeight: 'bold', color: '#1e3a8a' }}>
                                                    {alerta.texto}
                                                </p>

                                                {temOcorrencia && quantidadeOcorrencias === 1 && (
                                                    <span style={{ fontSize: '15px', color: '#dc2626', fontWeight: 'bold', marginTop: '2px' }}>
                                                        ⚠️ Responsável: {ocorrenciaUnica.causador} ({ocorrenciaUnica.turma}) — {ocorrenciaUnica.quantidadeFaltasAtual} falta(s). Clique para ver as datas.
                                                    </span>
                                                )}

                                                {temOcorrencia && quantidadeOcorrencias > 1 && (
                                                    <span style={{ fontSize: '15px', color: '#dc2626', fontWeight: 'bold', marginTop: '2px' }}>
                                                        ⚠️ {quantidadeOcorrencias} estouro(s) detectado(s). Clique para ver responsáveis e datas.
                                                    </span>
                                                )}

                                                {!temOcorrencia && historicoVistos.length > 0 && (
                                                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 'bold', marginTop: '2px' }}>
                                                        📚 {historicoVistos.length} registro(s) no histórico de vistos.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {temOcorrencia && quantidadeOcorrencias === 1 && (
                                                <button
                                                    className="button-padrao"
                                                    style={style.btnMarcarLido}
                                                    onClick={() => marcarOcorrenciaComoLida(ocorrenciaUnica.id)}
                                                >
                                                    Visto ✓
                                                </button>
                                            )}

                                            <button
                                                className="button-padrao"
                                                onClick={() => alternarStatusAlerta(alerta)}
                                                style={{
                                                    ...style.btnStatusToggle,
                                                    backgroundColor: alerta.ativo ? '#2e7d32' : '#78909c'
                                                }}
                                            >
                                                {alerta.ativo ? 'Ligado' : 'Desligado'}
                                            </button>

                                            <button
                                                className="button-padrao"
                                                onClick={() => abrirTelaEdicao(alerta)}
                                                style={style.btnEditarAlerta}
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                className="button-padrao"
                                                onClick={() => solicitarExclusaoAlerta(alerta)}
                                                style={style.btnDeletarAlerta}
                                            >
                                                <img src={icone04} alt="Excluir" style={{ width: '18px', height: '18px' }} />
                                            </button>
                                        </div>
                                    </div>

                                    {estaDetalhado && renderizarPainelDetalhes(alerta, ocorrenciasAtivas, historicoVistos)}
                                </div>
                            );
                        })}

                        {alertasCriados.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                                Nenhuma regra criada.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '370px', width: '100%', gap: '15px', paddingTop: '5px' }}>
                    <div style={style.linhaConstrutor}>
                        <div style={style.blocoFluxo}>
                            <span style={style.textoFixoFrase}>Se...</span>

                            <select
                                value={tipoAlvo}
                                onChange={(e) => {
                                    setTipoAlvo(e.target.value);
                                    setTurmaSelecionada('');
                                    setAlunoSelecionado('');
                                }}
                                style={style.selectFrase}
                            >
                                <option value="Aluno">Aluno</option>
                                <option value="Turma">Turma</option>
                            </select>

                            <select
                                value={escopo}
                                onChange={(e) => {
                                    setEscopo(e.target.value);
                                    setTurmaSelecionada('');
                                    setAlunoSelecionado('');
                                }}
                                style={style.selectFrase}
                            >
                                <option value="Todos">Todos</option>
                                <option value="Especifico">Especifico</option>
                            </select>

                            {escopo === 'Especifico' && tipoAlvo === 'Turma' && (
                                <select
                                    value={turmaSelecionada}
                                    onChange={(e) => setTurmaSelecionada(e.target.value)}
                                    style={style.selectFrase}
                                >
                                    <option value="">Selecione a Turma...</option>

                                    {listaTurmasBD.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {escopo === 'Especifico' && tipoAlvo === 'Aluno' && (
                                <>
                                    <select
                                        value={turmaSelecionada}
                                        onChange={(e) => {
                                            setTurmaSelecionada(e.target.value);
                                            setAlunoSelecionado('');
                                        }}
                                        style={style.selectFrase}
                                    >
                                        <option value="">Selecione a Turma...</option>

                                        {listaTurmasBD.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>

                                    {turmaSelecionada && (
                                        <select
                                            value={alunoSelecionado}
                                            onChange={(e) => setAlunoSelecionado(e.target.value)}
                                            style={style.selectFrase}
                                        >
                                            <option value="">Selecione o Aluno...</option>

                                            {(mapaAlunosPorTurma[turmaSelecionada] || []).map((a) => (
                                                <option key={a} value={a}>
                                                    {a}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </>
                            )}
                        </div>

                        <span style={style.flechaIndicativa}>➔</span>

                        <div style={style.blocoFluxo2}>
                            <span style={style.textoFixoFrase}>atingir</span>

                            <input
                                type="number"
                                min="1"
                                placeholder="Ex: 30"
                                value={quantidadeFaltas}
                                onChange={(e) => setQuantidadeFaltas(e.target.value)}
                                style={style.inputNumeroFrase}
                            />

                            <span style={style.textoFixoFrase}>de faltas</span>

                            <select
                                value={tipoPeriodo}
                                onChange={(e) => setTipoPeriodo(e.target.value)}
                                style={style.selectFrase}
                            >
                                <option value="Seguidas">Seguidas</option>
                                <option value="Mensal">Mensal</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>

                        <span style={style.flechaIndicativa}>➔</span>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={style.tagGerarAlerta}>gerar alerta 🔔</span>
                        </div>
                    </div>

                    <div style={style.containerPreview}>
                        <h2 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '19px' }}>
                            Visualização do Alerta:
                        </h2>

                        <p style={style.styleTextoPreview}>
                            {gerarTextoLogica()}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                        <button
                            className="button-padrao"
                            style={style.btnSalvar}
                            onClick={salvarAlerta}
                        >
                            {modoEdicao ? 'Salvar Alterações' : 'Salvar Alerta'}
                        </button>

                        <button
                            className="button-padrao"
                            style={style.btnCancelar}
                            onClick={() => {
                                limparFormulario();
                                setTelaAtual('listagem');
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const style = {
    titleStyle: {
        fontSize: '30px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 4px 0'
    },

    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '1400px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '4px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
    },

    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '30px',
        height: '30px',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    btnAdicionar: {
        backgroundColor: '#1e3a8a',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        height: '30px',
        display: 'flex',
        alignItems: 'center'
    },

    textoFixoFrase: {
        fontSize: '19px',
        fontWeight: 'bold',
        color: '#1e3a8a',
        backgroundColor: '#ffffff',
        padding: '6px 14px',
        borderRadius: '20px',
        border: '1px solid #ffeeba',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginLeft: '5px'
    },

    selectFrase: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '2px solid #e0d6ff',
        fontSize: '19px',
        fontFamily: 'inherit',
        fontWeight: 'bold',
        color: '#1e3a8a',
        backgroundColor: '#f4f1ff',
        cursor: 'pointer'
    },

    inputNumeroFrase: {
        width: '100px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '2px solid #e0d6ff',
        fontSize: '19px',
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#1e3a8a'
    },

    containerPreview: {
        padding: '20px',
        backgroundColor: '#e0d6ff',
        borderRadius: '12px',
        borderLeft: '6px solid #1e3a8a'
    },

    styleTextoPreview: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#1e3a8a',
        margin: 0
    },

    btnSalvar: {
        backgroundColor: '#2e7d32',
        color: '#fff',
        padding: '12px 25px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    btnCancelar: {
        backgroundColor: '#cfd8dc',
        color: '#374151',
        padding: '12px 25px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    tagGerarAlerta: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1e3a8a',
        backgroundColor: '#fffdfd',
        padding: '6px 14px',
        borderRadius: '20px',
        border: '3px solid #ff8181',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginLeft: '5px'
    },

    linhaConstrutor: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '15px'
    },

    blocoFluxo: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffe8dd',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid #e9ecef'
    },

    blocoFluxo2: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#fccccc',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid #e9ecef'
    },

    flechaIndicativa: {
        fontSize: '20px',
        color: '#a0aec0',
        fontWeight: 'bold',
        userSelect: 'none',
        padding: '0 4px'
    },

    containerCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '15px',
        backgroundColor: '#fff',
        height: '100%',
        overflowY: 'auto'
    },

    cardAlertaReal: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderRadius: '12px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease'
    },

    btnStatusToggle: {
        border: 'none',
        color: '#fff',
        padding: '6px 16px',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '15px',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease-in-out'
    },

    btnEditarAlerta: {
        height: '35px',
        width: '35px',
        border: '1px solid #bfdbfe',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease'
    },

    btnDeletarAlerta: {
        height: '35px',
        width: '35px',
        border: '1px solid #ffcdd2',
        backgroundColor: '#fff',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease'
    },

    btnMarcarLido: {
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },

    painelDetalhes: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '5px solid #ef4444',
        padding: '14px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    headerDetalhes: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'flex-start'
    },

    tituloDetalhes: {
        margin: 0,
        fontSize: '20px',
        color: '#1e293b'
    },

    subtituloDetalhes: {
        margin: '4px 0 0 0',
        color: '#475569',
        fontSize: '16px'
    },

    btnFecharDetalhes: {
        backgroundColor: '#e2e8f0',
        color: '#334155',
        border: 'none',
        padding: '7px 12px',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    blocoDetalhe: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },

    tituloBlocoDetalhe: {
        margin: 0,
        color: '#991b1b',
        fontSize: '16px'
    },

    cardOcorrenciaDetalhe: {
        backgroundColor: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    linhaResumoOcorrencia: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        color: '#1e293b'
    },

    tagQuantidade: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '15px',
        fontWeight: 'bold'
    },

    textoInfoOcorrencia: {
        margin: 0,
        color: '#475569',
        fontSize: '15px'
    },

    tituloDatas: {
        margin: '4px 0 0 0',
        color: '#334155',
        fontSize: '16px'
    },

    listaDatas: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },

    itemDataFalta: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        fontSize: '15px'
    },

    rodapeOcorrencia: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        color: '#64748b',
        marginTop: '4px'
    },

    cardHistorico: {
        backgroundColor: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },

    textoHistoricoPrincipal: {
        margin: 0,
        color: '#1e293b',
        fontSize: '16px'
    },

    textoDescricaoHistorico: {
        margin: 0,
        color: '#475569',
        fontSize: '15px',
        lineHeight: 1.45
    },

    detailsHistorico: {
        marginTop: '4px',
        color: '#334155',
        fontSize: '15px',
        cursor: 'pointer'
    },

    textoVazioDetalhes: {
        margin: 0,
        color: '#64748b',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px'
    },

    feedbackOverlay: {
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        animation: 'fadeIn 0.25s ease',
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        pointerEvents: 'all'
    },

    feedbackCard: {
        backgroundColor: '#ffffff',
        border: '2px solid #bbf7d0',
        borderRadius: '18px',
        padding: '24px 28px',
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.22)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '420px',
        maxWidth: '560px'
    },

    feedbackIcone: {
        width: '58px',
        height: '58px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '30px',
        flexShrink: 0
    },

    modalOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        borderRadius: '12px'
    },

    modalConfirmacao: {
        width: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    btnCancelarModal: {
        backgroundColor: '#e2e8f0',
        color: '#334155',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },

    btnConfirmarExcluir: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
};

export default Alertas;
