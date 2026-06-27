import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import { executarMotorAlertasDaTurma } from '../services/motorAlertas';

import {
    collection,
    getDocs,
    setDoc,
    doc
} from 'firebase/firestore';

import icone08 from '../assets/icon8.png';

function CadastrarFaltas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    const [turmas, setTurmas] = useState([]);
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaFaltas') || localStorage.getItem('turmaAtivaTurmas') || '');

    const [alunos, setAlunos] = useState([]);
    const [faltantes, setFaltantes] = useState([]);

    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);
    const [iniciarSalvar, setIniciarSalvar] = useState(0);

    const [feedback, setFeedback] = useState(null);

    const turmaSelecionada = turmas.find((turma) => turma.nome === turmaAtiva);
    const botoesBloqueados = carregando || salvando || !!feedback;

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

    const obterNovoDiaSemana = (dataISO) => {
        const dias = [
            'Domingo',
            'Segunda-feira',
            'Terça-feira',
            'Quarta-feira',
            'Quinta-feira',
            'Sexta-feira',
            'Sábado'
        ];

        const data = new Date(dataISO + 'T12:00:00');
        return dias[data.getDay()];
    };

    const obterDataFormatadaExibicao = () => {
        const hoje = new Date().toISOString().split('T')[0];

        if (dataChamada === hoje) {
            return dataFormatada;
        }

        return formatarNovaData(dataChamada);
    };

    const obterDiaSemanaExibicao = () => {
        const hoje = new Date().toISOString().split('T')[0];

        if (dataChamada === hoje) {
            return diaSemana;
        }

        return obterNovoDiaSemana(dataChamada);
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
                setFaltantes([]);
                localStorage.removeItem('turmaAtivaFaltas');
                localStorage.removeItem('turmaAtivaTurmas');
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
        if (!turmaAtiva) {
            setAlunos([]);
            setFaltantes([]);
            return;
        }

        localStorage.setItem('turmaAtivaFaltas', turmaAtiva);
        localStorage.setItem('turmaAtivaTurmas', turmaAtiva);

        const turma = turmas.find((item) => item.nome === turmaAtiva);

        if (turma) {
            setAlunos(turma.alunos || []);
            setFaltantes([]);
        } else {
            setAlunos([]);
            setFaltantes([]);
        }
    }, [turmaAtiva, turmas]);

    const handleSalvarBanco = async () => {
        if (!turmaSelecionada) {
            mostrarFeedback('erro', 'Turma não encontrada', 'Selecione uma turma cadastrada antes de salvar a chamada.');
            return;
        }

        try {
            setSalvando(true);

            const chamadaDocRef = doc(db, 'turmas', turmaSelecionada.id, 'chamadas', dataChamada);

            await setDoc(chamadaDocRef, {
                data: dataChamada,
                diaDaSemana: obterDiaSemanaExibicao(),
                faltas: faltantes,
                atualizadoEm: new Date().toISOString()
            }, { merge: true });

            await executarMotorAlertasDaTurma({
                idTurma: turmaSelecionada.id,
                nomeTurma: turmaSelecionada.nome,
                alunos,
                dataReferencia: dataChamada
            });

            mostrarFeedback(
                'sucesso',
                'Chamada salva',
                faltantes.length > 0
                    ? 'As faltas foram gravadas e os alertas foram recalculados.'
                    : 'A chamada sem faltas foi gravada e as sequências foram atualizadas.'
            );

            setFaltantes([]);

            setTimeout(() => {
                setIniciarSalvar(0);
            }, 900);
        } catch (error) {
            console.error('Erro ao salvar no Firebase e processar regras:', error);
            mostrarFeedback('erro', 'Erro ao salvar', 'Não foi possível salvar as faltas. Verifique o console.');
        } finally {
            setSalvando(false);
        }
    };

    const handleLimparSelecao = () => {
        setFaltantes([]);
    };

    const handleConfirmarChamada = () => {
        if (!turmaSelecionada) {
            mostrarFeedback('erro', 'Selecione uma turma', 'Escolha uma turma antes de confirmar a chamada.');
            return;
        }

        setIniciarSalvar(1);
    };

    const alternarFalta = (nomeAluno) => {
        setFaltantes((prev) => {
            const existe = prev.some((item) => item.nome === nomeAluno);

            if (existe) {
                return prev.filter((item) => item.nome !== nomeAluno);
            }

            return [
                ...prev,
                {
                    nome: nomeAluno,
                    tipo: 'regular'
                }
            ];
        });
    };

    const alternarJustificativa = (nomeAluno) => {
        setFaltantes((prev) =>
            prev.map((item) => {
                if (item.nome === nomeAluno) {
                    return {
                        ...item,
                        tipo: item.tipo === 'regular' ? 'justificada' : 'regular'
                    };
                }

                return item;
            })
        );
    };

    const obterResumoFaltas = () => {
        const regulares = faltantes.filter((item) => item.tipo !== 'justificada').length;
        const justificadas = faltantes.filter((item) => item.tipo === 'justificada').length;

        return {
            regulares,
            justificadas,
            total: faltantes.length
        };
    };

    const resumoFaltas = obterResumoFaltas();

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

    const renderizarListaTurmas = () => {
        return (
            <div style={style.containerTurmas}>
                {carregando && turmas.length === 0 && (
                    <p style={style.textoVazio}>Carregando turmas...</p>
                )}

                {!carregando && turmas.length === 0 && (
                    <div style={style.estadoVazio}>
                        <strong>Nenhuma turma cadastrada.</strong>
                        <span>Cadastre uma turma antes de registrar faltas.</span>

                        <button
                            className="button-padrao"
                            style={style.btnGerenciarVazio}
                            onClick={() => navigate('/turmas')}
                            disabled={botoesBloqueados}
                        >
                            Ir para Gerenciar
                        </button>
                    </div>
                )}

                {turmas.map((turma) => {
                    const estaSelecionada = turmaAtiva === turma.nome;
                    const totalAlunos = (turma.alunos || []).length;

                    return (
                        <button
                            key={turma.id}
                            style={{
                                ...style.btnTurma,
                                backgroundColor: estaSelecionada ? '#e0d6ff' : '#ffffff',
                                borderColor: estaSelecionada ? '#7c3aed' : '#e5e7eb',
                                transform: estaSelecionada ? 'scale(1.02)' : 'scale(1)'
                            }}
                            className="button-turma"
                            onClick={() => setTurmaAtiva(turma.nome)}
                            disabled={botoesBloqueados}
                        >
                            <div style={style.iconeTurma}>🏫</div>

                            <div style={style.infoTurma}>
                                <strong>{turma.nome}</strong>
                                <span>{totalAlunos} aluno(s)</span>
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

    const renderizarTelaSelecao = () => {
        return (
            <div style={style.containerPrincipal}>
                {renderizarFeedback()}

                <div style={style.header}>
                    <button
                        className="button-padrao"
                        style={style.buttonVoltar}
                        onClick={() => navigate(-1)}
                        disabled={botoesBloqueados}
                    >
                        <img src={icone08} alt="Voltar" style={{ width: '30px', height: '30px' }} />
                    </button>

                    <div>
                        <h1 style={style.titleStyle}>Adicionar Faltas</h1>
                        <p style={style.subtitleStyle}>
                            Selecione a turma e marque os alunos ausentes.
                        </p>
                    </div>
                </div>

                <hr style={style.linha} />

                <div style={style.layoutPrincipal}>
                    <aside style={style.colunaTurmas}>
                        <div style={style.cabecalhoColuna}>
                            <h2 style={style.tituloSecao}>Turmas</h2>
                            <span style={style.contador}>{turmas.length}</span>
                        </div>

                        {renderizarListaTurmas()}
                    </aside>

                    <section style={style.colunaAlunos}>
                        <div style={style.cabecalhoSecaoAlunos}>
                            <div>
                                <h2 style={style.tituloSecao}>Alunos</h2>
                                <p style={style.subtituloSecao}>
                                    {turmaAtiva
                                        ? `Exibindo chamada da turma ${turmaAtiva}.`
                                        : 'Selecione uma turma para ver os alunos.'
                                    }
                                </p>
                            </div>

                            <span style={style.contador}>
                                {alunos.length} aluno(s)
                            </span>
                        </div>

                        <div style={style.containerConteudoTurmas}>
                            {!turmaAtiva && (
                                <div style={style.estadoVazio}>
                                    <strong>Nenhuma turma selecionada.</strong>
                                    <span>Escolha uma turma na lateral para começar.</span>
                                </div>
                            )}

                            {turmaAtiva && carregando && (
                                <p style={style.textoVazio}>Carregando lista...</p>
                            )}

                            {turmaAtiva && !carregando && alunos.length === 0 && (
                                <div style={style.estadoVazio}>
                                    <strong>Nenhum aluno cadastrado nessa turma.</strong>
                                    <span>Cadastre alunos antes de registrar faltas.</span>

                                    <button
                                        onClick={() => navigate('/turmas')}
                                        style={style.buttonAdicionarAluno}
                                        disabled={botoesBloqueados}
                                    >
                                        + Cadastrar alunos nesta turma
                                    </button>
                                </div>
                            )}

                            {turmaAtiva && !carregando && alunos.length > 0 && (
                                <ul style={style.listaAlunos}>
                                    {alunos.map((aluno, index) => {
                                        const estaFaltando = faltantes.some((item) => item.nome === aluno);

                                        return (
                                            <li
                                                key={`${aluno}-${index}`}
                                                onClick={() => !botoesBloqueados && alternarFalta(aluno)}
                                                style={{
                                                    ...style.itemAlunoStyle,
                                                    backgroundColor: estaFaltando ? '#ffebee' : '#ffffff',
                                                    borderLeft: estaFaltando ? '5px solid #ff5252' : '5px solid transparent'
                                                }}
                                                className="button-padrao"
                                            >
                                                <div style={style.infoAluno}>
                                                    <span style={style.numeroAluno}>{index + 1}</span>

                                                    <span
                                                        style={{
                                                            ...style.nomeAluno,
                                                            color: estaFaltando ? '#d32f2f' : '#1e293b',
                                                            fontWeight: estaFaltando ? 'bold' : '600'
                                                        }}
                                                    >
                                                        {aluno}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        ...style.bolinhaFalta,
                                                        borderColor: estaFaltando ? '#ff5252' : '#cbd5e1',
                                                        backgroundColor: estaFaltando ? '#ff5252' : 'transparent'
                                                    }}
                                                >
                                                    {estaFaltando ? '✕' : ''}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div style={style.abaSalvar}>
                            <div>
                                <p style={style.textoResumo}>
                                    Você marcou <strong>{faltantes.length}</strong> falta(s).
                                </p>

                                <p style={style.textoResumoMenor}>
                                    Mesmo com 0 faltas, salvar a chamada ajuda o sistema a quebrar sequências de faltas seguidas.
                                </p>
                            </div>

                            <div style={style.botoesRodape}>
                                <button
                                    className="button-padrao"
                                    onClick={handleLimparSelecao}
                                    disabled={faltantes.length === 0 || botoesBloqueados}
                                    style={{
                                        ...style.buttonConfirmar,
                                        flex: 1,
                                        backgroundColor: faltantes.length === 0 ? '#cbd5e1' : '#64748b',
                                        cursor: faltantes.length === 0 || botoesBloqueados ? 'not-allowed' : 'pointer',
                                        opacity: faltantes.length === 0 ? 0.7 : 1
                                    }}
                                >
                                    Limpar Seleção
                                </button>

                                <button
                                    className="button-padrao"
                                    onClick={handleConfirmarChamada}
                                    disabled={!turmaAtiva || botoesBloqueados}
                                    style={{
                                        ...style.buttonConfirmar,
                                        flex: 2,
                                        backgroundColor: !turmaAtiva ? '#cbd5e1' : '#ff5252',
                                        cursor: !turmaAtiva || botoesBloqueados ? 'not-allowed' : 'pointer',
                                        opacity: !turmaAtiva ? 0.7 : 1
                                    }}
                                >
                                    {faltantes.length === 0
                                        ? 'Confirmar chamada sem faltas'
                                        : 'Confirmar chamada'
                                    }
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    };

    const renderizarTelaConfirmacao = () => {
        return (
            <div style={style.containerConfirmacao}>
                {renderizarFeedback()}

                <div style={style.header}>
                    <button
                        className="button-padrao"
                        style={style.buttonVoltar}
                        onClick={() => setIniciarSalvar(0)}
                        disabled={botoesBloqueados}
                    >
                        <img src={icone08} alt="Voltar" style={{ width: '30px', height: '30px' }} />
                    </button>

                    <div>
                        <h1 style={style.titleStyle}>Confirmar Chamada</h1>
                        <p style={style.subtitleStyle}>
                            Revise a data e os faltantes antes de salvar.
                        </p>
                    </div>
                </div>

                <hr style={style.linha} />

                <div style={style.cardConfirmacao}>
                    <div style={style.cardData}>
                        <div>
                            <h2 style={style.tituloSecao}>Dados da chamada</h2>

                            <p style={style.textoData}>
                                <strong>Turma:</strong> {turmaAtiva || 'Nenhuma turma'}
                            </p>

                            <p style={style.textoData}>
                                <strong>Data:</strong> {obterDataFormatadaExibicao()} - {obterDiaSemanaExibicao()}
                            </p>
                        </div>

                        <div style={style.seletorDataFake} className="button-padrao">
                            <input
                                type="date"
                                value={dataChamada}
                                onChange={(e) => setDataChamada(e.target.value)}
                                onClick={(e) => {
                                    try {
                                        e.target.showPicker();
                                    } catch (err) {
                                        console.log(err);
                                    }
                                }}
                                style={style.inputDataReal}
                                disabled={botoesBloqueados}
                            />

                            <div style={style.visualData}>
                                📅 {obterDataFormatadaExibicao()}
                            </div>
                        </div>
                    </div>

                    <div style={style.resumoCards}>
                        <div style={style.cardResumo}>
                            <span>Total</span>
                            <strong>{resumoFaltas.total}</strong>
                        </div>

                        <div style={style.cardResumo}>
                            <span>Regulares</span>
                            <strong>{resumoFaltas.regulares}</strong>
                        </div>

                        <div style={style.cardResumo}>
                            <span>Justificadas</span>
                            <strong>{resumoFaltas.justificadas}</strong>
                        </div>
                    </div>

                    <div style={style.areaListaConfirmacao}>
                        <div style={style.cabecalhoSecaoAlunos}>
                            <h2 style={style.tituloSecao}>
                                Lista de faltantes
                            </h2>

                            <p style={style.dicaJustificativa}>
                                💡 Clique em um aluno para alternar entre Falta Regular e Justificada.
                            </p>
                        </div>

                        <div style={style.listaConfirmacao}>
                            {faltantes.length > 0 ? (
                                <ul style={style.listaAlunos}>
                                    {faltantes.map((item, index) => {
                                        const ehJustificada = item.tipo === 'justificada';

                                        return (
                                            <li
                                                key={`${item.nome}-${index}`}
                                                onClick={() => !botoesBloqueados && alternarJustificativa(item.nome)}
                                                style={{
                                                    ...style.itemConfirmacao,
                                                    backgroundColor: ehJustificada ? '#e8f5e9' : '#fff5f5',
                                                    borderLeft: ehJustificada ? '5px solid #4caf50' : '5px solid #ff5252'
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: ehJustificada ? '#2e7d32' : '#c62828',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    {index + 1}. {item.nome}
                                                </span>

                                                <span
                                                    style={{
                                                        ...style.tagTipoFalta,
                                                        color: ehJustificada ? '#2e7d32' : '#c62828',
                                                        backgroundColor: ehJustificada ? '#dff5e4' : '#fee2e2'
                                                    }}
                                                >
                                                    {ehJustificada ? 'Justificada ✓' : 'Falta Regular'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div style={style.estadoVazio}>
                                    <strong>Nenhum aluno foi marcado como faltante.</strong>
                                    <span>A chamada será salva como dia sem faltas para essa turma.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={style.botoesConfirmacao}>
                        <button
                            className="button-padrao"
                            onClick={() => setIniciarSalvar(0)}
                            style={{
                                ...style.buttonConfirmar_CancelarSalvamento,
                                backgroundColor: '#64748b'
                            }}
                            disabled={botoesBloqueados}
                        >
                            Voltar
                        </button>

                        <button
                            className="button-padrao"
                            onClick={handleSalvarBanco}
                            style={{
                                ...style.buttonConfirmar_CancelarSalvamento,
                                backgroundColor: '#4caf50'
                            }}
                            disabled={botoesBloqueados}
                        >
                            {salvando ? 'Salvando...' : 'Confirmar e Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return iniciarSalvar === 0 ? renderizarTelaSelecao() : renderizarTelaConfirmacao();
}

const style = {
    titleStyle: {
        fontSize: '30px',
        fontWeight: '800',
        color: '#1e293b',
        margin: 0
    },

    subtitleStyle: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '15px'
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

    containerConfirmacao: {
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

    header: {
        display: 'flex',
        flexDirection: 'row',
        gap: '15px',
        alignItems: 'center',
        flexShrink: 0
    },

    linha: {
        border: 'none',
        borderTop: '1px solid #e2e8f0',
        width: '100%',
        margin: '4px 0',
        flexShrink: 0
    },

    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '42px',
        height: '42px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },

    layoutPrincipal: {
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 24vw) minmax(0, 1fr)',
        gap: '18px',
        flex: 1,
        minHeight: 0,
        width: '100%'
    },

    colunaTurmas: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minHeight: 0
    },

    colunaAlunos: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minHeight: 0
    },

    cabecalhoColuna: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },

    cabecalhoSecaoAlunos: {
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
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
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
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box'
    },

    btnTurma: {
        border: '2px solid #e5e7eb',
        borderRadius: '15px',
        minHeight: '64px',
        padding: '11px 12px',
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
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    itemAlunoStyle: {
        minHeight: '50px',
        padding: '10px 12px',
        border: '1px solid #e5e7eb',
        fontSize: '17px',
        cursor: 'pointer',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        boxSizing: 'border-box'
    },

    infoAluno: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
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
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },

    bolinhaFalta: {
        width: '23px',
        height: '23px',
        borderRadius: '50%',
        border: '2px solid #cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
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

    btnGerenciarVazio: {
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        padding: '10px 12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginTop: '6px'
    },

    buttonAdicionarAluno: {
        marginTop: '8px',
        padding: '10px 14px',
        border: '1px dashed #d0d7de',
        borderRadius: '10px',
        background: '#fafafa',
        color: '#666',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%'
    },

    abaSalvar: {
        padding: '14px',
        backgroundColor: '#fff3f3',
        border: '1px solid #ffcdd2',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0
    },

    textoResumo: {
        margin: 0,
        textAlign: 'left',
        fontSize: '17px'
    },

    textoResumoMenor: {
        margin: '4px 0 0 0',
        color: '#7f1d1d',
        fontSize: '13px'
    },

    botoesRodape: {
        display: 'flex',
        gap: '10px',
        width: '520px',
        maxWidth: '48%',
        justifyContent: 'flex-end',
        flexShrink: 0
    },

    buttonConfirmar: {
        color: 'white',
        minHeight: '42px',
        padding: '10px 18px',
        borderRadius: '9px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '15px'
    },

    cardConfirmacao: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        flex: 1,
        padding: '20px',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        minHeight: 0,
        boxSizing: 'border-box'
    },

    cardData: {
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0
    },

    textoData: {
        margin: '6px 0 0 0',
        fontSize: '17px',
        color: '#334155'
    },

    seletorDataFake: {
        position: 'relative',
        display: 'inline-block'
    },

    inputDataReal: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
        zIndex: 2
    },

    visualData: {
        padding: '8px 13px',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        color: '#374151',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: 'inherit',
        textAlign: 'center',
        whiteSpace: 'nowrap'
    },

    resumoCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '12px',
        flexShrink: 0
    },

    cardResumo: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: '#475569',
        textAlign: 'center'
    },

    dicaJustificativa: {
        margin: 0,
        color: '#64748b',
        fontSize: '14px',
        alignSelf: 'center'
    },

    areaListaConfirmacao: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: '10px'
    },

    listaConfirmacao: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        minHeight: 0,
        gap: '5px',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#f8fafc',
        boxSizing: 'border-box'
    },

    itemConfirmacao: {
        minHeight: '48px',
        padding: '10px 12px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s',
        border: '1px solid #e5e7eb',
        boxSizing: 'border-box'
    },

    tagTipoFalta: {
        fontSize: '13px',
        fontStyle: 'italic',
        padding: '5px 9px',
        borderRadius: '999px',
        fontWeight: 'bold'
    },

    botoesConfirmacao: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: 'auto',
        flexShrink: 0
    },

    buttonConfirmar_CancelarSalvamento: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '170px',
        padding: '12px 22px',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '44px'
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
        maxWidth: '460px'
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

export default CadastrarFaltas;
