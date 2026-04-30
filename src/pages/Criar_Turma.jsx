import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '../components/ConteudoAdicional';
import AreaAdicional from '../components/ConteudoAdicional';

function Criar_Turma() {
    const navigate = useNavigate();
    const [conteudoCriarNovoAnoLetivo, setconteudoCriarNovoAnoLetivo] = useState(false);

    return (
        <form style={{display: 'flex', flexDirection: 'column', height: 'auto', gap: '5px'}}>
            <h1 style={{ marginBottom: '12px' }}>Criar Turma</h1>
            <h4 style={{color: 'gray'}}>Obrigatório</h4>

            <h3>Selecione o Ano Letivo e a Série:</h3>
            <select style={style.select}>
            <option value='' disabled>...</option>
            <option value='' disabled>...</option>
            </select>
            <AreaAdicional visible={conteudoCriarNovoAnoLetivo}>
                <div style={{display: 'flex', flexDirection: 'column', height: '200px'}}>
                    <h4>Cadastrar Novo Ano/Série</h4>
                    <div style={{display: 'flex', flexDirection: 'row'}}>
                        <input required type="text" placeholder="Nome (Ex: 4º Ano B)" style={style.input} />
                        <button className='button-padrao' style={style.button_salvarNovaSerie} onClick={() => setMostrarCadastro(false)}>Salvar Cadastro</button>
                    </div>
                    
                </div>
            </AreaAdicional>
            <button className='button-padrao' type="button" style={style.button_criar }onClick={() => conteudoCriarNovoAnoLetivo ? setconteudoCriarNovoAnoLetivo(false) : setconteudoCriarNovoAnoLetivo(true)}>{conteudoCriarNovoAnoLetivo ? 'Fechar' : '+ Novo'}</button>
            <h3>Selecione o Período:</h3>
            <select style={style.select}>
                <option>Manhã</option>
                <option>Tarde</option>
            </select>

            <h3>Adicionar Alunos da Turma:</h3>
            <div style={style.containerAlunos}>

            </div>

            <button 
                style={style.button_voltarInicio}
                className='button-padrao'
                onClick={() => navigate('/turmas')}
                >Voltar
            </button>



        </form>
    );
}

const style = {
    input: {
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '14px'
    },

    select: {
        padding: '5px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '16px',
    },

    button_criar: {
        padding: '2px',
        border: '2px solid #cad9ff',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        color: 'black',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
    },

    button_salvarNovaSerie: {
        margin: '4px',
        padding: '8px',
        borderRadius: '8px',
         border: '2px solid #81ffa5',
        backgroundColor: '#ffffff',
        color: 'black',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
    },

    button_voltarInicio: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#cfe1f7',
        color: 'black',
        fontSize: '14px',
        fontWeight: '600',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out'
    },

    containerAlunos: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        padding: '20px',
        maxHeight: '290px',
        overflowY: 'auto',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
    }
};

export default Criar_Turma;