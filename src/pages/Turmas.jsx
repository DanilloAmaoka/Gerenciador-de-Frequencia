import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import { collection, getDocs, query, where, arrayRemove, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import icone04 from '../assets/icon4.png'
import icone05 from '../assets/icon5.png'
import icone06 from '../assets/icon6.png'
import icone08 from '../assets/icon8.png'

function Turmas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaFaltas') || "");
    localStorage.setItem('turmaAtivaTurmas', turmaAtiva);
    const [alunos, setAlunos] = useState([]); 
    const [carregando, setCarregando] = useState(false);
    const [novoAluno, setNovoAluno] = useState("");
    const [avisos, setAvisos] = useState(true)

    const deletarAluno = async (nomeAluno) => {
        if (!window.confirm(`Tem certeza que deseja remover ${nomeAluno}?`)) return;

        try {
            const turmasRef = collection(db, "turmas");
            const q = query(turmasRef, where("nome", "==", turmaAtiva));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const documentoTurma = querySnapshot.docs[0];
                const docRef = doc(db, "turmas", documentoTurma.id);

                await updateDoc(docRef, {
                    alunos: arrayRemove(nomeAluno)
                });
                setAlunos(prev => prev.filter(aluno => aluno !== nomeAluno));
                if (avisos === true) {window.alert(`${nomeAluno} removido do ${turmaAtiva} com sucesso!`)};
            }
        } catch (error) {
            console.error("Erro ao deletar aluno:", error);
            alert("Erro ao remover aluno.");
        }
    };

    const adicionarAluno = async () => {
        if (!novoAluno.trim()) {
            alert("Digite o nome do aluno!");
            return;
        }

        const nomeJaExiste = alunos.includes(novoAluno.trim());

        if (nomeJaExiste) {
            const confirmar = window.alert(
                `Já existe um aluno chamado "${novoAluno}".`
            );
            return
        }

        try {
            setCarregando(true);
            const turmasRef = collection(db, "turmas");
            const q = query(turmasRef, where("nome", "==", turmaAtiva));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const docRef = doc(db, "turmas", docId);

                // arrayUnion adiciona o item ao array sem duplicar se já existir
                await updateDoc(docRef, {
                    alunos: arrayUnion(novoAluno)
                });

                // Atualiza a lista na tela imediatamente
                setAlunos(prev => [...prev, novoAluno]);
                setNovoAluno("");
                if (avisos === true) {alert(`${novoAluno} adicionado com sucesso!`)};
            }
        } catch (error) {
            console.error("Erro ao adicionar:", error);
            alert("Erro ao adicionar aluno.");
        } finally {
            setCarregando(false);
        }
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
        <div style={style.containerPrincipal}>
            <div style={{display: 'flex', flexDirection: 'row', gap: '15px'}}>
                <button className='button-padrao' style={style.buttonVoltar}
                    onClick={()=> navigate(-1)}
                >
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                </button>
                <h1>Gerenciar Turmas</h1>
            </div>
            <hr></hr>
            <div style={{display: 'flex', flexDirection: 'row', height: '540px', width: '100%', gap: '2px'}}>
                <div style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '5px'}}>
                    <h2>Turmas</h2>
                    <div style={style.containerTurmas}>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano A" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano A" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano A")}
                        >
                            <p style={{fontSize: '23px'}}><strong>1° Ano A</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano B" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano B" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano B")}
                        >
                            <p style={{fontSize: '23px'}}><strong>1° Ano B</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "1° Ano C" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "1° Ano C" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("1° Ano C")}
                        >
                            <p style={{fontSize: '23px'}}><strong>1° Ano C</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano A" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano A" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano A")}
                        >
                            <p style={{fontSize: '23px'}}><strong>2° Ano A</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano B" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano B" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano B")}
                        >
                            <p style={{fontSize: '23px'}}><strong>2° Ano B</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano C" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano C" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano C")}
                        >
                            <p style={{fontSize: '23px'}}><strong>2° Ano C</strong></p>
                        </button>
                        <button 
                            style={{backgroundColor: turmaAtiva === "2° Ano D" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano D" ? "25px" : "15px"}} 
                            className='button-turma'
                            onClick={() => setTurmaAtiva("2° Ano D")}
                        >
                            <p style={{fontSize: '23px'}}><strong>2° Ano D</strong></p>
                        </button>

                    </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', width: '700px', gap: '5px'}}>
                    <div style={{display: 'flex', flexDirection: 'row', width: '700px', gap: '5px', alignItems: 'center', justifyContent: 'space-between'}}>
                        <h2>Alunos</h2>
                        <h3>{alunos.length === 0 ? "" : "Total: " + alunos.length}</h3>
                    </div>
                    
                    <div style={style.containerConteudoTurmas}>
                        {turmaAtiva ? (
                            <>
                                <h4>Exibindo: {turmaAtiva}</h4>
                                {carregando ? (
                                    <p>Carregando lista...</p>
                                ) : (
                                    <ul
                                        style={{
                                            listStyle: 'none',
                                            padding: 0,
                                            margin: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px',
                                        }}
                                        >
                                        {alunos.map((aluno, index) => (
                                            <li
                                                key={index}
                                                className='button-padrao'
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '11px 16px',
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                                }}
                                                >
                                                <span
                                                    style={{
                                                    fontSize: '18px',
                                                    fontWeight: '500'
                                                    }}
                                                >
                                                    {index + 1}. {aluno}
                                                </span>

                                                <button
                                                    onClick={() => deletarAluno(aluno)}
                                                    className='button-deletarAluno'
                                                    style={{
                                                    height: '40px',
                                                    width: '40px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer'
                                                    }}
                                                >
                                                    <img
                                                    src={icone04}
                                                    alt="Excluir"
                                                    style={{ width: '18px', height: '18px' }}
                                                    />
                                                </button>
                                            </li>
                                        ))}

                                        {alunos.length === 0 && (
                                            <p style={{ textAlign: 'left', color: '#666' }}>
                                            Nenhum aluno cadastrado.
                                            </p>
                                        )}
                                    </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
                    </div>
                    <h3 style={{marginTop: '15px'}}>Adicionar Aluno { turmaAtiva ? "no " + turmaAtiva : ''}</h3>
                    <div style={{ display: 'flex'}}>
                        <form style={{display: 'flex', flexDirection: 'row', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '8px' }}>
                            <input
                                disabled={!turmaAtiva || carregando} 
                                type="text"
                                placeholder="Nome do aluno a ser Adicionado"
                                value={novoAluno}
                                onChange={(e) => setNovoAluno(e.target.value)}
                                style={{
                                    flex: 1,
                                    width: '500px',
                                    padding: '10px',
                                    borderRadius: '10px 0px 0px 10px',
                                    border: 'none',
                                    fontSize: '15px',
                                }}
                            />
                        </form>
                        <button 
                            className='button-padrao' 
                            style={{...style.buttonAdicionarAluno, opacity: !turmaAtiva ? 0.5 : 1}}
                            onClick={adicionarAluno}
                            disabled={!turmaAtiva || carregando}
                        >
                            <img src={icone05} alt="Ícone" style={{ width: '15px', height: '15px' }}/>
                            <span style={{ fontSize: '14px' }}>Adicionar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
            
    );
}

const style = {
    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',

        width: '1000px',
        height: '610px',

        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '4px',

        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },

    containerTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '100%', 
        width: '100%',
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden'
    },

    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '550px', 
        width: '100%', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden',
    },

    itemAlunoStyle: {
        padding: '2px',
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

    buttonAdicionarAluno: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '5px',
        padding: '6px',
        borderRadius: '0px 20px 20px 0px',
        width: '240px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#1e3a8a',
        cursor: 'pointer',
        backgroundColor: 'rgba(207, 225, 247, 0.35)', 
        border: '1px solid rgba(147, 197, 253, 0.5)', 
        boxShadow: '0 4px 14px rgba(0, 110, 188, 0.08)', 
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }

}

export default Turmas;