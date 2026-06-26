import { useNavigate } from 'react-router-dom';
import icone01 from '../assets/icon1.png';
import icone02 from '../assets/icon2.png';
import icone09 from '../assets/icon9.png';
import icone10 from '../assets/icon10.png';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import {
    collection,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';

function Inicio() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    const [temNotificacaoImportante, setTemNotificacaoImportante] = useState(false);
    const [quantidadeAlertasAtivos, setQuantidadeAlertasAtivos] = useState(0);

    useEffect(() => {
        let regrasAtivasIds = [];
        let alertasNaoLidos = [];

        const atualizarNotificacao = () => {
            const ocorrenciasValidas = alertasNaoLidos.filter(alerta => {
                return (
                    alerta.lido === false &&
                    alerta.id_regra &&
                    alerta.causador &&
                    regrasAtivasIds.includes(alerta.id_regra)
                );
            });

            setQuantidadeAlertasAtivos(ocorrenciasValidas.length);
            setTemNotificacaoImportante(ocorrenciasValidas.length > 0);
        };

        const regrasRef = collection(db, "config_alertas");

        const qRegrasAtivas = query(
            regrasRef,
            where("ativo", "==", true)
        );

        const unsubscribeRegras = onSnapshot(qRegrasAtivas, (snapshot) => {
            regrasAtivasIds = snapshot.docs.map(docSnap => docSnap.id);
            atualizarNotificacao();
        }, (error) => {
            console.error("Erro ao escutar regras ativas:", error);
            setTemNotificacaoImportante(false);
            setQuantidadeAlertasAtivos(0);
        });

        const alertasRef = collection(db, "alertas_disparados");

        const qAlertasNaoLidos = query(
            alertasRef,
            where("lido", "==", false)
        );

        const unsubscribeAlertas = onSnapshot(qAlertasNaoLidos, (snapshot) => {
            alertasNaoLidos = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));

            atualizarNotificacao();
        }, (error) => {
            console.error("Erro ao escutar alertas disparados:", error);
            setTemNotificacaoImportante(false);
            setQuantidadeAlertasAtivos(0);
        });

        return () => {
            unsubscribeRegras();
            unsubscribeAlertas();
        };
    }, []);

    const handleHoverNotificacao = (e, isHovering, isImportant) => {
        e.currentTarget.style.transform = isHovering ? 'translateY(-3px)' : 'translateY(0)';

        if (isHovering) {
            e.currentTarget.style.boxShadow = isImportant
                ? '0 8px 25px rgba(239, 68, 68, 0.25)'
                : '0 8px 25px rgba(245, 158, 11, 0.2)';

            e.currentTarget.style.backgroundColor = isImportant ? '#fee2e2' : '#fef3c7';
        } else {
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)';
            e.currentTarget.style.backgroundColor = isImportant ? '#fef2f2' : '#fffbeb';
        }
    };

    return (
        <div className="card-projeto" style={containerStyle}>
            <header style={headerStyle}>
                <h1 style={titleStyle}>Bem-vindo!</h1>
                <p style={subtitleStyle}>{dataFormatada}</p>
            </header>

            <h2 style={menuTitleStyle}>Menu Principal</h2>

            <div style={menuContainerStyle}>
                <button
                    className="button-padrao"
                    style={buttonStyle}
                    onClick={() => navigate('/cadastrarfaltas')}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone02} alt="Ícone Faltas" style={iconStyle} />
                    </div>

                    <span style={buttonTextStyle}>
                        Adicionar Faltas do Dia <strong style={highlightStyle}>({diaSemana})</strong>
                    </span>
                </button>

                <button
                    className="button-padrao"
                    style={buttonStyle}
                    onClick={() => navigate('/turmas')}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone01} alt="Ícone Turmas" style={iconStyle} />
                    </div>

                    <span style={buttonTextStyle}>
                        Gerenciar Turmas Registradas
                    </span>
                </button>

                <button
                    className="button-padrao"
                    style={buttonStyle}
                    onClick={() => navigate('/metricas')}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone09} alt="Ícone Métricas" style={iconStyle} />
                    </div>

                    <span style={buttonTextStyle}>
                        Consultar Métricas de Frequência
                    </span>
                </button>

                <button
                    className="button-padrao"
                    style={{
                        ...buttonNotificacaoStyle,
                        border: temNotificacaoImportante ? '5px solid #ef4444' : '1px solid #f59e0b',
                        backgroundColor: temNotificacaoImportante ? '#fef2f2' : '#fffbeb',
                        height: temNotificacaoImportante ? '100px' : '80px'
                    }}
                    onClick={() => navigate('/alertas')}
                    onMouseEnter={(e) => handleHoverNotificacao(e, true, temNotificacaoImportante)}
                    onMouseLeave={(e) => handleHoverNotificacao(e, false, temNotificacaoImportante)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone10} alt="Ícone Notificações" style={iconStyle} />

                        {temNotificacaoImportante && (
                            <span style={badgeStyle}>
                                {quantidadeAlertasAtivos}
                            </span>
                        )}
                    </div>

                    <span style={{
                        ...buttonTextStyle,
                        color: temNotificacaoImportante ? '#991b1b' : '#92400e'
                    }}>
                        {temNotificacaoImportante
                            ? `Alertas acionados (${quantidadeAlertasAtivos})`
                            : "Alertas"
                        }
                    </span>
                </button>
            </div>
        </div>
    );
}

const handleHover = (e, isHovering) => {
    e.currentTarget.style.transform = isHovering ? 'translateY(-3px)' : 'translateY(0)';

    e.currentTarget.style.boxShadow = isHovering
        ? '0 8px 20px rgba(0, 0, 0, 0.12), 0 0 8px rgba(37, 99, 235, 0.2)'
        : '0 2px 4px rgba(0, 0, 0, 0.04)';

    e.currentTarget.style.backgroundColor = isHovering ? '#bfdbfe' : '#e0f2fe';
};

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '480px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    border: '1px solid #f0f0f0'
};

const headerStyle = {
    marginBottom: '24px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '16px'
};

const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0'
};

const subtitleStyle = {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
};

const menuTitleStyle = {
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '12px',
    fontWeight: '600'
};

const menuContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
};

const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#e0f2fe',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.25s ease-in-out',
    textAlign: 'left'
};

const iconContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    position: 'relative'
};

const iconStyle = {
    width: '28px',
    height: '28px',
    objectFit: 'contain'
};

const buttonTextStyle = {
    color: '#0369a1',
    fontSize: '16px',
    fontWeight: '600',
    flex: 1
};

const highlightStyle = {
    color: '#0284c7',
    fontWeight: '700'
};

const buttonNotificacaoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    width: '100%',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.25s ease-in-out',
    textAlign: 'left',
    position: 'relative'
};

const badgeStyle = {
    position: 'absolute',
    top: '-15px',
    right: '-15px',
    minWidth: '30px',
    height: '30px',
    padding: '0 6px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    boxSizing: 'border-box'
};

export default Inicio;