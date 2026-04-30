import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '../components/ConteudoAdicional';
import AreaAdicional from '../components/ConteudoAdicional';

function Criar_Turma() {
    const navigate = useNavigate();
    const [conteudoCriarNovoAnoLetivo, setconteudoCriarNovoAnoLetivo] = useState(false);

    return (
        <form className="card-projeto">
            <h1 style={{ marginBottom: '12px' }}>Criar Turma</h1>
            <h4 style={{color: 'gray'}}>Obrigatório</h4>

            <h3>Ano Letivo e Série</h3>
            <select style={style.select}>
            <option>Selecione...</option>
            <option>7º Ano Alfa</option>
            </select>
            <AreaAdicional visible={conteudoCriarNovoAnoLetivo}>
                <h4>Cadastrar Novo Ano/Série</h4>
                <input type="text" placeholder="Nome (Ex: 4º Ano B)" style={style.input} />
                <button className='button-padrao' style={style.button_salvarNovaSerie} onClick={() => setMostrarCadastro(false)}>Salvar Cadastro</button>
            </AreaAdicional>
            <button className='button-padrao' type="button" style={style.button_criar }onClick={() => conteudoCriarNovoAnoLetivo ? setconteudoCriarNovoAnoLetivo(false) : setconteudoCriarNovoAnoLetivo(true)}>{conteudoCriarNovoAnoLetivo ? 'Fechar' : '+ Novo'}</button>
    
            

           
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
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#8bbbf6',
        color: 'black',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)',
    },

    button_salvarNovaSerie: {
        margin: '4px',
        padding: '8px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#b6f6ca',
        color: 'black',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)',
    }
};

export default Criar_Turma;