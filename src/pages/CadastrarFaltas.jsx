import { data, useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, arrayRemove, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import icone07 from '../assets/icon7.png'
import icone08 from '../assets/icon8.png'

function CadastrarFaltas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [turmaAtiva, setTurmaAtiva] = useState(""); 
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
        <div className='card-projeto' style={{display: 'flex', flexDirection: 'column', height: '560px', width: '890px', gap: '10px'}}>
            <div style={{display: 'flex', flexDirection: 'row', gap: '10px'}}>
                <button className='button-padrao' style={style.buttonVoltar}
                    onClick={()=> navigate(-1)}>
                    <img src={icone08} alt="Ícone" style={{ width: '35px', height: '35px' }}/>
                </button>
                <h1>Adicionar Faltas</h1>
            </div>
            <hr></hr>
            <div style={{display: 'flex', flexDirection: 'row', height: '490px', width: '97%', gap: '5px'}}>
                <div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
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
                                        {alunos.map((aluno, index) => (
                                            <li 
                                                key={index} 
                                                style={{
                                                    ...style.itemAlunoStyle, 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                }} 
                                                className='button-padrao'
                                            >
                                                <span>{index} - {aluno}</span>
                                            </li>
                                        ))}
                                        {alunos.length === 0 && <p>Nenhum aluno cadastrado.</p>}
                                    </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
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
        height: '440px', 
        width: '670px', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden'
    },

    itemAlunoStyle: {
        padding: '15px',
        borderBottom: '1px solid #eee',
        fontSize: '16px',
        cursor: "default",
        borderRadius: '8px'
    },

    buttonVoltar: {
        padding: '0px',
        borderRadius: '80px',
        backgroundColor: 'transparent',
        color: 'black',
        fontSize: '14px',
        fontWeight: '600',
        width: '40px',
        height: '40px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 'none',
    },
}

export default CadastrarFaltas;