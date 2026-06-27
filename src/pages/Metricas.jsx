import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { executarMotorAlertasDaTurma } from '../services/motorAlertas';

import icone08 from '../assets/icon8.png';

function Metricas() {
    const navigate = useNavigate();

    const [turmas, setTurmas] = useState([]);
    const [turmaAtiva, setTurmaAtiva] = useState(
        localStorage.getItem('turmaAtivaFaltas') ||
        localStorage.getItem('turmaAtivaTurmas') ||
        ''
    );

    const [alunos, setAlunos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const [dataChamada, setDataChamada] = useState(new Date().toISOString().substring(0, 7));
    const [modoAnalise, setModoAnalise] = useState('mes');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [dataEspecifica, setDataEspecifica] = useState(new Date().toISOString().substring(0, 10));
    const [semanaReferencia, setSemanaReferencia] = useState(new Date().toISOString().substring(0, 10));
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

    const [totalDiasLetivos, setTotalDiasLetivos] = useState(0);
    const [alunoSelecionado, setAlunoSelecionado] = useState(null);

    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [pesquisaCarregando, setPesquisaCarregando] = useState(false);
    const [corTextoPesquisa, setCorTextoPesquisa] = useState('#334155');

    const [verTodasAsFaltas, setVerTodasAsFaltas] = useState(false);
    const [historicoCompletoAluno, setHistoricoCompletoAluno] = useState([]);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);

    const [modoEdicao, setModoEdicao] = useState(false);
    const [historicoEdicaoTemporario, setHistoricoEdicaoTemporario] = useState([]);
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);

    const [atualizadorMetricas, setAtualizadorMetricas] = useState(0);

    const nomeAlunoPendenteRef = useRef(null);

    const turmaSelecionada = turmas.find((turma) => turma.nome === turmaAtiva);
    const botoesBloqueados = carregando || pesquisaCarregando || salvandoEdicao || !!feedback;

    const mostrarFeedback = (tipo, titulo, mensagem) => {
        setFeedback({ tipo, titulo, mensagem });

        setTimeout(() => {
            setFeedback(null);
        }, 3000);
    };

    const formatarNovaData = (dataISO) => {
        if (!dataISO) return '';

        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const normalizarTexto = (texto) => {
        return texto.trim().toLowerCase();
    };

    const obterNomeFalta = (falta) => {
        return typeof falta === 'string' ? falta : falta?.nome;
    };

    const obterTipoFalta = (falta) => {
        return typeof falta === 'string' ? 'regular' : falta?.tipo || 'regular';
    };

    const obterPeriodoSemana = (dataReferenciaISO) => {
        const dataRef = new Date(dataReferenciaISO + 'T12:00:00');
        const diaDaSemana = dataRef.getDay();
        const distanciaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;

        const segunda = new Date(dataRef);
        segunda.setDate(dataRef.getDate() + distanciaParaSegunda);

        const sexta = new Date(segunda);
        sexta.setDate(segunda.getDate() + 4);

        return {
            inicio: segunda.toISOString().substring(0, 10),
            fim: sexta.toISOString().substring(0, 10)
        };
    };

    const obterDescricaoFiltro = () => {
        if (modoAnalise === 'data-especifica') {
            return `Data específica: ${formatarNovaData(dataEspecifica)}`;
        }

        if (modoAnalise === 'semana') {
            const semana = obterPeriodoSemana(semanaReferencia);
            return `Semana: ${formatarNovaData(semana.inicio)} até ${formatarNovaData(semana.fim)}`;
        }

        if (modoAnalise === 'mes') {
            return `Mês: ${dataChamada}`;
        }

        if (modoAnalise === 'media') {
            return `Ano: ${anoSelecionado}`;
        }

        if (modoAnalise === 'periodo') {
            if (!dataInicio || !dataFim) {
                return 'Intervalo: escolha data inicial e final';
            }

            return `Período: ${formatarNovaData(dataInicio)} até ${formatarNovaData(dataFim)}`;
        }

        return '';
    };

    const chamadaCorrespondeAoFiltro = (dataDoc) => {
        if (!dataDoc) return false;

        if (modoAnalise === 'mes') {
            return dataDoc.startsWith(dataChamada);
        }

        if (modoAnalise === 'media') {
            return dataDoc.startsWith(anoSelecionado);
        }

        if (modoAnalise === 'periodo') {
            if (!dataInicio || !dataFim) return false;
            return dataDoc >= dataInicio && dataDoc <= dataFim;
        }

        if (modoAnalise === 'data-especifica') {
            return dataDoc === dataEspecifica;
        }

        if (modoAnalise === 'semana') {
            const semana = obterPeriodoSemana(semanaReferencia);
            return dataDoc >= semana.inicio && dataDoc <= semana.fim;
        }

        return false;
    };

    const carregarTurmas = async () => {
        setCarregando(true);

        try {
            const snapshot = await getDocs(collection(db, 'turmas'));

            const listaTurmas = snapshot.docs
                .map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }))
                .filter((turma) => turma.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome));

            setTurmas(listaTurmas);

            const turmaSalvaExiste = listaTurmas.some((turma) => turma.nome === turmaAtiva);

            if (turmaAtiva && !turmaSalvaExiste) {
                setTurmaAtiva('');
                setAlunos([]);
                setAlunoSelecionado(null);
                localStorage.removeItem('turmaAtivaTurmas');
                localStorage.removeItem('turmaAtivaFaltas');
            }

            if (!turmaAtiva && listaTurmas.length > 0) {
                setTurmaAtiva(listaTurmas[0].nome);
            }
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            mostrarFeedback('erro', 'Erro ao carregar', 'Não foi possível buscar as turmas cadastradas.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarTurmas();
    }, []);

    useEffect(() => {
        if (!turmaAtiva) return;

        localStorage.setItem('turmaAtivaTurmas', turmaAtiva);
        localStorage.setItem('turmaAtivaFaltas', turmaAtiva);
    }, [turmaAtiva]);

    const buscarHistoricoCompleto = async (nomeAluno) => {
        if (!turmaSelecionada || !nomeAluno) return;

        setCarregandoHistorico(true);

        try {
            const chamadasRef = collection(db, 'turmas', turmaSelecionada.id, 'chamadas');
            const chamadasSnapshot = await getDocs(chamadasRef);

            const todasAsFaltas = [];

            chamadasSnapshot.forEach((docSnap) => {
                const dadosChamada = docSnap.data();
                const dataDoc = dadosChamada.data;
                const faltasDoDia = dadosChamada.faltas || [];

                const registroFalta = faltasDoDia.find((falta) => obterNomeFalta(falta) === nomeAluno);

                if (registroFalta && dataDoc) {
                    todasAsFaltas.push({
                        data: dataDoc,
                        tipo: obterTipoFalta(registroFalta)
                    });
                }
            });

            todasAsFaltas.sort((a, b) => a.data.localeCompare(b.data));

            setHistoricoCompletoAluno(todasAsFaltas);
            setHistoricoEdicaoTemporario(todasAsFaltas);
        } catch (error) {
            console.error('Erro ao buscar histórico completo:', error);
            mostrarFeedback('erro', 'Erro ao buscar histórico', 'Não foi possível carregar o histórico do aluno.');
        } finally {
            setCarregandoHistorico(false);
        }
    };

    useEffect(() => {
        setVerTodasAsFaltas(false);
        setModoEdicao(false);

        if (alunoSelecionado) {
            buscarHistoricoCompleto(alunoSelecionado.nome);
        } else {
            setHistoricoCompletoAluno([]);
            setHistoricoEdicaoTemporario([]);
        }
    }, [alunoSelecionado?.nome, turmaSelecionada?.id]);

    useEffect(() => {
        if (verTodasAsFaltas && alunoSelecionado) {
            buscarHistoricoCompleto(alunoSelecionado.nome);
        }
    }, [verTodasAsFaltas]);

    const buscarMetricasFaltas = async () => {
        if (!turmaSelecionada) {
            setAlunos([]);
            setTotalDiasLetivos(0);
            setAlunoSelecionado(null);
            return;
        }

        setCarregando(true);

        try {
            const listaNomesAlunos = turmaSelecionada.alunos || [];
            const chamadasRef = collection(db, 'turmas', turmaSelecionada.id, 'chamadas');
            const chamadasSnapshot = await getDocs(chamadasRef);

            const registroDatasFaltas = {};

            listaNomesAlunos.forEach((nome) => {
                registroDatasFaltas[nome] = [];
            });

            let diasContados = 0;

            chamadasSnapshot.forEach((docSnap) => {
                const dadosChamada = docSnap.data();
                const dataDoc = dadosChamada.data;
                const faltasDoDia = dadosChamada.faltas || [];

                if (chamadaCorrespondeAoFiltro(dataDoc)) {
                    diasContados += 1;

                    faltasDoDia.forEach((falta) => {
                        const nomeAluno = obterNomeFalta(falta);
                        const tipoFalta = obterTipoFalta(falta);

                        if (registroDatasFaltas[nomeAluno] !== undefined && tipoFalta !== 'justificada') {
                            registroDatasFaltas[nomeAluno].push({
                                data: dataDoc,
                                tipo: tipoFalta
                            });
                        }
                    });
                }
            });

            setTotalDiasLetivos(diasContados);

            const alunosEstruturados = listaNomesAlunos.map((nome) => {
                const datasOrdenadas = (registroDatasFaltas[nome] || []).sort((a, b) => a.data.localeCompare(b.data));

                return {
                    nome,
                    quantidadeFaltas: datasOrdenadas.length,
                    datasFaltas: datasOrdenadas.map((item) => item.data)
                };
            });

            alunosEstruturados.sort((a, b) => b.quantidadeFaltas - a.quantidadeFaltas);
            setAlunos(alunosEstruturados);

            if (nomeAlunoPendenteRef.current) {
                const encontrarAluno = alunosEstruturados.find((aluno) => aluno.nome === nomeAlunoPendenteRef.current);

                if (encontrarAluno) {
                    setAlunoSelecionado(encontrarAluno);
                }

                nomeAlunoPendenteRef.current = null;
            } else if (alunoSelecionado) {
                const recarregarSelecionado = alunosEstruturados.find((aluno) => aluno.nome === alunoSelecionado.nome);

                if (recarregarSelecionado) {
                    setAlunoSelecionado(recarregarSelecionado);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar métricas:', error);
            mostrarFeedback('erro', 'Erro nas métricas', 'Não foi possível calcular as métricas dessa turma.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        buscarMetricasFaltas();
    }, [
        turmaSelecionada?.id,
        dataChamada,
        modoAnalise,
        dataInicio,
        dataFim,
        anoSelecionado,
        dataEspecifica,
        semanaReferencia,
        atualizadorMetricas
    ]);

    const handleSalvarEdicaoFirebase = async () => {
        if (!alunoSelecionado || !turmaSelecionada) return;

        setSalvandoEdicao(true);

        try {
            const chamadasRef = collection(db, 'turmas', turmaSelecionada.id, 'chamadas');
            const chamadasSnapshot = await getDocs(chamadasRef);

            const chamadasPorData = {};

            chamadasSnapshot.forEach((docSnap) => {
                const dadosChamada = docSnap.data();

                if (dadosChamada.data) {
                    chamadasPorData[dadosChamada.data] = dadosChamada;
                }
            });

            for (const itemModificado of historicoEdicaoTemporario) {
                const dadosChamada = chamadasPorData[itemModificado.data];

                if (!dadosChamada) continue;

                const listaFaltasAtualizada = (dadosChamada.faltas || []).map((falta) => {
                    const nomeFalta = obterNomeFalta(falta);

                    if (nomeFalta === alunoSelecionado.nome) {
                        return {
                            nome: nomeFalta,
                            tipo: itemModificado.tipo
                        };
                    }

                    return falta;
                });

                const chamadaDocRef = doc(db, 'turmas', turmaSelecionada.id, 'chamadas', itemModificado.data);

                await setDoc(chamadaDocRef, {
                    faltas: listaFaltasAtualizada,
                    atualizadoEm: new Date().toISOString()
                }, { merge: true });
            }

            await executarMotorAlertasDaTurma({
                idTurma: turmaSelecionada.id,
                nomeTurma: turmaSelecionada.nome,
                alunos: turmaSelecionada.alunos || [],
                dataReferencia: new Date().toISOString().split('T')[0]
            });

            setHistoricoCompletoAluno(historicoEdicaoTemporario);
            setModoEdicao(false);
            setAtualizadorMetricas((prev) => prev + 1);

            mostrarFeedback('sucesso', 'Histórico atualizado', 'As faltas foram atualizadas e os alertas foram recalculados.');
        } catch (error) {
            console.error('Erro ao salvar edições retroativas:', error);
            mostrarFeedback('erro', 'Erro ao salvar', 'Não foi possível salvar as alterações no histórico.');
        } finally {
            setSalvandoEdicao(false);
        }
    };

    const alternarTipoFaltaTemporaria = (dataFalta) => {
        if (!modoEdicao) return;

        setHistoricoEdicaoTemporario((prev) =>
            prev.map((item) =>
                item.data === dataFalta
                    ? {
                        ...item,
                        tipo: item.tipo === 'regular' ? 'justificada' : 'regular'
                    }
                    : item
            )
        );
    };

    const lidarComPesquisa = async (e) => {
        e.preventDefault();

        if (!termoPesquisa.trim()) return;

        setPesquisaCarregando(true);
        setCorTextoPesquisa('#334155');

        try {
            const snapshot = await getDocs(collection(db, 'turmas'));

            let alunoEncontrado = false;
            let nomeTurmaEncontrada = '';
            let nomeExatoAluno = '';

            snapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                const listaAlunos = dados.alunos || [];

                const correspondencia = listaAlunos.find(
                    (nome) => normalizarTexto(nome) === normalizarTexto(termoPesquisa)
                );

                if (correspondencia) {
                    alunoEncontrado = true;
                    nomeTurmaEncontrada = dados.nome;
                    nomeExatoAluno = correspondencia;
                }
            });

            if (alunoEncontrado) {
                setCorTextoPesquisa('#2e7d32');
                nomeAlunoPendenteRef.current = nomeExatoAluno;
                setTurmaAtiva(nomeTurmaEncontrada);
                mostrarFeedback('sucesso', 'Aluno encontrado', `${nomeExatoAluno} foi encontrado em ${nomeTurmaEncontrada}.`);
            } else {
                setCorTextoPesquisa('#d32f2f');
                mostrarFeedback('erro', 'Aluno não encontrado', 'Nenhum aluno com esse nome foi encontrado nas turmas cadastradas.');
            }
        } catch (error) {
            console.error('Erro ao pesquisar aluno:', error);
            setCorTextoPesquisa('#d32f2f');
            mostrarFeedback('erro', 'Erro na pesquisa', 'Não foi possível pesquisar o aluno.');
        } finally {
            setPesquisaCarregando(false);
        }
    };

    const dadosFaltasExibidasBloco = verTodasAsFaltas
        ? historicoCompletoAluno
        : historicoCompletoAluno.filter((item) => alunoSelecionado?.datasFaltas.includes(item.data));

    const totalFaltasTurma = alunos.reduce((acumulador, item) => acumulador + item.quantidadeFaltas, 0);
    const alunosComFaltas = alunos.filter((aluno) => aluno.quantidadeFaltas > 0).length;
    const maiorFaltas = alunos.length > 0 ? Math.max(...alunos.map((aluno) => aluno.quantidadeFaltas)) : 0;

    const renderizarFeedback = () => {
        if (!feedback) return null;

        return (
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
                        <h3 style={style.feedbackTitulo}>{feedback.titulo}</h3>
                        <p style={style.feedbackMensagem}>{feedback.mensagem}</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderizarTurmas = () => {
        return (
            <div style={style.containerTurmas}>
                {carregando && turmas.length === 0 && (
                    <p style={style.textoVazio}>Carregando turmas...</p>
                )}

                {!carregando && turmas.length === 0 && (
                    <div style={style.estadoVazio}>
                        <strong>Nenhuma turma cadastrada.</strong>
                        <span>Cadastre turmas e alunos antes de consultar métricas.</span>

                        <button
                            className="button-padrao"
                            style={style.btnGerenciar}
                            onClick={() => navigate('/turmas')}
                            disabled={botoesBloqueados}
                        >
                            Ir para Gerenciar
                        </button>
                    </div>
                )}

                {turmas.map((turma) => {
                    const estaSelecionada = turmaAtiva === turma.nome;
                    const totalAlunosTurma = (turma.alunos || []).length;

                    return (
                        <button
                            key={turma.id}
                            style={{
                                ...style.btnTurma,
                                backgroundColor: estaSelecionada ? '#e0d6ff' : '#ffffff',
                                borderColor: estaSelecionada ? '#7c3aed' : '#e5e7eb'
                            }}
                            className="button-turma"
                            onClick={() => setTurmaAtiva(turma.nome)}
                            disabled={botoesBloqueados}
                        >
                            <div style={style.iconeTurma}>📊</div>

                            <div style={style.infoTurma}>
                                <strong>{turma.nome}</strong>
                                <span>{totalAlunosTurma} aluno(s)</span>
                            </div>

                            {estaSelecionada && (
                                <span style={style.marcadorSelecionado}>✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderizarListaAlunos = () => {
        if (!turmaAtiva) {
            return (
                <div style={style.estadoVazio}>
                    <strong>Nenhuma turma selecionada.</strong>
                    <span>Escolha uma turma na lateral para visualizar as métricas.</span>
                </div>
            );
        }

        if (carregando) {
            return <p style={style.textoVazio}>Carregando lista...</p>;
        }

        if (alunos.length === 0) {
            return (
                <div style={style.estadoVazio}>
                    <strong>Nenhum aluno cadastrado nessa turma.</strong>
                    <span>Cadastre alunos para começar a acompanhar as métricas.</span>

                    <button
                        className="button-padrao"
                        style={style.btnGerenciar}
                        onClick={() => navigate('/turmas')}
                        disabled={botoesBloqueados}
                    >
                        Gerenciar alunos
                    </button>
                </div>
            );
        }

        return (
            <ul style={style.listaAlunos}>
                {alunos.map((aluno, index) => {
                    const faltasDoAluno = aluno.quantidadeFaltas || 0;
                    const porcentagem = totalFaltasTurma > 0 ? (faltasDoAluno / totalFaltasTurma) * 100 : 0;

                    let corPreenchimento = '#e8f5e9';
                    let backgroundStyle = '#ffffff';

                    if (modoAnalise === 'data-especifica') {
                        if (faltasDoAluno > 0) {
                            corPreenchimento = '#ffebee';
                            backgroundStyle = '#ffebee';
                        }
                    } else {
                        if (faltasDoAluno > 0) {
                            if (porcentagem < 25) corPreenchimento = '#e8f5e9';
                            else if (porcentagem >= 25 && porcentagem <= 50) corPreenchimento = '#fff9c4';
                            else corPreenchimento = '#ffebee';
                        }

                        backgroundStyle = faltasDoAluno > 0
                            ? `linear-gradient(to right, ${corPreenchimento} ${Math.max(porcentagem, 8)}%, #ffffff ${Math.max(porcentagem, 8)}%)`
                            : '#ffffff';
                    }

                    const estaSelecionado = alunoSelecionado?.nome === aluno.nome;

                    return (
                        <li key={`${aluno.nome}-${index}`} style={style.itemAlunoContainer}>
                            <button
                                type="button"
                                className="button-padrao"
                                onClick={() => {
                                    setAlunoSelecionado(estaSelecionado ? null : aluno);
                                }}
                                disabled={botoesBloqueados}
                                style={{
                                    ...style.itemAluno,
                                    border: estaSelecionado ? '2px solid #1e3a8a' : '1px solid #e5e7eb',
                                    background: backgroundStyle
                                }}
                            >
                                <div style={style.infoAluno}>
                                    <span style={style.numeroAluno}>{index + 1}</span>

                                    <span style={style.nomeAluno}>
                                        {aluno.nome}
                                    </span>
                                </div>

                                <span
                                    style={{
                                        ...style.tagFaltas,
                                        color: faltasDoAluno > 0 ? '#d32f2f' : '#2e7d32'
                                    }}
                                >
                                    {modoAnalise === 'data-especifica'
                                        ? faltasDoAluno > 0 ? 'Faltou' : 'Presente'
                                        : `${faltasDoAluno} falta(s)`
                                    }
                                </span>
                            </button>

                            {estaSelecionado && renderizarPainelAluno()}
                        </li>
                    );
                })}
            </ul>
        );
    };

    const renderizarPainelAluno = () => {
        if (!alunoSelecionado) return null;

        return (
            <div style={style.painelAluno}>
                <div style={style.painelAlunoAcoes}>
                    <div>
                        <h3 style={style.tituloAlunoSelecionado}>
                            📌 Informações do Aluno
                        </h3>

                        <p style={style.subtituloAlunoSelecionado}>
                            {verTodasAsFaltas
                                ? 'Visualizando histórico completo geral.'
                                : 'Visualizando faltas do filtro atual.'
                            }
                        </p>
                    </div>

                    <div style={style.botoesAluno}>
                        <button
                            className="button-padrao"
                            onClick={() => setVerTodasAsFaltas(!verTodasAsFaltas)}
                            style={{
                                ...style.btnSecundario,
                                backgroundColor: verTodasAsFaltas ? '#e0d6ff' : '#ffffff'
                            }}
                            disabled={botoesBloqueados}
                        >
                            {verTodasAsFaltas ? '✓ Histórico total' : 'Mostrar todas as faltas'}
                        </button>

                        {!modoEdicao ? (
                            <button
                                className="button-padrao"
                                onClick={() => {
                                    setModoEdicao(true);
                                    setVerTodasAsFaltas(true);
                                }}
                                style={style.btnEditar}
                                disabled={botoesBloqueados}
                            >
                                Alterar status das faltas
                            </button>
                        ) : (
                            <div style={style.botoesEdicao}>
                                <button
                                    className="button-padrao"
                                    onClick={() => {
                                        setModoEdicao(false);
                                        setHistoricoEdicaoTemporario(historicoCompletoAluno);
                                    }}
                                    style={style.btnCancelarEdicao}
                                    disabled={botoesBloqueados}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="button-padrao"
                                    onClick={handleSalvarEdicaoFirebase}
                                    disabled={botoesBloqueados}
                                    style={style.btnSalvarEdicao}
                                >
                                    {salvandoEdicao ? 'Aguarde...' : 'Gravar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={style.painelHistorico}>
                    <h4 style={style.tituloHistorico}>
                        {modoEdicao ? '👉 Escolha os dias para justificar:' : 'Lista de faltas registradas:'}
                    </h4>

                    <div style={style.listaHistorico}>
                        {carregandoHistorico ? (
                            <span style={style.textoVazio}>Carregando dados...</span>
                        ) : dadosFaltasExibidasBloco.length > 0 ? (
                            (modoEdicao ? historicoEdicaoTemporario : dadosFaltasExibidasBloco).map((item, idx) => {
                                const ehJustificada = item.tipo === 'justificada';

                                return (
                                    <div
                                        key={`${item.data}-${idx}`}
                                        onClick={() => alternarTipoFaltaTemporaria(item.data)}
                                        style={{
                                            ...style.itemHistorico,
                                            color: ehJustificada ? '#2e7d32' : '#c0392b',
                                            backgroundColor: ehJustificada ? '#e8f5e9' : '#fdf2f2',
                                            borderLeft: ehJustificada ? '4px solid #4caf50' : '4px solid #e74c3c',
                                            cursor: modoEdicao ? 'pointer' : 'default'
                                        }}
                                    >
                                        <span>📅 {formatarNovaData(item.data)}</span>

                                        <span style={style.tagHistorico}>
                                            {ehJustificada ? 'Justificada ✓' : 'Regular'}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <span style={style.semFaltas}>
                                ✓ Nenhuma falta neste período.
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={style.containerPrincipal}>
            {renderizarFeedback()}

            <header style={style.header}>
                <div style={style.headerEsquerda}>
                    <button
                        className="button-padrao"
                        style={style.buttonVoltar}
                        onClick={() => navigate(-1)}
                        disabled={botoesBloqueados}
                    >
                        <img src={icone08} alt="Voltar" style={{ width: '30px', height: '30px' }} />
                    </button>

                    <div>
                        <h1 style={style.tituloPagina}>Métricas de Frequência</h1>
                        <p style={style.subtituloPagina}>
                            Analise faltas por turma, período e aluno.
                        </p>
                    </div>
                </div>

                <form onSubmit={lidarComPesquisa} style={style.formPesquisa}>
                    <p>🔍</p>
                    <input
                        type="text"
                        placeholder="Pesquisar aluno..."
                        value={termoPesquisa}
                        onChange={(e) => {
                            setTermoPesquisa(e.target.value);
                            setCorTextoPesquisa('#334155');
                        }}
                        style={{
                            ...style.inputPesquisa,
                            color: corTextoPesquisa,
                            borderColor: corTextoPesquisa !== '#334155' ? corTextoPesquisa : '#cbd5e1'
                        }}
                        disabled={botoesBloqueados}
                    />

                    <button
                        type="submit"
                        className="button-padrao"
                        disabled={botoesBloqueados}
                        style={style.botaoPesquisa}
                    >
                        {pesquisaCarregando ? '...' : 'Buscar'}
                    </button>
                </form>
            </header>

            <hr style={style.linha} />

            <main style={style.layoutPrincipal}>
                <aside style={style.colunaTurmas}>
                    <div style={style.cabecalhoSecaoCompacto}>
                        <h2 style={style.tituloSecao}>Turmas</h2>
                        <span style={style.contador}>{turmas.length}</span>
                    </div>

                    {renderizarTurmas()}
                </aside>

                <section style={style.colunaCentro}>
                    <div style={style.cardsResumo}>
                        <div style={style.cardResumo}>
                            <span>Dias letivos no filtro</span>
                            <strong>{totalDiasLetivos}</strong>
                        </div>

                        <div style={style.cardResumo}>
                            <span>Faltas regulares</span>
                            <strong>{totalFaltasTurma}</strong>
                        </div>

                        <div style={style.cardResumo}>
                            <span>Alunos com faltas</span>
                            <strong>{alunosComFaltas}</strong>
                        </div>

                        <div style={style.cardResumo}>
                            <span>Maior total individual</span>
                            <strong>{maiorFaltas}</strong>
                        </div>
                    </div>

                    <div style={style.painelListaAlunos}>
                        <div style={style.cabecalhoSecao}>
                            <div>
                                <h2 style={style.tituloSecao}>Alunos</h2>
                                <p style={style.subtituloSecao}>
                                    {turmaAtiva
                                        ? `${turmaAtiva} — ${obterDescricaoFiltro()}`
                                        : 'Selecione uma turma para visualizar os alunos.'
                                    }
                                </p>
                            </div>

                            <span style={style.avisoJustificadas}>
                                Justificadas não entram na contagem
                            </span>
                        </div>

                        <div style={style.containerConteudoTurmas}>
                            {renderizarListaAlunos()}
                        </div>
                    </div>
                </section>

                <aside style={style.colunaOpcoes}>
                    <h2 style={style.tituloSecao}>Opções de Análise</h2>

                    <div style={style.containerOpcoes}>
                        <button
                            onClick={() => setModoAnalise('data-especifica')}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === 'data-especifica' ? '5px solid #1e3a8a' : '5px solid transparent',
                                backgroundColor: modoAnalise === 'data-especifica' ? '#e0d6ff' : '#f8f9fa'
                            }}
                            disabled={botoesBloqueados}
                        >
                            📅 Analisar por Data
                        </button>

                        {modoAnalise === 'data-especifica' && (
                            <div style={style.boxConfigInternoInput}>
                                <input
                                    type="date"
                                    value={dataEspecifica}
                                    onChange={(e) => setDataEspecifica(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => setModoAnalise('semana')}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === 'semana' ? '5px solid #1e3a8a' : '5px solid transparent',
                                backgroundColor: modoAnalise === 'semana' ? '#e0d6ff' : '#f8f9fa'
                            }}
                            disabled={botoesBloqueados}
                        >
                            📅 Analisar Semanalmente
                        </button>

                        {modoAnalise === 'semana' && (
                            <div style={style.boxConfigInternoInput}>
                                <input
                                    type="date"
                                    value={semanaReferencia}
                                    onChange={(e) => setSemanaReferencia(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => setModoAnalise('mes')}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === 'mes' ? '5px solid #1e3a8a' : '5px solid transparent',
                                backgroundColor: modoAnalise === 'mes' ? '#e0d6ff' : '#f8f9fa'
                            }}
                            disabled={botoesBloqueados}
                        >
                            📊 Histórico Mensal
                        </button>

                        {modoAnalise === 'mes' && (
                            <div style={style.boxConfigInternoInput}>
                                <input
                                    type="month"
                                    value={dataChamada}
                                    onChange={(e) => setDataChamada(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => setModoAnalise('media')}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === 'media' ? '5px solid #1e3a8a' : '5px solid transparent',
                                backgroundColor: modoAnalise === 'media' ? '#e0d6ff' : '#f8f9fa'
                            }}
                            disabled={botoesBloqueados}
                        >
                            📊 Histórico Anual
                        </button>

                        {modoAnalise === 'media' && (
                            <div style={style.boxConfigInternoInput}>
                                <input
                                    type="number"
                                    min="2020"
                                    max="2100"
                                    value={anoSelecionado}
                                    onChange={(e) => setAnoSelecionado(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => setModoAnalise('periodo')}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === 'periodo' ? '5px solid #1e3a8a' : '5px solid transparent',
                                backgroundColor: modoAnalise === 'periodo' ? '#e0d6ff' : '#f8f9fa'
                            }}
                            disabled={botoesBloqueados}
                        >
                            📅 Intervalo de Período
                        </button>

                        {modoAnalise === 'periodo' && (
                            <div style={{ ...style.boxConfigInternoInput, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />

                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    style={style.inputDataPeriodoFiltro}
                                    disabled={botoesBloqueados}
                                />
                            </div>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}

const style = {
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
        position: 'relative',
        boxSizing: 'border-box'
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '18px',
        flexShrink: 0
    },

    headerEsquerda: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        minWidth: 0
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

    tituloPagina: {
        margin: 0,
        fontSize: '30px',
        lineHeight: 1.15,
        color: '#1e293b'
    },

    subtituloPagina: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '15px'
    },

    formPesquisa: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffffff',
        padding: '7px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        flexShrink: 0
    },

    inputPesquisa: {
        width: 'clamp(220px, 22vw, 360px)',
        height: '38px',
        padding: '7px 11px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        fontSize: '15px',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        fontWeight: '500'
    },

    botaoPesquisa: {
        height: '38px',
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        backgroundColor: '#1e3a8a',
        padding: '0 16px'
    },

    linha: {
        border: 'none',
        borderTop: '1px solid #e2e8f0',
        width: '100%',
        margin: '4px 0',
        flexShrink: 0
    },

    layoutPrincipal: {
        display: 'grid',
        gridTemplateColumns: 'minmax(250px, 19vw) minmax(0, 1fr) minmax(280px, 20vw)',
        gap: '18px',
        flex: 1,
        minHeight: 0,
        width: '100%'
    },

    colunaTurmas: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
        boxSizing: 'border-box'
    },

    colunaCentro: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0
    },

    colunaOpcoes: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
        boxSizing: 'border-box'
    },

    cabecalhoSecaoCompacto: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },

    cabecalhoSecao: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        flexShrink: 0
    },

    tituloSecao: {
        margin: 0,
        color: '#1e293b',
        fontSize: '20px',
        lineHeight: 1.2
    },

    subtituloSecao: {
        margin: '4px 0 0 0',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.4
    },

    contador: {
        backgroundColor: '#e0d6ff',
        color: '#4c1d95',
        fontWeight: 'bold',
        borderRadius: '999px',
        padding: '6px 12px',
        fontSize: '13px',
        whiteSpace: 'nowrap'
    },

    containerTurmas: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '8px',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '4px',
        boxSizing: 'border-box'
    },

    btnTurma: {
        border: '2px solid #e5e7eb',
        borderRadius: '15px',
        minHeight: '62px',
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#1e293b',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        flexShrink: 0
    },

    iconeTurma: {
        width: '38px',
        height: '38px',
        borderRadius: '12px',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0
    },

    infoTurma: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1,
        minWidth: 0,
        fontSize: '16px'
    },

    marcadorSelecionado: {
        width: '25px',
        height: '25px',
        borderRadius: '50%',
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
    },

    cardsResumo: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '12px',
        flexShrink: 0
    },

    cardResumo: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '15px',
        minHeight: '76px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '4px',
        color: '#64748b',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box'
    },

    painelListaAlunos: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        minHeight: 0,
        boxSizing: 'border-box'
    },

    avisoJustificadas: {
        backgroundColor: '#eff6ff',
        color: '#1e3a8a',
        borderRadius: '999px',
        padding: '6px 10px',
        fontWeight: 'bold',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        flexShrink: 0
    },

    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '8px',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#f8fafc',
        boxSizing: 'border-box'
    },

    listaAlunos: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    itemAlunoContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%'
    },

    itemAluno: {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '54px',
        padding: '10px 12px',
        borderRadius: '14px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        gap: '12px',
        boxSizing: 'border-box',
        textAlign: 'left',
        fontFamily: 'inherit'
    },

    infoAluno: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0
    },

    numeroAluno: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#e0d6ff',
        color: '#4c1d95',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px'
    },

    nomeAluno: {
        fontSize: '17px',
        fontWeight: '600',
        color: '#1e293b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },

    tagFaltas: {
        fontSize: '14px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: '5px 10px',
        borderRadius: '999px',
        border: '1px solid #e5e7eb',
        flexShrink: 0
    },

    painelAluno: {
        backgroundColor: '#ffffff',
        border: '1px solid #dbeafe',
        borderRadius: '14px',
        padding: '14px',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 32%) minmax(0, 1fr)',
        gap: '14px',
        boxSizing: 'border-box',
        minHeight: '190px',
        boxShadow: '0 10px 20px rgba(30, 58, 138, 0.08)'
    },

    painelAlunoVazio: {
        display: 'none'
    },

    painelAlunoAcoes: {
        borderRight: '1px solid #e2e8f0',
        paddingRight: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        minWidth: 0
    },

    tituloAlunoSelecionado: {
        margin: 0,
        fontSize: '19px',
        lineHeight: 1.2,
        color: '#1e3a8a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },

    subtituloAlunoSelecionado: {
        margin: '5px 0 0 0',
        fontSize: '14px',
        color: '#64748b'
    },

    botoesAluno: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
    },

    btnSecundario: {
        width: '100%',
        padding: '9px',
        borderRadius: '10px',
        border: '1px solid #1e3a8a',
        color: '#1e3a8a',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    btnEditar: {
        width: '100%',
        padding: '9px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#f39c12',
        color: '#ffffff',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    botoesEdicao: {
        display: 'flex',
        gap: '6px',
        width: '100%'
    },

    btnCancelarEdicao: {
        flex: 1,
        padding: '9px',
        borderRadius: '10px',
        border: '1px solid #64748b',
        backgroundColor: '#ffffff',
        color: '#64748b',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    btnSalvarEdicao: {
        flex: 1,
        padding: '9px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#2ecc71',
        color: '#ffffff',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    painelHistorico: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
    },

    tituloHistorico: {
        margin: '0 0 8px 0',
        fontSize: '15px',
        color: '#334155'
    },

    listaHistorico: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        overflowY: 'auto',
        maxHeight: '230px',
        minHeight: '118px',
        paddingRight: '5px'
    },

    itemHistorico: {
        fontSize: '14px',
        fontWeight: '600',
        padding: '8px 10px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        userSelect: 'none'
    },

    tagHistorico: {
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },

    semFaltas: {
        fontSize: '15px',
        color: '#27ae60',
        fontWeight: '600',
        margin: 'auto',
        textAlign: 'center'
    },

    containerOpcoes: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '8px',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '4px',
        boxSizing: 'border-box'
    },

    btnFiltroOpcao: {
        width: '100%',
        minHeight: '54px',
        padding: '12px 14px',
        fontSize: '15px',
        fontWeight: '700',
        color: '#2c3e50',
        border: '1px solid #dcdde1',
        borderRadius: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        flexShrink: 0
    },

    boxConfigInternoInput: {
        backgroundColor: '#ffffff',
        padding: '10px',
        borderRadius: '12px',
        border: '1px solid #e1e8ed',
        boxSizing: 'border-box',
        flexShrink: 0
    },

    inputDataPeriodoFiltro: {
        width: '100%',
        padding: '9px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        boxSizing: 'border-box',
        outline: 'none'
    },

    estadoVazio: {
        backgroundColor: '#ffffff',
        border: '1px dashed #cbd5e1',
        borderRadius: '14px',
        padding: '18px',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '15px',
        boxSizing: 'border-box'
    },

    textoVazio: {
        color: '#64748b',
        fontSize: '15px',
        margin: 0
    },

    btnGerenciar: {
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        padding: '10px 12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginTop: '6px'
    },

    feedbackOverlay: {
        position: 'absolute',
        top: '18px',
        right: '18px',
        zIndex: 30,
        pointerEvents: 'none'
    },

    feedbackCard: {
        backgroundColor: '#ffffff',
        border: '2px solid #bbf7d0',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 14px 35px rgba(15, 23, 42, 0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '340px',
        maxWidth: '460px',
        boxSizing: 'border-box'
    },

    feedbackIcone: {
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '22px',
        flexShrink: 0
    },

    feedbackTitulo: {
        margin: 0,
        color: '#1e293b',
        fontSize: '18px'
    },

    feedbackMensagem: {
        margin: '5px 0 0 0',
        color: '#475569',
        fontSize: '14px',
        lineHeight: 1.45
    }
};

export default Metricas;
