import { useNavigate } from 'react-router-dom';
import icone01 from '../assets/icon1.png'
import icone02 from '../assets/icon2.png'
import { getInfoData } from '../utils/data';

function Inicio() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    return (
        <div className='card-projeto' style={{display: 'flex', flexDirection: 'column', height: 'auto', gap: '5px', width: '500px'}}>
            <h1>Bem-vindo!</h1>
            <h3>Menu</h3>
            <button
                style={buttonStyle}
                className='button-padrao'>
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
    fontSize: '16px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
};


export default Inicio;