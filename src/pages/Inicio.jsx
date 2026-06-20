import { useNavigate } from 'react-router-dom';
import icone01 from '../assets/icon1.png';
import icone02 from '../assets/icon2.png';
import icone09 from '../assets/icon9.png';
import icone10 from '../assets/icon10.png';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

function Inicio() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [temNotificacaoImportante, setTemNotificacaoImportante] = useState(false);

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
        <div className='card-projeto' style={containerStyle}>
            <header style={headerStyle}>
                <h1 style={titleStyle}>Bem-vindo!</h1>
                <p style={subtitleStyle}>{dataFormatada}</p>
            </header>

            <h2 style={menuTitleStyle}>Menu Principal</h2>
            
            <div style={menuContainerStyle}>
                <button
                    className='button-padrao'
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
                    className='button-padrao'
                    style={buttonStyle}
                    onClick={() => navigate('/turmas')}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone01} alt="Ícone Turmas" style={iconStyle} />
                    </div>
                    <span style={buttonTextStyle}>Gerenciar Turmas Registradas</span>
                </button>

                <button
                    className='button-padrao'
                    style={buttonStyle}
                    onClick={() => navigate('/metricas')}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                >
                    <div style={iconContainerStyle}>
                        <img src={icone09} alt="Ícone Métricas" style={iconStyle} />
                    </div>
                    <span style={buttonTextStyle}>Consultar Métricas de Frequência</span>
                </button>

                <button
                    className='button-padrao'
                    style={{
                        ...buttonNotificacaoStyle,
                        // Gatilho: Se for importante, aplica uma borda ou fundo mais chamativo
                        border: temNotificacaoImportante ? '3px solid #ef4444' : '1px solid #f59e0b',
                        backgroundColor: temNotificacaoImportante ? '#fef2f2' : '#fffbeb',
                        height: temNotificacaoImportante ? '100px' : '80px'
                    }}
                    onClick={() => navigate('/notificacoes')} // Ajuste a rota se necessário
                    onMouseEnter={(e) => handleHoverNotificacao(e, true, temNotificacaoImportante)}
                    onMouseLeave={(e) => handleHoverNotificacao(e, false, temNotificacaoImportante)}
                >
                    <div style={iconContainerStyle}>
                        {/* Ícone de Notificação */}
                        <img src={icone10} alt="Ícone Notificações" style={iconStyle} />
                        
                        {/* Badge Visual (Bolinha) que aparece se houver notificação */}
                        {temNotificacaoImportante && <span style={badgeStyle} />}
                    </div>
                    
                    <span style={{
                        ...buttonTextStyle,
                        color: temNotificacaoImportante ? '#991b1b' : '#92400e'
                    }}>
                        Alertas
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
    backgroundColor: '#e0f2fe', // Um azul claro mais suave e moderno
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
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)'
};

const iconStyle = {
    width: '28px',
    height: '28px',
    objectFit: 'contain'
};

const buttonTextStyle = {
    color: '#0369a1', // Azul escuro para excelente contraste e legibilidade
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
    position: 'relative' // Necessário para posicionar o badge de forma absoluta se preferir, ou controlar o container
};

const badgeStyle = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '12px',
    height: '12px',
    backgroundColor: '#ef4444', // Vermelho vivo
    borderRadius: '50%',
    border: '2px solid #ffffff', // Separa o badge do ícone para ficar limpo
};

export default Inicio;