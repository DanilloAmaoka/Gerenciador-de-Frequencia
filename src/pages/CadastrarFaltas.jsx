import { data, useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, arrayRemove, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import icone08 from '../assets/icon8.png'

function CadastrarFaltas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [turmaAtiva, setTurmaAtiva] = useState(""); 
    const [alunos, setAlunos] = useState([]); 
    const [carregando, setCarregando] = useState(false);
    const [faltantes, setFaltantes] = useState([]);

    const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);

    const handleLimparSelecao = () => {
        setFaltantes([]);
    };

    const formatarNovaData = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // 2. Traduz o dia da semana da nova data escolhida
    const obterNovoDiaSemana = (dataISO) => {
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        // O 'T12:00:00' impede que o fuso horário mude o dia para ontem
        const data = new Date(dataISO + 'T12:00:00'); 
        return dias[data.getDay()];
    };


    const alternarFalta = (nomeAluno) => {
        setFaltantes(prev => 
            prev.includes(nomeAluno) 
                ? prev.filter(a => a !== nomeAluno)
                : [...prev, nomeAluno]
        );
    };
    
    useEffect(() => {
        const buscarAlunos = async () => {
            if (!turmaAtiva) return;
            
            setCarregando(true);
            try {
                const turmasRef = collection(db, "turmas");
                const q = query(turmasRef, where("nome", "==", turmaAtiva));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const dadosTurma = querySnapshot.docs[0].data();
                    setAlunos(dadosTurma.alunos || []);
                } else {
                    setAlunos([]);
                    console.log("Nenhuma turma encontrada!");
                }
            } catch (error) {
                console.error("Erro ao buscar alunos:", error);
            } finally {
                setCarregando(false);
            }
        };

        buscarAlunos();
    }, [turmaAtiva]);

    return (
        <div className='card-projeto' style={{display: 'flex', flexDirection: 'column', height: '560px', width: '890px', gap: '10px'}}>
            <div style={{display: 'flex', flexDirection: 'row', gap: '15px', alignContent: 'center', alignItems: 'center'}}>
                <button className='button-padrao' style={style.buttonVoltar}
                    onClick={()=> navigate(-1)}
                >
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                </button>
                <h1>Adicionar Faltas</h1>
            </div>
            <hr></hr>
            <div style={{display: 'flex', flexDirection: 'row', height: '490px', width: '97%', gap: '5px'}}>
                <div style={{display: 'flex', flexDirection: 'column', width: '100%', gap: '5px'}}>
                    <h2>Turmas</h2>
                    <div style={style.containerTurmas}>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano A" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano A" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano A")}
                        >
                            <p style={{fontSize: '18px'}}><strong>1° Ano A</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano B" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano B" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano B")}
                        >
                            <p style={{fontSize: '18px'}}><strong>1° Ano B</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano C" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano C" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano C")}
                        >
                            <p style={{fontSize: '18px'}}><strong>1° Ano C</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano A" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano A" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano A")}
                        >
                            <p style={{fontSize: '18px'}}><strong>2° Ano A</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano B" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano B" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano B")}
                        >
                            <p style={{fontSize: '18px'}}><strong>2° Ano B</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano C" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano C" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano C")}
                        >
                            <p style={{fontSize: '18px'}}><strong>2° Ano C</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano D" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano D" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano D")}
                        >
                            <p style={{fontSize: '18px'}}><strong>2° Ano D</strong></p>
                        </button>

                    </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', width: '100%', gap: '5px'}}>
                    <div style={{display: 'flex', flexDirection: 'row', width: '100%', gap: '5px', alignItems: 'center', justifyContent: 'space-between'}}>
                        <h2>Alunos</h2>
                        <div style={{ position: 'relative', display: 'inline-block' }} className='button-padrao'>
                            <input 
                                type="date" 
                                value={dataChamada}
                                onChange={(e) => setDataChamada(e.target.value)}
                                onClick={(e) => {
                                    try { e.target.showPicker(); } catch (err) { console.log(err); }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer',
                                    zIndex: 2
                                }}
                            />
                            <div 
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    fontFamily: 'inherit',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                📅 {dataChamada === new Date().toISOString().split('T')[0] ? dataFormatada : formatarNovaData(dataChamada)}
                            </div>
                        </div>
                    </div>
                    <div style={style.containerConteudoTurmas}>
                        {turmaAtiva ? (
                            <>
                                <h4>Exibindo: {turmaAtiva}</h4>
                                {carregando ? (
                                    <p>Carregando lista...</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, borderRadius: '8px' }}>
                                    {alunos.map((aluno, index) => {
                                        const estaFaltando = faltantes.includes(aluno);

                                        return (
                                            <li 
                                                key={index} 
                                                onClick={() => alternarFalta(aluno)}
                                                style={{
                                                    ...style.itemAlunoStyle, 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    backgroundColor: estaFaltando ? '#ffebee' : '#fff', 
                                                    borderLeft: estaFaltando ? '5px solid #ff5252' : '5px solid transparent', 
                                                    transition: 'all 0.2s'
                                                }} 
                                                className='button-padrao'
                                            >
                                                <span style={{ color: estaFaltando ? '#d32f2f' : 'black', fontWeight: estaFaltando ? 'bold' : 'normal' }}>
                                                    {index} - {aluno}
                                                </span>

                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    border: '2px solid',
                                                    borderColor: estaFaltando ? '#ff5252' : '#ccc',
                                                    backgroundColor: estaFaltando ? '#ff5252' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '12px'
                                                }}>
                                                    {estaFaltando ? '✕' : ''}
                                                </div>
                                            </li>
                                        );
                                    })}
                                    {alunos.length === 0 && 
                                        <button 
                                            onClick={() => navigate('/turmas')}
                                            style={style.buttonAdicionarAluno} 
                                            onMouseEnter={(e) => {e.currentTarget.style.color = '#0f36f95d';}} 
                                            onMouseLeave={(e) => {e.currentTarget.style.color = '#666';}}> 
                                                Nenhum aluno cadastrado. <strong style={{ textDecoration: 'underline' }}>Clique aqui para cadastrar</strong>
                                        </button>
                                    }
                                </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
                    </div>
                    <div style={style.alertaSalvar} className="animacao-subir">
                        <p style={{ margin: '0 0 15px 0', textAlign: 'left' }}>
                            Você marcou <strong>{faltantes.length}</strong> falta(s) no dia {
                                dataChamada === new Date().toISOString().split('T')[0] 
                                    ? dataFormatada 
                                    : formatarNovaData(dataChamada)
                            } (<strong>{
                                dataChamada === new Date().toISOString().split('T')[0] 
                                    ? diaSemana 
                                    : obterNovoDiaSemana(dataChamada)
                            }</strong>).
                        </p>

                        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-start' }}>
                            
                            <button 
                                className='button-padrao'
                                onClick={handleLimparSelecao}
                                disabled={faltantes.length === 0} 
                                style={{
                                    ...style.buttonConfirmar,
                                    flex: 1,
                                    backgroundColor: faltantes.length === 0 ? '#ccc' : '#757575',
                                    cursor: faltantes.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: faltantes.length === 0 ? 0.7 : 1,
                                    margin: 0
                                }}
                            >
                                Limpar
                            </button>

                            <button 
                                className='button-padrao' 
                                disabled={faltantes.length === 0} 
                                style={{
                                    ...style.buttonConfirmar,
                                    flex: 2,
                                    backgroundColor: faltantes.length === 0 ? '#ccc' : '#ff5252',
                                    cursor: faltantes.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: faltantes.length === 0 ? 0.7 : 1,
                                    margin: 0
                                }}
                            >
                                Confirmar Chamada de Hoje
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        </div>
            
    );
}

