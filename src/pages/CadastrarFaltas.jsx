import { data, useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, setDoc, query, where, arrayRemove, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import icone08 from '../assets/icon8.png'

function CadastrarFaltas() {
    const { diaSemana, dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [alunos, setAlunos] = useState([]); 
    const [carregando, setCarregando] = useState(false);
    const [faltantes, setFaltantes] = useState([]);
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaTurmas') || "");
    localStorage.setItem('turmaAtivaFaltas', turmaAtiva);
    const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);
    const [iniciarSalvar, setIniciarSalvar] = useState(0);

    const handleSalvarBanco = async () => {
        if (!turmaAtiva) return;

        try {
            const turmasRef = collection(db, "turmas");
            const q = query(turmasRef, where("nome", "==", turmaAtiva));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const idTurma = querySnapshot.docs[0].id;

                // 1. Criamos a referência exata de onde salvar:
                // turmas -> ID_da_Turma -> chamadas -> Data_Escolhida (ex: 2026-06-19)
                const chamadaDocRef = doc(db, "turmas", idTurma, "chamadas", dataChamada);

                // 2. Salvamos APENAS a lista de faltas
                // O { merge: true } garante que se o documento já existir, ele não apaga outros campos soltos
                await setDoc(chamadaDocRef, {
                    data: dataChamada,
                    diaDaSemana: dataChamada === new Date().toISOString().split('T')[0] ? dataFormatada : obterNovoDiaSemana(dataChamada),
                    faltas: faltantes // Salvando apenas quem faltou!
                }, { merge: true });

                alert("Faltas salvas com sucesso no histórico da turma!");
                
                // 3. Reseta os estados para voltar à tela inicial limpa
                setFaltantes([]);
                setIniciarSalvar(0);

            } else {
                alert("Aviso: Turma não encontrada.");
            }

        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
            alert("Erro ao salvar as faltas.");
        }
    };

    const handleLimparSelecao = () => {
        setFaltantes([]);
    };

    const handleConfirmarChamada = async () => {
        if (!turmaAtiva) return;
        setIniciarSalvar(1);
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
        iniciarSalvar === 0 ? (
            <div style={style.containerPrincipal}>
                <div style={{display: 'flex', flexDirection: 'row', gap: '15px', alignContent: 'center', alignItems: 'center'}}>
                    <button className='button-padrao' style={style.buttonVoltar}
                        onClick={()=> navigate(-1)}
                    >
                        <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                    </button>
                    <h1>Adicionar Faltas</h1>
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
                            <button 
                                style={{backgroundColor: turmaAtiva === "2° Ano E" ? "#e0d6ff" : "#fff", padding: turmaAtiva === "2° Ano E" ? "25px" : "15px"}} 
                                className='button-turma'
                                onClick={() => setTurmaAtiva("2° Ano E")}
                            >
                                <p style={{fontSize: '23px'}}><strong>2° Ano E</strong></p>
                            </button>

                        </div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', width: '900px', gap: '5px'}}>
                        <h2>Alunos</h2>
                        <div style={style.containerConteudoTurmas}>
                            {turmaAtiva ? (
                                <>
                                    <h4>Exibindo: {turmaAtiva}</h4>
                                    {carregando ? (
                                        <p>Carregando lista...</p>
                                    ) : (
                                        <ul style={{
                                            listStyle: 'none',
                                            padding: 0,
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
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
                                                            transition: 'all 0.2s',
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
                                            <button 
                                                onClick={() => navigate('/turmas')}
                                                style={style.buttonAdicionarAluno} 
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f3f4f6';
                                                    e.currentTarget.style.color = '#333';
                                                    e.currentTarget.style.borderColor = '#b8c0cc';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#fafafa';
                                                    e.currentTarget.style.color = '#666';
                                                    e.currentTarget.style.borderColor = '#d0d7de';
                                                }}>
                                                    + Cadastrar alunos nesta turma
                                            </button>
                                        </ul>
                                    )}
                                </>
                            ) : (
                                <p>Selecione uma turma para ver os alunos.</p>
                            )}
                        </div>
                    <div    style={style.abaSalvar}>
                            <p style={{ margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px' }}>
                                Você marcou <strong>{faltantes.length}</strong> falta(s).
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
                                        margin: 0,
                                        fontSize: '16px'
                                    }}
                                >
                                    Limpar Seleção
                                </button>

                                <button 
                                    className='button-padrao'
                                    onClick={handleConfirmarChamada}
                                    disabled={faltantes.length === 0}
                                    style={{
                                        ...style.buttonConfirmar,
                                        flex: 2,
                                        backgroundColor: faltantes.length === 0 ? '#ccc' : '#ff5252',
                                        cursor: faltantes.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: faltantes.length === 0 ? 0.7 : 1,
                                        margin: 0,
                                        fontSize: '16px'
                                    }}
                                >
                                    Confirmar Chamada de Hoje
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
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
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        width: '100%',
                        height: '100%',
                        padding: '20px',
                        border: '1px solid #ddd',
                        borderRadius: '15px',
                        backgroundColor: '#ffffff'
                    }}
                    >
                    <h2>Confirmar Chamada</h2>

                    <div
                        style={{
                            backgroundColor: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '12px',
                            border: '1px solid #e9ecef',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        <p  style={{
                                flexDirection: 'row',
                                gap: '10px',
                                fontSize: '18px',
                            }}>
                            <strong>Data:</strong> {
                            dataChamada === new Date().toISOString().split('T')[0]
                                ? dataFormatada
                                : formatarNovaData(dataChamada)
                            }
                            {" - "}
                            {
                            dataChamada === new Date().toISOString().split('T')[0]
                                ? diaSemana
                                : obterNovoDiaSemana(dataChamada)
                            }
                        </p>
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
                                    fontSize: '15px',
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
                    <h3>Lista de faltantes ({faltantes.length} {faltantes.length === 1 ? 'aluno' : 'alunos'})</h3>
                    <div style={{
                            ...style.containerConteudoTurmas,
                            width:'100%',
                            height: '250px'
                            }}>

                        {faltantes.length > 0 ? (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px'
                                }}
                            >
                                {faltantes.map((aluno, index) => (
                                <li
                                    key={index}
                                    style={{
                                        padding: '9px',
                                        borderRadius: '10px',
                                        backgroundColor: '#fff5f5',
                                        borderLeft: '5px solid #ff5252',
                                        fontSize: '17px'
                                    }}
                                >
                                    {index + 1}. {aluno}
                                </li>
                                ))}
                            </ul>
                            ) : (
                            <p>Nenhum aluno foi marcado como faltante.</p>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }}
                    >
                        <button
                            className="button-padrao"
                            onClick={() => setIniciarSalvar(0)}
                            style={{
                                ...style.buttonConfirmar_CancelarSalvamento,
                                backgroundColor: '#757575'
                            }}
                            >
                            Voltar
                        </button>

                        <button
                            className="button-padrao"
                            onClick={handleSalvarBanco}
                            style={{
                                ...style.buttonConfirmar_CancelarSalvamento,
                                backgroundColor: '#4caf50'
                            }}
                            >
                            Confirmar e Salvar
                        </button>
                    </div>
                    </div>
            </div>
        )  
    );
}

const style = {
    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',

        width: '1200px',
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
        height: '405px', 
        width: '100%', 
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
        fontSize: '19px',
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

    abaSalvar: {
        padding: '15px',
        backgroundColor: '#fff3f3',
        border: '1px solid #ffcdd2',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        width: '100%',
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
        marginTop: '12px',
        padding: '10px 14px',
        border: '1px dashed #d0d7de',
        borderRadius: '10px',
        background: '#fafafa',
        color: '#666',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
    },

    buttonConfirmar_CancelarSalvamento: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '35px'
    }
}

export default CadastrarFaltas;