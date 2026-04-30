import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState } from 'react';
import ConteudoAdicional from '../components/ConteudoAdicional';
import { useEffect } from 'react';

function Turmas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [conteudoTurma, setconteudoTurma] = useState(false);
    const [conteudoTurma, setconteudoTurma] = useState("")
    
    useEffect(() => {
        if (conteudoTurma === "1-A") {

        }

    }, [conteudoTurma])

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '500px', width: '900px', gap: '5px'}}>
            <div style={{display: 'flex', flexDirection: 'row', height: '490px', width: '890px', gap: '5px'}}>
                <div style={style.containerTurmas}>
                    <h2>Turmas</h2>
                    <button style={style.turmaButton} className='button-padrao'
                        onClick={() => setconteudoTurma("1-A")}
                    >
                        <p style={{fontSize: '18px'}}><strong>1° Ano A</strong></p>
                    </button>
                    <button style={style.turmaButton} className='button-padrao'>
                        <p style={{fontSize: '18px'}}><strong>1° Ano B</strong></p>
                    </button>
                </div>
                <div style={style.containerConteudoTurmas}>
                    <h1>Alunos</h1>
                </div>
            </div>
            <button 
                style={button_voltarStyle}
                className='button-padrao'
                onClick={() => navigate('/inicio')}
                >Voltar</button>
        </div>
    );
}

const style = {
    containerTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '100%', 
        width: '200px', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px'
    },

    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '100%', 
        width: '600px', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px'
    },

    turmaButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#fff',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'row',
        gap: '10px'
    }
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