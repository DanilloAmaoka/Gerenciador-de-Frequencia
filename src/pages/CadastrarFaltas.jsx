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
            <div style={{display: 'flex', flexDirection: 'row', gap: '15px'}}>
                <button className='button-padrao' style={style.buttonVoltar}
                    onClick={()=> navigate(-1)}
                >
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                </button>
                <h1>Gerenciar Turmas</h1>
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
                    <h2>Alunos</h2>
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
                                    {alunos.length === 0 && <p>Nenhum aluno cadastrado.</p>}
                                </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
                    </div>
                    <div  style={style.alertaSalvar} className="animacao-subir">
                        <p>Você marcou <strong>{faltantes.length}</strong> falta(s).</p>
                        <button 
                            className='button-padrao' 
                            disabled={faltantes.length === 0} 
                            style={{
                                ...style.buttonConfirmar,
                                backgroundColor: faltantes.length === 0 ? '#ccc' : '#ff5252',
                                cursor: faltantes.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: faltantes.length === 0 ? 0.7 : 1
                            }}
                        >
                            Confirmar Chamada de Hoje
                        </button>
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
        height: '372px', 
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
        padding: '15px',
        backgroundColor: '#fff3f3',
        border: '1px solid #ffcdd2',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    },

    buttonConfirmar: {
        backgroundColor: '#ff5252',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
}

export default CadastrarFaltas;