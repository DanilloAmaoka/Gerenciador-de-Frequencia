import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import {
    collection,
    onSnapshot
} from 'firebase/firestore';

import icone01 from '../assets/icon1.png';
import icone02 from '../assets/icon2.png';
import icone09 from '../assets/icon9.png';
import icone10 from '../assets/icon10.png';

import { getInfoData } from '../utils/data';

function Inicio() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    const [turmas, setTurmas] = useState([]);
    const [regrasAtivas, setRegrasAtivas] = useState([]);
    const [alertasDisparados, setAlertasDisparados] = useState([]);
    const [feedback, setFeedback] = useState(null);

    const totalTurmas = turmas.length;
    const totalAlunos = turmas.reduce((total, turma) => total + ((turma.alunos || []).length), 0);

    const idsRegrasAtivas = regrasAtivas.map((regra) => regra.id);

    const alertasImportantes = alertasDisparados.filter((alerta) =>
        alerta.lido === false && idsRegrasAtivas.includes(alerta.id_regra)
    );

    const temNotificacaoImportante = alertasImportantes.length > 0;

    const mostrarFeedback = (tipo, titulo, mensagem) => {
        setFeedback({ tipo, titulo, mensagem });

        setTimeout(() => {
            setFeedback(null);
        }, 3000);
    };

    useEffect(() => {
        const unsubscribeTurmas = onSnapshot(
            collection(db, 'turmas'),
            (snapshot) => {
                const listaTurmas = snapshot.docs
                    .map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data()
                    }))
                    .filter((turma) => turma.nome)
                    .sort((a, b) => a.nome.localeCompare(b.nome));

                setTurmas(listaTurmas);
            },
            (error) => {
                console.error('Erro ao escutar turmas:', error);
            }
        );

        const unsubscribeRegras = onSnapshot(
            collection(db, 'config_alertas'),
            (snapshot) => {
                const listaRegras = snapshot.docs
                    .map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data()
                    }))
                    .filter((regra) => regra.ativo !== false);

                setRegrasAtivas(listaRegras);
            },
            (error) => {
                console.error('Erro ao escutar regras de alerta:', error);
            }
        );

        const unsubscribeAlertas = onSnapshot(
            collection(db, 'alertas_disparados'),
            (snapshot) => {
                const listaAlertas = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));

                setAlertasDisparados(listaAlertas);
            },
            (error) => {
                console.error('Erro ao escutar alertas disparados:', error);
            }
        );

        return () => {
            unsubscribeTurmas();
            unsubscribeRegras();
            unsubscribeAlertas();
        };
    }, []);

    const irParaChamada = () => {
        if (totalTurmas === 0) {
            mostrarFeedback(
                'erro',
                'Nenhuma turma cadastrada',
                'Cadastre pelo menos uma turma antes de registrar faltas.'
            );
            return;
        }

        navigate('/cadastrarfaltas');
    };

    const irParaMetricas = () => {
        if (totalTurmas === 0) {
            mostrarFeedback(
                'erro',
                'Sem dados para analisar',
                'Cadastre turmas e alunos antes de consultar métricas.'
            );
            return;
        }

        navigate('/metricas');
    };

    const cardsMenu = [
        {
            titulo: 'Adicionar Faltas do Dia',
            descricao: `Registrar chamada de ${diaSemana}`,
            detalhe: totalTurmas > 0 ? `${totalTurmas} turma(s) disponíveis` : 'Cadastre uma turma primeiro',
            icone: icone02,
            cor: '#e0f2fe',
            borda: '#bae6fd',
            texto: '#0369a1',
            acao: irParaChamada
        },
        {
            titulo: 'Gerenciar',
            descricao: 'Criar turmas e organizar alunos',
            detalhe: `${totalTurmas} turma(s) • ${totalAlunos} aluno(s)`,
            icone: icone01,
            cor: '#f5f3ff',
            borda: '#ddd6fe',
            texto: '#5b21b6',
            acao: () => navigate('/turmas')
        },
        {
            titulo: 'Métricas de Frequência',
            descricao: 'Consultar faltas por turma, aluno e período',
            detalhe: totalTurmas > 0 ? 'Relatórios disponíveis' : 'Aguardando turmas',
            icone: icone09,
            cor: '#ecfdf5',
            borda: '#bbf7d0',
            texto: '#166534',
            acao: irParaMetricas
        },
        {
            titulo: 'Alertas',
            descricao: temNotificacaoImportante
                ? `${alertasImportantes.length} alerta(s) ativo(s) aguardando atenção`
                : 'Criar regras e acompanhar notificações',
            detalhe: regrasAtivas.length > 0
                ? `${regrasAtivas.length} regra(s) ativa(s)`
                : 'Nenhuma regra ativa',
            icone: icone10,
            cor: temNotificacaoImportante ? '#fef2f2' : '#fffbeb',
            borda: temNotificacaoImportante ? '#ef4444' : '#fde68a',
            texto: temNotificacaoImportante ? '#991b1b' : '#92400e',
            acao: () => navigate('/alertas'),
            importante: temNotificacaoImportante
        }
    ];

    const renderizarFeedback = () => {
        if (!feedback) return null;

        return (
            <div style={style.feedbackOverlay}>
                <div
                    style={{
                        ...style.feedbackCard,
                        borderColor: feedback.tipo === 'erro' ? '#fecaca' : '#bbf7d0'
                    }}
                >
                    <div
                        style={{
                            ...style.feedbackIcone,
                            backgroundColor: feedback.tipo === 'erro' ? '#fee2e2' : '#dcfce7',
                            color: feedback.tipo === 'erro' ? '#dc2626' : '#16a34a'
                        }}
                    >
                        {feedback.tipo === 'erro' ? '!' : '✓'}
                    </div>

                    <div>
                        <h3 style={style.feedbackTitulo}>{feedback.titulo}</h3>
                        <p style={style.feedbackMensagem}>{feedback.mensagem}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={style.containerPrincipal}>
            {renderizarFeedback()}

            <header style={style.header}>
                <div>
                    <h1 style={style.titleStyle}>Bem-vindo!</h1>

                    <p style={style.subtitleStyle}>
                        {dataFormatada} — {diaSemana}
                    </p>
                </div>

                <div style={style.resumoSistema}>
                    <div style={style.itemResumo}>
                        <span>Turmas</span>
                        <strong>{totalTurmas}</strong>
                    </div>

                    <div style={style.itemResumo}>
                        <span>Alunos</span>
                        <strong>{totalAlunos}</strong>
                    </div>

                    <div
                        style={{
                            ...style.itemResumo,
                            backgroundColor: temNotificacaoImportante ? '#fee2e2' : '#f8fafc',
                            color: temNotificacaoImportante ? '#991b1b' : '#334155'
                        }}
                    >
                        <span>Alertas</span>
                        <strong>{alertasImportantes.length}</strong>
                    </div>
                </div>
            </header>

            <section style={style.blocoInfo}>
                <div>
                    <h2 style={style.tituloBlocoInfo}>Menu Principal</h2>

                    <p style={style.textoBlocoInfo}>
                        Escolha uma área para continuar o gerenciamento pedagógico.
                    </p>
                </div>

                {temNotificacaoImportante && (
                    <button
                        className="button-padrao"
                        style={style.botaoAvisoRapido}
                        onClick={() => navigate('/alertas')}
                    >
                        🚨 Ver alertas ativos
                    </button>
                )}
            </section>

            <div style={style.menuContainer}>
                {cardsMenu.map((card) => (
                    <button
                        key={card.titulo}
                        className="button-padrao"
                        style={{
                            ...style.cardMenu,
                            backgroundColor: card.cor,
                            borderColor: card.borda,
                            boxShadow: card.importante
                                ? '0 10px 24px rgba(239, 68, 68, 0.22)'
                                : '0 4px 12px rgba(15, 23, 42, 0.06)'
                        }}
                        onClick={card.acao}
                    >
                        <div style={style.iconWrapper}>
                            <img src={card.icone} alt={card.titulo} style={style.iconStyle} />

                            {card.importante && (
                                <span style={style.badgeStyle} />
                            )}
                        </div>

                        <div style={style.textoCard}>
                            <span
                                style={{
                                    ...style.tituloCard,
                                    color: card.texto
                                }}
                            >
                                {card.titulo}
                            </span>

                            <span style={style.descricaoCard}>
                                {card.descricao}
                            </span>

                            <span style={style.detalheCard}>
                                {card.detalhe}
                            </span>
                        </div>

                        <span
                            style={{
                                ...style.setaCard,
                                color: card.texto
                            }}
                        >
                            ›
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

const style = {
    containerPrincipal: {
        display: 'flex',
        flexDirection: 'column',
        width: 'min(620px, calc(100vw - 32px))',
        height: 'min(760px, calc(100vh - 32px))',
        padding: '22px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        border: '1px solid #f0f0f0',
        gap: '14px',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'visible',
        flexShrink: 0,
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '18px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '18px'
    },

    titleStyle: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#1e293b',
        margin: '0 0 4px 0'
    },

    subtitleStyle: {
        fontSize: '15px',
        color: '#64748b',
        margin: 0
    },

    resumoSistema: {
        display: 'flex',
        gap: '8px'
    },

    itemResumo: {
        minWidth: '72px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '9px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        textAlign: 'center',
        color: '#334155'
    },

    blocoInfo: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
    },

    tituloBlocoInfo: {
        margin: 0,
        fontSize: '17px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#64748b',
        fontWeight: '800'
    },

    textoBlocoInfo: {
        margin: '4px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    botaoAvisoRapido: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        padding: '10px 14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },

    menuContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '13px'
    },

    cardMenu: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '13px 14px',
        minHeight: '78px',
        borderRadius: '16px',
        border: '2px solid transparent',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.25s ease-in-out',
        textAlign: 'left',
        boxSizing: 'border-box'
    },

    iconWrapper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '54px',
        height: '54px',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        flexShrink: 0
    },

    iconStyle: {
        width: '30px',
        height: '30px',
        objectFit: 'contain'
    },

    textoCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        flex: 1
    },

    tituloCard: {
        fontSize: '18px',
        fontWeight: '800'
    },

    descricaoCard: {
        fontSize: '14px',
        color: '#334155',
        fontWeight: '600'
    },

    detalheCard: {
        fontSize: '13px',
        color: '#64748b'
    },

    setaCard: {
        fontSize: '32px',
        fontWeight: '300',
        lineHeight: 1
    },

    badgeStyle: {
        position: 'absolute',
        top: '-3px',
        right: '-3px',
        width: '13px',
        height: '13px',
        backgroundColor: '#ef4444',
        borderRadius: '50%',
        border: '2px solid #ffffff'
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
        minWidth: '330px',
        maxWidth: '450px'
    },

    feedbackIcone: {
        width: '44px',
        height: '44px',
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

export default Inicio;
