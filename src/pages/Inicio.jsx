import { useNavigate } from 'react-router-dom';
import icone01 from '../assets/icon1.png'
import icone02 from '../assets/icon2.png'
import icone09 from '../assets/icon9.png'
import { getInfoData } from '../utils/data';

function Inicio() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    return (
        <div className='card-projeto' style={{display: 'flex', flexDirection: 'column', height: 'auto', gap: '5px', width: '500px'}}>
            <h1>Bem-vindo!</h1>
            <h2>Menu</h2>
            <button
                style={buttonStyle}
                className='button-padrao'
                onClick={() => navigate('/cadastrarfaltas')}
                >
                <img src={icone02} alt="Ícone" style={{ width: '40px', height: '40px' }}/>
                <span style={{color: 'black'}}>Adicionar Faltas do Dia (<strong>{diaSemana}</strong>)</span>
            </button>
            <button
                style={buttonStyle}
                className='button-padrao'
                onClick={() => navigate('/turmas')}
                >
                <img src={icone01} alt="Ícone" style={{ width: '40px', height: '40px' }}/>
                <span>Gerenciar Turmas Registradas</span>
            </button>
            <button
                style={{...buttonStyle, fontSize: '23px'}}
                className='button-padrao'
                onClick={() => navigate('/turmas')}
                >
                <img src={icone09} alt="Ícone" style={{ width: '50px', height: '50px' }}/>
                <span>Consultar Métricas</span>
            </button>

        </div>
    );
}

const buttonStyle = {
    display: 'flex',     
    alignItems: 'center',
    justifyContent: 'left',
    gap: '12px',
    
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#cbe0f9',
    color: 'black',
    fontSize: '20px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
};


export default Inicio;