const style = {
    containerTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '445px', 
        width: '180px',
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px'
    },

    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '335px', 
        width: '670px', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden'
    },

    itemAlunoStyle: {
        padding: '12px',
        borderBottom: '1px solid #eee',
        fontSize: '16px',
        cursor: "default",
        borderRadius: '8px'
    },

    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '30px',
        height: '30px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 'none'
    },

    alertaSalvar: {
        padding: '15px', // Aumentei um pouquinho para dar mais respiro
        backgroundColor: '#fff3f3',
        border: '1px solid #ffcdd2',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // <--- Garante que tudo comece na esquerda!
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        width: '100%', // Garante que ele ocupe o espaço disponível para os botões esticarem
        boxSizing: 'border-box'
    },

    buttonConfirmar: {
        backgroundColor: '#ff5252',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold'
    },

    inputData: {
        appearance: 'none',
        WebkitAppearance: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: 'transparent',
        border: '1px solid #d1d5db', 
        color: '#374151',  
        transition: 'all 0.15s ease'
    },

    buttonAdicionarAluno: {
        background: 'none',
        border: 'none',
        padding: 0,
        color: '#666', // Um cinza discreto para o texto padrão
        fontSize: '14px',
        cursor: 'pointer',
        fontFamily: 'inherit', // Herda a fonte do restante do seu app
        transition: 'color 0.2s ease, transform 0.2s ease',
        display: 'inline-flex',
        gap: '4px'
    }
}

export default CadastrarFaltas;