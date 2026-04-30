import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { motion } from 'framer-motion';

function Turmas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    const turmas = [
    { id: 1, nome: '4° A', periodo: 'Manhã' },
    { id: 2, nome: '4° B', periodo: 'Tarde' },
    { id: 3, nome: '3° A', periodo: 'Noite' },
    { id: 4, nome: '3° B', periodo: 'Noite' },
    { id: 5, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 6, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 7, nome: '2º Ano Médio', periodo: 'Noite' },
  ];

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: 'auto', gap: '5px'}}>
            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '10px'}}>
                <h1>Turmas Registradas</h1>
            </div>
            <div style={containerListaStyle}>
                {turmas.length > 0 ? (
                    turmas.map((turma) => (
                        <button 
                            key={turma.id} 
                            style={turmaStyle}
                            className='button-turma'
                            >
                            <div style={{height: '30px', alignContent: 'center'}}>
                                <div style={{display: 'flex', flexDirection: "row"}}>
                                    <p style={{fontSize: '20px'}}><strong>{turma.nome}  |</strong></p>
                                    <p style={{ margin: 3.5, fontSize: '14px', color: '#666'}}> 
                                        {turma.periodo} 
                                    </p>
                                </div>   
                            </div>
                        </button>
                    ))
                ) : (
                <p>Nenhuma turma cadastrada.</p>
                )}
            </div>
            <button 
                style={button_voltarStyle}
                className='button-padrao'
                onClick={() => navigate('/inicio')}
                >Voltar</button>
        </div>
    );
}

const containerListaStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    padding: '20px',
    height: '500px',
    overflowY: 'auto',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #ddd'
}

const turmaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
}

const buttonStyle = {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: 'black',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
}

const button_voltarStyle = {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#cfe1f7',
    color: 'black',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
}

export default Turmas;