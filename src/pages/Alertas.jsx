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
    const [prioridadeAlerta, setPrioridadeAlerta] = useState('Media');

    const [feedback, setFeedback] = useState(null);
    const [confirmacaoExclusao, setConfirmacaoExclusao] = useState(null);
    const [mostrarAjudaLogica, setMostrarAjudaLogica] = useState(false);
    const [termoPesquisaAlertas, setTermoPesquisaAlertas] = useState('');
    const [filtroPrioridade, setFiltroPrioridade] = useState('Todas');
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [filtroTipoAlvo, setFiltroTipoAlvo] = useState('Todos');
    const [filtroOcorrencias, setFiltroOcorrencias] = useState('Todos');

    const botoesBloqueados = !!feedback;

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
        setPrioridadeAlerta('Media');
        setMostrarAjudaLogica(false);
    };

    const limparSelecoesLogica = () => {
        setTipoAlvo('Turma');
        setEscopo('Todos');
        setTurmaSelecionada('');
        setAlunoSelecionado('');
        setQuantidadeFaltas('');
        setTipoPeriodo('Mensal');
        setPrioridadeAlerta('Media');
    };

    const aplicarPreMontagem = (modelo) => {
        setTurmaSelecionada('');
        setAlunoSelecionado('');

        if (modelo === 'aluno-seguidas') {
            setTipoAlvo('Aluno');
            setEscopo('Todos');
            setQuantidadeFaltas('3');
            setTipoPeriodo('Seguidas');
            setPrioridadeAlerta('Alta');
        }

        if (modelo === 'aluno-mensal') {
            setTipoAlvo('Aluno');
            setEscopo('Todos');
            setQuantidadeFaltas('5');
            setTipoPeriodo('Mensal');
            setPrioridadeAlerta('Media');
        }

        if (modelo === 'turma-mensal') {
            setTipoAlvo('Turma');
            setEscopo('Todos');
            setQuantidadeFaltas('20');
            setTipoPeriodo('Mensal');
            setPrioridadeAlerta('Baixa');
        }

        if (modelo === 'turma-seguidas') {
            setTipoAlvo('Turma');
            setEscopo('Todos');
            setQuantidadeFaltas('3');
            setTipoPeriodo('Seguidas');
            setPrioridadeAlerta('Alta');
        }
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

    const normalizarPrioridade = (prioridade) => {
        return ['Baixa', 'Media', 'Alta'].includes(prioridade) ? prioridade : 'Media';
    };

    const getConfigPrioridade = (prioridade) => {
        const prioridadeNormalizada = normalizarPrioridade(prioridade);

        const mapa = {
            Alta: {
                label: 'Alta',
                icone: '🚨',
                cor: '#b91c1c',
                fundo: '#fef2f2',
                borda: '#ef4444',
                suave: '#fee2e2',
                peso: 3
            },
            Media: {
                label: 'Média',
                icone: '⚠️',
                cor: '#92400e',
                fundo: '#fffbeb',
                borda: '#f59e0b',
                suave: '#fef3c7',
                peso: 2
            },
            Baixa: {
                label: 'Baixa',
                icone: '🔔',
                cor: '#166534',
                fundo: '#f0fdf4',
                borda: '#22c55e',
                suave: '#dcfce7',
                peso: 1
            }
        };

        return mapa[prioridadeNormalizada];
    };

    const normalizarTextoPesquisa = (valor) => {
        return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    const obterResumoAlvo = (alerta) => {
        if (alerta.escopo === 'Especifico' && alerta.tipoAlvo === 'Aluno') {
            return {
                aluno: alerta.alunoAlvo || 'Aluno não informado',
                turma: alerta.turmaAlvo || 'Turma não informada',
                texto: 'Aluno específico'
            };
        }

        if (alerta.escopo === 'Especifico' && alerta.tipoAlvo === 'Turma') {
            return {
                aluno: null,
                turma: alerta.turmaAlvo || 'Turma não informada',
                texto: 'Turma específica'
            };
        }

        return {
            aluno: alerta.tipoAlvo === 'Aluno' ? 'qualquer aluno' : null,
            turma: alerta.tipoAlvo === 'Turma' ? 'qualquer turma' : 'todas as turmas',
            texto: alerta.tipoAlvo === 'Aluno' ? 'Todos os alunos' : 'Todas as turmas'
        };
    };

    const renderizarTextoAlerta = (alerta) => {
        const resumo = obterResumoAlvo(alerta);
        const quantidade = alerta.quantidadeFaltas || 'X';
        const periodo = alerta.tipoPeriodo === 'Seguidas'
            ? 'faltas seguidas'
            : alerta.tipoPeriodo === 'Anual'
                ? 'faltas no ano'
                : 'faltas no mês';

        if (alerta.tipoAlvo === 'Aluno') {
            const textoTurma = alerta.escopo === 'Especifico' ? 'da turma' : 'em';

            return (
                <span>
                    Avisar quando <strong style={style.realceAluno}>{resumo.aluno}</strong>
                    {' '}{textoTurma} <strong style={style.realceTurma}>{resumo.turma}</strong>
                    {' '}atingir <strong>{quantidade}</strong> {periodo}.
                </span>
            );
        }

        return (
            <span>
                Avisar quando <strong style={style.realceTurma}>{resumo.turma}</strong>
                {' '}atingir <strong>{quantidade}</strong> {periodo}.
            </span>
        );
    };


    const obterDataISODeValor = (valor) => {
        if (!valor) return '';

        if (typeof valor === 'string') {
            return valor.slice(0, 10);
        }

        if (typeof valor.toDate === 'function') {
            return valor.toDate().toISOString().slice(0, 10);
        }

        if (valor.seconds) {
            return new Date(valor.seconds * 1000).toISOString().slice(0, 10);
        }

        return '';
    };

    const obterDiaSemanaPorData = (dataISO) => {
        if (!dataISO) return '';

        const data = new Date(dataISO + 'T12:00:00');

        if (Number.isNaN(data.getTime())) {
            return '';
        }

        const dia = data.toLocaleDateString('pt-BR', { weekday: 'long' });
        return dia.charAt(0).toUpperCase() + dia.slice(1);
    };

    const obterNomeFalta = (falta) => {
        if (typeof falta === 'string') return falta;
        return falta?.nome || falta?.aluno || falta?.nomeAluno || '';
    };

    const obterFaltasNormalizadas = (chamada) => {
        return (chamada.faltas || [])
            .map((falta) => ({
                nome: obterNomeFalta(falta),
                justificada: Boolean(falta?.justificada)
            }))
            .filter((falta) => falta.nome);
    };

    const criarItemFaltaConsiderada = (chamada, faltasDoDia) => {
        const data = chamada.data || chamada.id || '';

        return {
            data,
            diaDaSemana: chamada.diaDaSemana || obterDiaSemanaPorData(data),
            alunos: faltasDoDia.map((falta) => falta.nome),
            quantidadeFaltasDia: faltasDoDia.length,
            quantidadeJustificadas: faltasDoDia.filter((falta) => falta.justificada).length
        };
    };

    const obterDataBaseOcorrencia = (ocorrencia) => {
        return (
            obterDataISODeValor(ocorrencia.dataReferencia)
            || obterDataISODeValor(ocorrencia.dataDisparo)
            || obterDataISODeValor(ocorrencia.criadoEm)
            || obterDataISODeValor(ocorrencia.atualizadoEm)
            || new Date().toISOString().slice(0, 10)
        );
    };

    const obterReferenciaPeriodo = (ocorrencia, tipoPeriodo) => {
        const textoPeriodo = normalizarTextoPesquisa(ocorrencia.periodoReferencia || '');
        const dataBase = obterDataBaseOcorrencia(ocorrencia);
        const [anoBase, mesBase] = dataBase.split('-').map(Number);

        const meses = {
            janeiro: 1,
            fevereiro: 2,
            marco: 3,
            abril: 4,
            maio: 5,
            junho: 6,
            julho: 7,
            agosto: 8,
            setembro: 9,
            outubro: 10,
            novembro: 11,
            dezembro: 12
        };

        const referencia = {
            ano: anoBase,
            mes: tipoPeriodo === 'Mensal' ? mesBase : null
        };

        const padraoAnoMes = textoPeriodo.match(/(\d{4})-(\d{1,2})/);
        const padraoMesAno = textoPeriodo.match(/(\d{1,2})\/(\d{4})/);
        const padraoAno = textoPeriodo.match(/(\d{4})/);
        const mesPorNome = Object.entries(meses).find(([nome]) => textoPeriodo.includes(nome));

        if (padraoAnoMes) {
            referencia.ano = Number(padraoAnoMes[1]);
            referencia.mes = Number(padraoAnoMes[2]);
        } else if (padraoMesAno) {
            referencia.mes = Number(padraoMesAno[1]);
            referencia.ano = Number(padraoMesAno[2]);
        } else if (padraoAno) {
            referencia.ano = Number(padraoAno[1]);
        }

        if (mesPorNome) {
            referencia.mes = mesPorNome[1];
        }

        return referencia;
    };

    const dataPertenceAoPeriodo = (dataISO, tipoPeriodo, referencia) => {
        if (!dataISO) return false;
        if (tipoPeriodo === 'Seguidas') return true;

        const [ano, mes] = dataISO.split('-').map(Number);

        if (tipoPeriodo === 'Anual') {
            return ano === referencia.ano;
        }

        return ano === referencia.ano && mes === referencia.mes;
    };

    const obterChamadasDaOcorrencia = (ocorrencia, regra, chamadasPorTurma) => {
        const nomeTurma = ocorrencia.turma || regra?.turmaAlvo;
        const dataBase = obterDataBaseOcorrencia(ocorrencia);
        const tipoPeriodo = regra?.tipoPeriodo || ocorrencia.tipoPeriodo || 'Mensal';
        const referencia = obterReferenciaPeriodo(ocorrencia, tipoPeriodo);
        const chamadas = chamadasPorTurma[nomeTurma] || [];

        return chamadas
            .filter((chamada) => {
                const dataChamada = chamada.data || chamada.id;

                return (
                    dataChamada
                    && dataChamada <= dataBase
                    && dataPertenceAoPeriodo(dataChamada, tipoPeriodo, referencia)
                );
            })
            .sort((a, b) => (a.data || a.id).localeCompare(b.data || b.id));
    };

    const montarFaltasAluno = (ocorrencia, regra, chamadasPorTurma) => {
        const nomeAluno = ocorrencia.causador || regra?.alunoAlvo;
        const alunoNormalizado = normalizarTextoPesquisa(nomeAluno);
        const tipoPeriodo = regra?.tipoPeriodo || ocorrencia.tipoPeriodo || 'Mensal';
        const chamadas = obterChamadasDaOcorrencia(ocorrencia, regra, chamadasPorTurma);

        if (!alunoNormalizado) return [];

        if (tipoPeriodo === 'Seguidas') {
            let sequenciaAtual = [];

            chamadas.forEach((chamada) => {
                const faltaAluno = obterFaltasNormalizadas(chamada)
                    .find((falta) => normalizarTextoPesquisa(falta.nome) === alunoNormalizado);

                if (faltaAluno) {
                    sequenciaAtual = [
                        ...sequenciaAtual,
                        criarItemFaltaConsiderada(chamada, [faltaAluno])
                    ];
                } else {
                    sequenciaAtual = [];
                }
            });

            return sequenciaAtual;
        }

        return chamadas
            .map((chamada) => {
                const faltaAluno = obterFaltasNormalizadas(chamada)
                    .find((falta) => normalizarTextoPesquisa(falta.nome) === alunoNormalizado);

                return faltaAluno ? criarItemFaltaConsiderada(chamada, [faltaAluno]) : null;
            })
            .filter(Boolean);
    };

    const montarFaltasTurma = (ocorrencia, regra, chamadasPorTurma) => {
        const tipoPeriodo = regra?.tipoPeriodo || ocorrencia.tipoPeriodo || 'Mensal';
        const chamadas = obterChamadasDaOcorrencia(ocorrencia, regra, chamadasPorTurma);

        if (tipoPeriodo === 'Seguidas') {
            let sequenciaAtual = [];

            chamadas.forEach((chamada) => {
                const faltasDoDia = obterFaltasNormalizadas(chamada);

                if (faltasDoDia.length > 0) {
                    sequenciaAtual = [
                        ...sequenciaAtual,
                        criarItemFaltaConsiderada(chamada, faltasDoDia)
                    ];
                } else {
                    sequenciaAtual = [];
                }
            });

            return sequenciaAtual;
        }

        return chamadas
            .map((chamada) => {
                const faltasDoDia = obterFaltasNormalizadas(chamada);

                return faltasDoDia.length > 0
                    ? criarItemFaltaConsiderada(chamada, faltasDoDia)
                    : null;
            })
            .filter(Boolean);
    };

    const montarFaltasConsideradas = (ocorrencia, regra, chamadasPorTurma) => {
        const tipoAlvo = regra?.tipoAlvo || (ocorrencia.causador ? 'Aluno' : 'Turma');

        if (tipoAlvo === 'Aluno') {
            return montarFaltasAluno(ocorrencia, regra, chamadasPorTurma);
        }

        return montarFaltasTurma(ocorrencia, regra, chamadasPorTurma);
    };

    const carregarChamadasPorTurma = async (turmasBase) => {
        const pares = await Promise.all(
            turmasBase.map(async (turma) => {
                if (!turma.id) return [turma.nome, []];

                const chamadasSnapshot = await getDocs(collection(db, 'turmas', turma.id, 'chamadas'));
                const chamadas = [];

                chamadasSnapshot.forEach((docSnap) => {
                    const dados = docSnap.data();

                    chamadas.push({
                        id: docSnap.id,
                        data: dados.data || docSnap.id,
                        diaDaSemana: dados.diaDaSemana || '',
                        faltas: Array.isArray(dados.faltas) ? dados.faltas : []
                    });
                });

                chamadas.sort((a, b) => (a.data || a.id).localeCompare(b.data || b.id));
                return [turma.nome, chamadas];
            })
        );

        return pares.reduce((mapa, [nomeTurma, chamadas]) => {
            if (nomeTurma) {
                mapa[nomeTurma] = chamadas;
            }

            return mapa;
        }, {});
    };

    const completarHistoricoFaltasDosDisparos = async (disparos, regras, turmasBase) => {
        const disparosSemHistorico = disparos.filter(
            (disparo) => !Array.isArray(disparo.faltasConsideradas) || disparo.faltasConsideradas.length === 0
        );

        if (disparosSemHistorico.length === 0) {
            return disparos;
        }

        const regrasPorId = regras.reduce((mapa, regra) => {
            mapa[regra.id] = regra;
            return mapa;
        }, {});

        const chamadasPorTurma = await carregarChamadasPorTurma(turmasBase);
        const momentoAtualizacao = new Date().toISOString();
        const atualizacoes = [];

        const disparosComHistorico = disparos.map((disparo) => {
            if (Array.isArray(disparo.faltasConsideradas) && disparo.faltasConsideradas.length > 0) {
                return disparo;
            }

            const regra = regrasPorId[disparo.id_regra];
            const faltasConsideradas = montarFaltasConsideradas(disparo, regra, chamadasPorTurma);

            if (faltasConsideradas.length === 0) {
                return disparo;
            }

            const complemento = {
                faltasConsideradas,
                historicoFaltasAtualizadoEm: momentoAtualizacao
            };

            atualizacoes.push(
                updateDoc(doc(db, 'alertas_disparados', disparo.id), complemento)
                    .catch((error) => {
                        console.warn('Nao foi possivel gravar o historico reconstruido do alerta:', error);
                    })
            );

            return {
                ...disparo,
                ...complemento
            };
        });

        if (atualizacoes.length > 0) {
            await Promise.all(atualizacoes);
        }

        return disparosComHistorico;
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

            const turmasSnapshot = await getDocs(collection(db, 'turmas'));
            const nomesTurmas = [];
            const vinculoAlunos = {};
            const turmasBase = [];

            turmasSnapshot.forEach((docSnap) => {
                const dados = docSnap.data();

                if (dados.nome) {
                    nomesTurmas.push(dados.nome);
                    vinculoAlunos[dados.nome] = dados.alunos || [];
                    turmasBase.push({
                        id: docSnap.id,
                        ...dados
                    });
                }
            });

            nomesTurmas.sort();
            setListaTurmasBD(nomesTurmas);
            setMapaAlunosPorTurma(vinculoAlunos);

            const disparosComHistorico = await completarHistoricoFaltasDosDisparos(
                disparosCarregados,
                regrasCarregadas,
                turmasBase
            );

            setAlertasDisparados(disparosComHistorico);
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
        setPrioridadeAlerta(alerta.prioridade || 'Media');

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
                prioridade: prioridadeAlerta,
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

        const prioridadeA = getConfigPrioridade(a.prioridade).peso;
        const prioridadeB = getConfigPrioridade(b.prioridade).peso;

        if (prioridadeA !== prioridadeB) {
            return prioridadeB - prioridadeA;
        }

        if (a.ativo !== b.ativo) {
            return a.ativo ? -1 : 1;
        }

        const dataA = new Date(a.criadoEm || 0).getTime();
        const dataB = new Date(b.criadoEm || 0).getTime();

        return dataB - dataA;
    });

    const alertasFiltrados = alertasOrdenados.filter((alerta) => {
        const ocorrenciasAtivas = getOcorrenciasAtivasDaRegra(alerta);
        const historicoVistos = getHistoricoVistosDaRegra(alerta);
        const prioridade = normalizarPrioridade(alerta.prioridade);
        const termo = normalizarTextoPesquisa(termoPesquisaAlertas);
        const resumo = obterResumoAlvo(alerta);

        if (filtroPrioridade !== 'Todas' && prioridade !== filtroPrioridade) return false;

        if (filtroStatus === 'Ligados' && !alerta.ativo) return false;
        if (filtroStatus === 'Desligados' && alerta.ativo) return false;

        if (filtroTipoAlvo !== 'Todos' && alerta.tipoAlvo !== filtroTipoAlvo) return false;

        if (filtroOcorrencias === 'Ativas' && ocorrenciasAtivas.length === 0) return false;
        if (filtroOcorrencias === 'SemAtivas' && ocorrenciasAtivas.length > 0) return false;
        if (filtroOcorrencias === 'Historico' && historicoVistos.length === 0) return false;

        if (!termo) return true;

        const textoBusca = normalizarTextoPesquisa([
            alerta.texto,
            alerta.tipoAlvo,
            alerta.escopo,
            alerta.turmaAlvo,
            alerta.alunoAlvo,
            resumo.aluno,
            resumo.turma,
            resumo.texto,
            prioridade,
            getConfigPrioridade(alerta.prioridade).label,
            alerta.tipoPeriodo
        ].filter(Boolean).join(' '));

        return textoBusca.includes(termo);
    });

    const totalOcorrenciasAtivas = alertasCriados.reduce(
        (total, alerta) => total + getOcorrenciasAtivasDaRegra(alerta).length,
        0
    );
    const totalAltaPrioridade = alertasCriados.filter((alerta) => normalizarPrioridade(alerta.prioridade) === 'Alta').length;
    const totalAlertasPausados = alertasCriados.filter((alerta) => alerta.ativo === false).length;

    const renderizarFaltasConsideradas = (ocorrencia) => {
        const faltas = ocorrencia.faltasConsideradas || [];

        if (faltas.length === 0) {
            return (
                <p style={style.textoVazioDetalhes}>
                    Não encontrei chamadas salvas que correspondam a este disparo. Verifique se a turma, o aluno e o período ainda existem nas chamadas registradas.
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
                    disabled={botoesBloqueados}
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
                                    disabled={botoesBloqueados}
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
        <div style={style.containerPrincipal}>
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
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '22px' }}>
                                {feedback.titulo}
                            </h3>

                            <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '17px', lineHeight: 1.45 }}>
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

                        <p style={{ color: '#475569', lineHeight: 1.5 }}>
                            Essa ação vai remover a regra e também os registros disparados por ela, incluindo o histórico de vistos.
                        </p>

                        <p style={{ color: '#1e293b', fontWeight: 'bold' }}>
                            {confirmacaoExclusao.texto}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                className="button-padrao"
                                style={style.btnCancelarModal}
                                onClick={() => setConfirmacaoExclusao(null)}
                            disabled={botoesBloqueados}
                            >
                                Cancelar
                            </button>

                            <button
                                className="button-padrao"
                                style={style.btnConfirmarExcluir}
                                onClick={excluirAlertaConfirmado}
                            disabled={botoesBloqueados}
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
                disabled={botoesBloqueados}
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
                <div style={style.telaListagem}>
                    <div style={style.headerListagem}>
                        <div>
                            <h2 style={style.tituloSecaoListagem}>Regras Salvas</h2>
                            <p style={style.subtituloSecaoListagem}>
                                Acompanhe alertas ativos, histórico de vistos e regras pausadas.
                            </p>
                        </div>

                        <button
                            className="button-padrao"
                            style={style.btnAdicionar}
                            onClick={abrirTelaCriacao}
                            disabled={carregandoDados || botoesBloqueados}
                        >
                            {carregandoDados ? 'Carregando dados...' : '+ Adicionar Novo Alerta'}
                        </button>
                    </div>

                    <div style={style.painelResumoAlertas}>
                        <div style={style.cardResumoAlerta}>
                            <span>Regras</span>
                            <strong>{alertasCriados.length}</strong>
                        </div>

                        <div style={{ ...style.cardResumoAlerta, borderColor: '#fecaca', backgroundColor: '#fff5f5' }}>
                            <span>Ocorrências ativas</span>
                            <strong>{totalOcorrenciasAtivas}</strong>
                        </div>

                        <div style={{ ...style.cardResumoAlerta, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
                            <span>Alta prioridade</span>
                            <strong>{totalAltaPrioridade}</strong>
                        </div>

                        <div style={style.cardResumoAlerta}>
                            <span>Pausados</span>
                            <strong>{totalAlertasPausados}</strong>
                        </div>
                    </div>

                    <div style={style.barraFiltrosAlertas}>
                        <input
                            type="text"
                            placeholder="Pesquisar por aluno, turma, regra..."
                            value={termoPesquisaAlertas}
                            onChange={(e) => setTermoPesquisaAlertas(e.target.value)}
                            style={style.inputPesquisaAlertas}
                            disabled={botoesBloqueados}
                        />

                        <select
                            value={filtroPrioridade}
                            onChange={(e) => setFiltroPrioridade(e.target.value)}
                            style={style.selectFiltroAlerta}
                            disabled={botoesBloqueados}
                        >
                            <option value="Todas">Todas as prioridades</option>
                            <option value="Alta">Alta</option>
                            <option value="Media">Média</option>
                            <option value="Baixa">Baixa</option>
                        </select>

                        <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            style={style.selectFiltroAlerta}
                            disabled={botoesBloqueados}
                        >
                            <option value="Todos">Todos os status</option>
                            <option value="Ligados">Ligados</option>
                            <option value="Desligados">Desligados</option>
                        </select>

                        <select
                            value={filtroTipoAlvo}
                            onChange={(e) => setFiltroTipoAlvo(e.target.value)}
                            style={style.selectFiltroAlerta}
                            disabled={botoesBloqueados}
                        >
                            <option value="Todos">Todos os alvos</option>
                            <option value="Aluno">Aluno</option>
                            <option value="Turma">Turma</option>
                        </select>

                        <select
                            value={filtroOcorrencias}
                            onChange={(e) => setFiltroOcorrencias(e.target.value)}
                            style={style.selectFiltroAlerta}
                            disabled={botoesBloqueados}
                        >
                            <option value="Todos">Todas as ocorrências</option>
                            <option value="Ativas">Com ocorrência ativa</option>
                            <option value="SemAtivas">Sem ocorrência ativa</option>
                            <option value="Historico">Com histórico</option>
                        </select>
                    </div>

                    <div style={style.containerCards}>
                        {alertasFiltrados.map((alerta) => {
                            const ocorrenciasAtivas = getOcorrenciasAtivasDaRegra(alerta);
                            const historicoVistos = getHistoricoVistosDaRegra(alerta);
                            const prioridade = getConfigPrioridade(alerta.prioridade);
                            const resumoAlvo = obterResumoAlvo(alerta);

                            const temOcorrencia = ocorrenciasAtivas.length > 0;
                            const quantidadeOcorrencias = ocorrenciasAtivas.length;
                            const ocorrenciaUnica = quantidadeOcorrencias === 1 ? ocorrenciasAtivas[0] : null;
                            const estaDetalhado = alertaDetalhado === alerta.id;
                            const opacidadeCard = alerta.ativo ? 1 : 0.58;

                            return (
                                <div key={alerta.id} style={style.wrapperCardAlerta}>
                                    <div
                                        style={{
                                            ...style.cardAlertaReal,
                                            borderColor: temOcorrencia ? prioridade.borda : '#e2e8f0',
                                            borderLeftColor: prioridade.borda,
                                            backgroundColor: temOcorrencia ? prioridade.fundo : '#ffffff',
                                            opacity: opacidadeCard,
                                            boxShadow: temOcorrencia
                                                ? '0 12px 28px rgba(15, 23, 42, 0.12)'
                                                : '0 4px 12px rgba(15, 23, 42, 0.06)'
                                        }}
                                        onClick={() => setAlertaDetalhado(estaDetalhado ? null : alerta.id)}
                                    >
                                        <div style={style.conteudoCardAlerta}>
                                            <div style={{ ...style.iconeCardAlerta, backgroundColor: prioridade.suave, color: prioridade.cor }}>
                                                {temOcorrencia ? prioridade.icone : alerta.ativo ? '🔔' : '🔕'}
                                            </div>

                                            <div style={style.textosCardAlerta}>
                                                <div style={style.linhaTagsAlerta}>
                                                    <span style={{ ...style.tagPrioridade, color: prioridade.cor, backgroundColor: prioridade.suave }}>
                                                        {prioridade.icone} Prioridade {prioridade.label}
                                                    </span>

                                                    <span style={style.tagTipoAlerta}>{resumoAlvo.texto}</span>

                                                    <span style={{
                                                        ...style.tagStatusAlerta,
                                                        backgroundColor: alerta.ativo ? '#dcfce7' : '#e2e8f0',
                                                        color: alerta.ativo ? '#166534' : '#475569'
                                                    }}>
                                                        {alerta.ativo ? 'Ligado' : 'Desligado'}
                                                    </span>
                                                </div>

                                                <p style={style.textoPrincipalAlerta}>
                                                    {renderizarTextoAlerta(alerta)}
                                                </p>

                                                {temOcorrencia && quantidadeOcorrencias === 1 && (
                                                    <p style={style.textoOcorrenciaCard}>
                                                        <strong>{ocorrenciaUnica.causador}</strong> em <strong>{ocorrenciaUnica.turma}</strong>
                                                        {' '}atingiu <strong>{ocorrenciaUnica.quantidadeFaltasAtual}</strong> falta(s). Clique para ver datas.
                                                    </p>
                                                )}

                                                {temOcorrencia && quantidadeOcorrencias > 1 && (
                                                    <p style={style.textoOcorrenciaCard}>
                                                        <strong>{quantidadeOcorrencias}</strong> ocorrências ativas aguardando análise.
                                                    </p>
                                                )}

                                                {!temOcorrencia && historicoVistos.length > 0 && (
                                                    <p style={style.textoHistoricoCard}>
                                                        {historicoVistos.length} registro(s) no histórico de vistos.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={style.acoesCardAlerta}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {temOcorrencia && quantidadeOcorrencias === 1 && (
                                                <button
                                                    className="button-padrao"
                                                    style={style.btnMarcarLido}
                                                    onClick={() => marcarOcorrenciaComoLida(ocorrenciaUnica.id)}
                                                    disabled={botoesBloqueados}
                                                >
                                                    Visto
                                                </button>
                                            )}

                                            <button
                                                className="button-padrao"
                                                onClick={() => alternarStatusAlerta(alerta)}
                                                style={{
                                                    ...style.btnStatusToggle,
                                                    backgroundColor: alerta.ativo ? '#2e7d32' : '#78909c'
                                                }}
                                                disabled={botoesBloqueados}
                                            >
                                                {alerta.ativo ? 'Ligado' : 'Desligado'}
                                            </button>

                                            <button
                                                className="button-padrao"
                                                onClick={() => abrirTelaEdicao(alerta)}
                                                style={style.btnEditarAlerta}
                                                disabled={botoesBloqueados}
                                                title="Editar alerta"
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                className="button-padrao"
                                                onClick={() => solicitarExclusaoAlerta(alerta)}
                                                style={style.btnDeletarAlerta}
                                                disabled={botoesBloqueados}
                                                title="Excluir alerta"
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
                            <div style={style.estadoVazioAlertas}>
                                <strong>Nenhuma regra criada.</strong>
                                <span>Crie um alerta para acompanhar faltas automaticamente.</span>
                            </div>
                        )}

                        {alertasCriados.length > 0 && alertasFiltrados.length === 0 && (
                            <div style={style.estadoVazioAlertas}>
                                <strong>Nenhum alerta encontrado.</strong>
                                <span>Ajuste os filtros ou a pesquisa para ver outras regras.</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={style.containerCriacaoLogica}>
                    <div style={style.containerPreMontagens}>
                        <div style={style.cabecalhoPreMontagens}>
                            <div>
                                <h2 style={style.tituloPreMontagens}>Pré-montagens rápidas</h2>
                                <p style={style.subtituloPreMontagens}>
                                    Escolha um modelo pronto e ajuste os detalhes depois.
                                </p>
                            </div>

                            <button
                                className="button-padrao"
                                style={style.btnLimparSelecoes}
                                onClick={limparSelecoesLogica}
                                disabled={botoesBloqueados}
                            >
                                Limpar seleções
                            </button>
                        </div>

                        <div style={style.listaPreMontagens}>
                            <button
                                className="button-padrao"
                                style={style.cardPreMontagem}
                                onClick={() => aplicarPreMontagem('aluno-seguidas')}
                                disabled={botoesBloqueados}
                            >
                                <strong>Aluno recorrente</strong>
                                <span>3 faltas seguidas</span>
                            </button>

                            <button
                                className="button-padrao"
                                style={style.cardPreMontagem}
                                onClick={() => aplicarPreMontagem('aluno-mensal')}
                                disabled={botoesBloqueados}
                            >
                                <strong>Aluno no mês</strong>
                                <span>5 faltas mensais</span>
                            </button>

                            <button
                                className="button-padrao"
                                style={style.cardPreMontagem}
                                onClick={() => aplicarPreMontagem('turma-mensal')}
                                disabled={botoesBloqueados}
                            >
                                <strong>Turma crítica</strong>
                                <span>20 faltas mensais</span>
                            </button>

                            <button
                                className="button-padrao"
                                style={style.cardPreMontagem}
                                onClick={() => aplicarPreMontagem('turma-seguidas')}
                                disabled={botoesBloqueados}
                            >
                                <strong>Turma em sequência</strong>
                                <span>3 chamadas seguidas com falta</span>
                            </button>
                        </div>
                    </div>

                    <div style={style.caixaBlocosLogica}>
                        <div style={style.cabecalhoBlocosLogica}>
                            <div>
                                <h2 style={style.tituloBlocosLogica}>Blocos de Lógica</h2>
                                <p style={style.subtituloBlocosLogica}>
                                    Monte o alerta seguindo o fluxo: quem será observado, quando deve disparar e qual ação será gerada.
                                </p>
                            </div>

                            <button
                                className="button-padrao"
                                style={style.btnAjudaLogica}
                                onClick={() => setMostrarAjudaLogica((prev) => !prev)}
                                disabled={botoesBloqueados}
                                title="Como montar uma lógica de alerta"
                            >
                                ?
                            </button>
                        </div>

                        {mostrarAjudaLogica && (
                            <div style={style.painelAjudaLogica}>
                                <strong>Como usar:</strong>
                                <span>
                                    Primeiro escolha quem será monitorado. Depois defina a quantidade de faltas e o período. Por fim, confira a frase pronta antes de salvar.
                                </span>
                                <span>
                                    Exemplo: “Se qualquer aluno atingir 3 faltas seguidas, gerar alerta”.
                                </span>
                            </div>
                        )}

                        <div style={style.areaBlocosLogica}>
                            <div style={{ ...style.blocoLogicaVertical, ...style.blocoQuemAtiva }}>
                                <div style={style.cabecalhoBlocoIndividual}>
                                    <span style={style.numeroBloco}>1</span>
                                    <div>
                                        <h3 style={style.tituloBlocoIndividual}>Se...</h3>
                                        <p style={style.descricaoBlocoIndividual}>Quem pode ativar o alerta?</p>
                                    </div>
                                </div>

                                <div style={style.linhaCamposLogica}>
                                    <select
                                        value={tipoAlvo}
                                        onChange={(e) => {
                                            setTipoAlvo(e.target.value);
                                            setTurmaSelecionada('');
                                            setAlunoSelecionado('');
                                        }}
                                        style={style.selectFrase}
                                        disabled={botoesBloqueados}
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
                                        disabled={botoesBloqueados}
                                    >
                                        <option value="Todos">Todos</option>
                                        <option value="Especifico">Específico</option>
                                    </select>

                                    {escopo === 'Especifico' && tipoAlvo === 'Turma' && (
                                        <select
                                            value={turmaSelecionada}
                                            onChange={(e) => setTurmaSelecionada(e.target.value)}
                                            style={style.selectFrase}
                                            disabled={botoesBloqueados}
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
                                                disabled={botoesBloqueados}
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
                                                    disabled={botoesBloqueados}
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
                            </div>

                            <div style={style.flechaFluxoVertical}>↓</div>

                            <div style={{ ...style.blocoLogicaVertical, ...style.blocoMotivoAtiva }}>
                                <div style={style.cabecalhoBlocoIndividual}>
                                    <span style={style.numeroBloco}>2</span>
                                    <div>
                                        <h3 style={style.tituloBlocoIndividual}>Por que ativar?</h3>
                                        <p style={style.descricaoBlocoIndividual}>Defina o limite de faltas que dispara o alerta.</p>
                                    </div>
                                </div>

                                <div style={style.linhaCamposLogica}>
                                    <span style={style.textoFixoFrase}>atingir</span>

                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Ex: 3"
                                        value={quantidadeFaltas}
                                        onChange={(e) => setQuantidadeFaltas(e.target.value)}
                                        style={style.inputNumeroFrase}
                                        disabled={botoesBloqueados}
                                    />

                                    <span style={style.textoFixoFrase}>faltas</span>

                                    <select
                                        value={tipoPeriodo}
                                        onChange={(e) => setTipoPeriodo(e.target.value)}
                                        style={style.selectFrase}
                                        disabled={botoesBloqueados}
                                    >
                                        <option value="Seguidas">Seguidas</option>
                                        <option value="Mensal">Mensal</option>
                                        <option value="Anual">Anual</option>
                                    </select>
                                </div>
                            </div>

                            <div style={style.flechaFluxoVertical}>↓</div>

                            <div style={{ ...style.blocoLogicaVertical, ...style.blocoGerarAlerta }}>
                                <div style={style.cabecalhoBlocoIndividual}>
                                    <span style={style.numeroBloco}>3</span>
                                    <div>
                                        <h3 style={style.tituloBlocoIndividual}>Então...</h3>
                                        <p style={style.descricaoBlocoIndividual}>Defina o destaque e a urgência desse alerta.</p>
                                    </div>
                                </div>

                                <div style={style.linhaCamposLogica}>
                                    <span style={style.textoFixoFrase}>prioridade</span>

                                    <select
                                        value={prioridadeAlerta}
                                        onChange={(e) => setPrioridadeAlerta(e.target.value)}
                                        style={style.selectFrase}
                                        disabled={botoesBloqueados}
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Media">Média</option>
                                        <option value="Alta">Alta</option>
                                    </select>

                                    <div style={style.resultadoAlertaBox}>
                                        <span style={style.iconeResultadoAlerta}>{getConfigPrioridade(prioridadeAlerta).icone}</span>
                                        <div>
                                            <strong>Gerar alerta automaticamente</strong>
                                            <p>O alerta receberá destaque de prioridade {getConfigPrioridade(prioridadeAlerta).label.toLowerCase()} na listagem.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={style.containerPreviewNovo}>
                        <div>
                            <h2 style={style.tituloPreviewNovo}>Visualização do Alerta</h2>
                            <p style={style.subtituloPreviewNovo}>Confira se a lógica ficou do jeito esperado antes de salvar.</p>
                        </div>

                        <div style={style.previewPrioridadeLinha}>
                            <span style={{
                                ...style.tagPrioridade,
                                color: getConfigPrioridade(prioridadeAlerta).cor,
                                backgroundColor: getConfigPrioridade(prioridadeAlerta).suave
                            }}>
                                {getConfigPrioridade(prioridadeAlerta).icone} Prioridade {getConfigPrioridade(prioridadeAlerta).label}
                            </span>
                        </div>

                        <p style={style.styleTextoPreviewNovo}>
                            {gerarTextoLogica()}
                        </p>
                    </div>

                    <div style={style.areaAcoesCriacao}>
                        <button
                            className="button-padrao"
                            style={style.btnSalvar}
                            onClick={salvarAlerta}
                            disabled={botoesBloqueados}
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
                            disabled={botoesBloqueados}
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
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 4px 0'
    },

    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '22px',
        borderRadius: '18px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.22)',
        width: 'calc(100vw - 40px)',
        height: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '10px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxSizing: 'border-box'
    },

    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '42px',
        height: '42px',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },

    btnAdicionar: {
        backgroundColor: '#1e3a8a',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: '12px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        minHeight: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
    },

    textoFixoFrase: {
        fontSize: '17px',
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
        fontSize: '17px',
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
        fontSize: '17px',
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
        fontSize: '20px',
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
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    btnCancelar: {
        backgroundColor: '#cfd8dc',
        color: '#374151',
        padding: '12px 25px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    tagGerarAlerta: {
        fontSize: '18px',
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
        fontSize: '18px',
        color: '#a0aec0',
        fontWeight: 'bold',
        userSelect: 'none',
        padding: '0 4px'
    },

    containerCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        backgroundColor: '#fff',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box'
    },

    cardAlertaReal: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '16px',
        alignItems: 'center',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        borderLeft: '7px solid #94a3b8',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        boxSizing: 'border-box'
    },

    btnStatusToggle: {
        border: 'none',
        color: '#fff',
        padding: '7px 14px',
        borderRadius: '999px',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease-in-out',
        whiteSpace: 'nowrap'
    },

    btnEditarAlerta: {
        height: '38px',
        width: '38px',
        border: '1px solid #bfdbfe',
        backgroundColor: '#eff6ff',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease',
        flexShrink: 0
    },

    btnDeletarAlerta: {
        height: '38px',
        width: '38px',
        border: '1px solid #ffcdd2',
        backgroundColor: '#fff',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease',
        flexShrink: 0
    },

    btnMarcarLido: {
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        padding: '7px 12px',
        borderRadius: '10px',
        fontWeight: '700',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap'
    },

    painelDetalhes: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '5px solid #ef4444',
        padding: '14px',
        borderRadius: '14px',
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
        fontSize: '22px',
        color: '#1e293b'
    },

    subtituloDetalhes: {
        margin: '4px 0 0 0',
        color: '#475569',
        fontSize: '15px',
        lineHeight: 1.45
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
        fontSize: '20px'
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
        padding: '5px 9px',
        borderRadius: '999px',
        fontSize: '14px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap'
    },

    textoInfoOcorrencia: {
        margin: 0,
        color: '#475569',
        fontSize: '15px',
        lineHeight: 1.45
    },

    tituloDatas: {
        margin: '4px 0 0 0',
        color: '#334155',
        fontSize: '18px'
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
        fontSize: '17px',
        lineHeight: 1.45
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
        fontSize: '20px',
        lineHeight: 1.55
    },

    textoDescricaoHistorico: {
        margin: 0,
        color: '#475569',
        fontSize: '18px',
        lineHeight: 1.6
    },

    detailsHistorico: {
        marginTop: '4px',
        color: '#334155',
        fontSize: '18px',
        cursor: 'pointer',
        lineHeight: 1.5
    },

    textoVazioDetalhes: {
        margin: 0,
        color: '#64748b',
        fontSize: '17px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px',
        lineHeight: 1.5
    },

    telaListagem: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '12px'
    },

    headerListagem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        flexShrink: 0
    },

    tituloSecaoListagem: {
        margin: 0,
        color: '#1e293b',
        fontSize: '22px',
        lineHeight: 1.2
    },

    subtituloSecaoListagem: {
        margin: '4px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    painelResumoAlertas: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '10px',
        flexShrink: 0
    },

    cardResumoAlerta: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: '#64748b',
        boxSizing: 'border-box'
    },

    barraFiltrosAlertas: {
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) repeat(4, minmax(150px, 190px))',
        gap: '10px',
        alignItems: 'center',
        flexShrink: 0
    },

    inputPesquisaAlertas: {
        width: '100%',
        minHeight: '42px',
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box'
    },

    selectFiltroAlerta: {
        width: '100%',
        minHeight: '42px',
        padding: '9px 10px',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
    },

    wrapperCardAlerta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    conteudoCardAlerta: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        minWidth: 0
    },

    iconeCardAlerta: {
        width: '46px',
        height: '46px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '23px',
        flexShrink: 0
    },

    textosCardAlerta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        minWidth: 0
    },

    linhaTagsAlerta: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '7px',
        alignItems: 'center'
    },

    tagPrioridade: {
        borderRadius: '999px',
        padding: '5px 9px',
        fontSize: '12px',
        fontWeight: '900',
        whiteSpace: 'nowrap'
    },

    tagTipoAlerta: {
        borderRadius: '999px',
        padding: '5px 9px',
        fontSize: '12px',
        fontWeight: '800',
        color: '#1e3a8a',
        backgroundColor: '#eff6ff',
        whiteSpace: 'nowrap'
    },

    tagStatusAlerta: {
        borderRadius: '999px',
        padding: '5px 9px',
        fontSize: '12px',
        fontWeight: '800',
        whiteSpace: 'nowrap'
    },

    textoPrincipalAlerta: {
        fontSize: '17px',
        margin: 0,
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: 1.4
    },

    realceAluno: {
        color: '#7c2d12',
        backgroundColor: '#ffedd5',
        borderRadius: '8px',
        padding: '1px 6px'
    },

    realceTurma: {
        color: '#1e3a8a',
        backgroundColor: '#dbeafe',
        borderRadius: '8px',
        padding: '1px 6px'
    },

    textoOcorrenciaCard: {
        margin: 0,
        color: '#b91c1c',
        fontSize: '14px',
        lineHeight: 1.45,
        fontWeight: '700'
    },

    textoHistoricoCard: {
        margin: 0,
        color: '#64748b',
        fontSize: '14px',
        lineHeight: 1.45,
        fontWeight: '700'
    },

    acoesCardAlerta: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        flexWrap: 'wrap'
    },

    estadoVazioAlertas: {
        backgroundColor: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '14px',
        padding: '22px',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        textAlign: 'center'
    },

    previewPrioridadeLinha: {
        display: 'flex',
        alignItems: 'center'
    },

    feedbackOverlay: {
        position: 'absolute',
        top: '18px',
        right: '18px',
        zIndex: 30,
        animation: 'fadeIn 0.25s ease',
        pointerEvents: 'none'
    },

    feedbackCard: {
        backgroundColor: '#ffffff',
        border: '2px solid #bbf7d0',
        borderRadius: '16px',
        padding: '18px 22px',
        boxShadow: '0 14px 35px rgba(15, 23, 42, 0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minWidth: '360px',
        maxWidth: '500px'
    },

    feedbackIcone: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '24px',
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
    },

    containerCriacaoLogica: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '14px',
        paddingTop: '5px',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '6px',
        boxSizing: 'border-box'
    },

    containerPreMontagens: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '14px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
    },

    cabecalhoPreMontagens: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '10px'
    },

    tituloPreMontagens: {
        margin: 0,
        color: '#1e293b',
        fontSize: '20px',
        fontWeight: '800'
    },

    subtituloPreMontagens: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    listaPreMontagens: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '10px'
    },

    cardPreMontagem: {
        border: '1px solid #dbeafe',
        backgroundColor: '#eff6ff',
        color: '#1e3a8a',
        borderRadius: '12px',
        padding: '11px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '4px',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        minHeight: '68px'
    },

    btnLimparSelecoes: {
        backgroundColor: '#f8fafc',
        color: '#334155',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '9px 14px',
        fontWeight: '700',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },

    caixaBlocosLogica: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)'
    },

    cabecalhoBlocosLogica: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '14px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px'
    },

    tituloBlocosLogica: {
        margin: 0,
        color: '#1e293b',
        fontSize: '24px',
        fontWeight: '800'
    },

    subtituloBlocosLogica: {
        margin: '4px 0 0 0',
        color: '#64748b',
        fontSize: '15px',
        lineHeight: 1.45
    },

    btnAjudaLogica: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        fontWeight: '900',
        fontSize: '18px',
        cursor: 'pointer',
        boxShadow: '0 6px 12px rgba(30, 58, 138, 0.22)',
        flexShrink: 0
    },

    painelAjudaLogica: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        backgroundColor: '#fefce8',
        border: '1px solid #fde68a',
        borderLeft: '5px solid #f59e0b',
        borderRadius: '12px',
        padding: '12px 14px',
        color: '#78350f',
        fontSize: '15px',
        lineHeight: 1.45
    },

    areaBlocosLogica: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px'
    },

    blocoLogicaVertical: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px',
        borderRadius: '16px',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 4px 10px rgba(15, 23, 42, 0.04)'
    },

    blocoQuemAtiva: {
        backgroundColor: '#fff7ed'
    },

    blocoMotivoAtiva: {
        backgroundColor: '#eef2ff'
    },

    blocoGerarAlerta: {
        backgroundColor: '#fef2f2'
    },

    cabecalhoBlocoIndividual: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '330px'
    },

    numeroBloco: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '900',
        fontSize: '17px',
        flexShrink: 0
    },

    tituloBlocoIndividual: {
        margin: 0,
        color: '#1e293b',
        fontSize: '19px',
        fontWeight: '800'
    },

    descricaoBlocoIndividual: {
        margin: '2px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    linhaCamposLogica: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '10px',
        flex: 1
    },

    flechaFluxoVertical: {
        alignSelf: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        backgroundColor: '#e0e7ff',
        color: '#1e3a8a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: '900',
        margin: '-2px 0'
    },

    resultadoAlertaBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #fecaca',
        borderRadius: '14px',
        padding: '12px 14px',
        color: '#991b1b',
        maxWidth: '560px',
        flex: 1,
        minWidth: '260px'
    },

    iconeResultadoAlerta: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        flexShrink: 0
    },

    containerPreviewNovo: {
        backgroundColor: '#eef2ff',
        border: '1px solid #c7d2fe',
        borderLeft: '6px solid #1e3a8a',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
    },

    tituloPreviewNovo: {
        margin: 0,
        color: '#1e293b',
        fontSize: '20px',
        fontWeight: '800'
    },

    subtituloPreviewNovo: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    styleTextoPreviewNovo: {
        margin: 0,
        color: '#1e3a8a',
        fontSize: '22px',
        fontWeight: '800',
        lineHeight: 1.35
    },

    areaAcoesCriacao: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        paddingBottom: '4px'
    }
};

export default Alertas;
