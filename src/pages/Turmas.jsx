import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';

function Turmas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();

    const turmas = [
    { id: 1, nome: '4° A', periodo: 'Manhã' },
    { id: 2, nome: '1º Ano Médio', periodo: 'Tarde' },
    { id: 3, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 4, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 5, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 6, nome: '2º Ano Médio', periodo: 'Noite' },
    { id: 7, nome: '2º Ano Médio', periodo: 'Noite' },
  ];

    return (
        <div className="card-projeto">
            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '10px'}}>
                <h1>Turmas |</h1>
                <h3>{turmas.length}</h3>
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
                style={buttonStyle}
                className='button-padrao'
                onClick={() => navigate('/criar-turma')}
                >Adicionar uma Nova Turma</button>
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
    height: '400px',
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
    backgroundColor: '#cbe0f9',
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
    backgroundColor: '#77b2f9',
    color: 'black',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
}

export default Turmas;