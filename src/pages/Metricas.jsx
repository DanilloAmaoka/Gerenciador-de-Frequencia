import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

import icone08 from '../assets/icon8.png';

function Metricas() {
    const { dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaFaltas') || "");
    localStorage.setItem('turmaAtivaTurmas', turmaAtiva);
    
    const [alunos, setAlunos] = useState([]); 
    const [carregando, setCarregando] = useState(false);
    const [dataChamada, setDataChamada] = useState(new Date().toISOString().substring(0, 7)); // Formato: AAAA-MM
    
    // --- NOVOS ESTADOS PARA AS OPÇÕES DE ANÁLISE ---
    const [modoAnalise, setModoAnalise] = useState("mes"); // "mes" | "media" | "periodo" | "data-especifica"
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    
    // NOVO ESTADO: Guarda a data específica selecionada (padrão: hoje no formato AAAA-MM-DD)
    const [dataEspecifica, setDataEspecifica] = useState(new Date().toISOString().substring(0, 10));
    
    const [totalDiasLetivos, setTotalDiasLetivos] = useState(0); // Conta quantos dias de aula existiram no filtro

    const [alunoSelecionado, setAlunoSelecionado] = useState(null);

    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

    const formatarNovaData = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    useEffect(() => {
        const buscarMetricasFaltas = async () => {
            if (!turmaAtiva) return;
            
            setCarregando(true);
            try {
                // 1. Busca a turma para pegar o ID longo e os nomes dos alunos
                const turmasRef = collection(db, "turmas");
                const q = query(turmasRef, where("nome", "==", turmaAtiva));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const turmaDocSnap = querySnapshot.docs[0];
                    const idTurma = turmaDocSnap.id;
                    const dadosTurma = turmaDocSnap.data();
                    const listaNomesAlunos = dadosTurma.alunos || [];

                    // 2. Busca todas as chamadas da subcoleção daquela turma
                    const chamadasRef = collection(db, "turmas", idTurma, "chamadas");
                    const chamadasSnapshot = await getDocs(chamadasRef);

                    // 3. Prepara o mapa contador de faltas zerado para cada aluno
                    const contadorFaltas = {};
                    listaNomesAlunos.forEach(nome => {
                        contadorFaltas[nome] = 0;
                    });

                    let diasContados = 0;

                    // 4. Varre os documentos de chamadas aplicando o filtro escolhido
                    chamadasSnapshot.forEach(docSnap => {
                        const dadosChamada = docSnap.data();
                        const dataDoc = dadosChamada.data; // Formato: AAAA-MM-DD
                        const faltasDoDia = dadosChamada.faltas || [];

                        let correspondeAoFiltro = false;

                        if (modoAnalise === "mes") {
                            if (dataDoc && dataDoc.startsWith(dataChamada)) {
                                correspondeAoFiltro = true;
                            }
                        } else if (modoAnalise === "media") {
                            // Filtra se a data do documento começar com o ano letivo selecionado (ex: "2026")
                            if (dataDoc && dataDoc.startsWith(anoSelecionado)) {
                                correspondeAoFiltro = true;
                            }
                        } else if (modoAnalise === "periodo") {
                            if (dataDoc && dataInicio && dataFim) {
                                correspondeAoFiltro = dataDoc >= dataInicio && dataDoc <= dataFim;
                            }
                        }

                        if (correspondeAoFiltro) {
                            diasContados += 1; // Soma mais um dia letivo válido encontrado
                            faltasDoDia.forEach(nomeAluno => {
                                if (contadorFaltas[nomeAluno] !== undefined) {
                                    contadorFaltas[nomeAluno] += 1;
                                }
                            });
                        }
                    });

                    setTotalDiasLetivos(diasContados);

                    // 5. Estrutura o array final de alunos com o total de faltas calculado
                    const alunosEstruturados = listaNomesAlunos.map(nome => {
                        return {
                            nome: nome,
                            quantidadeFaltas: contadorFaltas[nome]
                        };
                    });

                    // 6. Ordena o ranking: quem tem mais faltas vai para o topo
                    alunosEstruturados.sort((a, b) => b.quantidadeFaltas - a.quantidadeFaltas);
                    
                    setAlunos(alunosEstruturados);
                } // <--- Chave do "if (!querySnapshot.empty)" corrigida aqui!
                
            } catch (error) {
                console.error("Erro ao buscar dados do banco:", error);
            } finally {
                setCarregando(false);
            }
        };

        buscarMetricasFaltas();
    }, [turmaAtiva, dataChamada, modoAnalise, dataInicio, dataFim, anoSelecionado]); // Adicionado dataEspecifica nas dependências

    return (
        <div style={style.containerPrincipal}>
            <div style={{display: 'flex', flexDirection: 'row', gap: '15px'}}>
                <button className='button-padrao' style={style.buttonVoltar} onClick={()=> navigate(-1)}>
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                </button>
                <h1>Métricas</h1>
            </div>
            <hr />
            <div style={{display: 'flex', flexDirection: 'row', height: '630px', width: '100%', gap: '10px'}}>
                
                {/* LISTA DE TURMAS */}
                <div style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '5px'}}>
                    <h2>Turmas</h2>
                    <div style={style.containerTurmas}>
                        {["1° Ano A", "1° Ano B", "1° Ano C", "2° Ano A", "2° Ano B", "2° Ano C", "2° Ano D", "3° Ano A", "3° Ano B", "3° Ano C"].map((turma) => (
                            <button 
                                key={turma}
                                style={{backgroundColor: turmaAtiva === turma ? "#e0d6ff" : "#fff", padding: turmaAtiva === turma ? "25px" : "15px"}} 
                                className='button-turma'
                                onClick={() => setTurmaAtiva(turma)}
                            >
                                <p style={{fontSize: '23px'}}><strong>{turma}</strong></p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* LISTA DE ALUNOS COM PREENCHIMENTO BASEADO NAS OPÇÕES */}
                <div style={{display: 'flex', flexDirection: 'column', width: '700px', gap: '5px'}}>
                    <h2>Alunos</h2>
                    <div style={style.containerConteudoTurmas}>
                        {turmaAtiva ? (
                            <>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <h4>Exibindo: {turmaAtiva}</h4>
                                    <span style={{fontSize:'14px', color:'#666', fontWeight:'600'}}>
                                        Dias letivos no filtro: {totalDiasLetivos}
                                    </span>
                                </div>
                                {carregando ? (
                                    <p>Carregando lista...</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', overflowX: 'hidden', }}>
                                        {alunos.map((aluno, index) => {
                                            const faltasDoAluno = aluno.quantidadeFaltas || 0; 
                                            const totalFaltasTurma = alunos.reduce((acumulador, item) => acumulador + item.quantidadeFaltas, 0);
                                            const porcentagem = totalFaltasTurma > 0 ? (faltasDoAluno / totalFaltasTurma) * 100 : 0;

                                            let corPreenchimento = '#e8f5e9';
                                            if (faltasDoAluno > 0) {
                                                if (porcentagem < 25) corPreenchimento = '#e8f5e9';
                                                else if (porcentagem >= 25 && porcentagem <= 50) corPreenchimento = '#fff9c4';
                                                else corPreenchimento = '#ffebee';
                                            }

                                            const backgroundStyle = faltasDoAluno > 0
                                                ? `linear-gradient(to right, ${corPreenchimento} ${porcentagem}%, #ffffff ${porcentagem}%)`
                                                : '#ffffff';

                                            const estaSelecionado = alunoSelecionado?.nome === aluno.nome;

                                            return (
                                                <li
                                                    key={index}
                                                    className='button-padrao'
                                                    onClick={() => {
                                                        setAlunoSelecionado(estaSelecionado ? null : aluno);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '11px 16px',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                                        border: estaSelecionado ? '2px solid #1e3a8a' : '1px solid #e5e7eb',
                                                        background: backgroundStyle,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>
                                                        {index + 1}. {aluno.nome}
                                                    </span>

                                                    <span
                                                        style={{
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            color: faltasDoAluno > 0 ? (porcentagem > 50 ? '#d32f2f' : '#b7950b') : '#2e7d32',
                                                            backgroundColor: 'rgba(255,255,255,0.8)',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            border: '1px solid #e5e7eb'
                                                        }}
                                                    >
                                                        {faltasDoAluno} {faltasDoAluno === 1 ? 'falta' : 'faltas'}
                                                    </span>
                                                </li>
                                            );
                                        })}

                                        {alunos.length === 0 && (
                                            <p style={{ textAlign: 'left', color: '#666' }}>Nenhum aluno encontrado para esta análise.</p>
                                        )}
                                    </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
                    </div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '5px', marginTop: '5px', height: '250px', width: '700px', justifyContent: 'space-between'}}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '15px',
                            height: '100%', 
                            width: '400px',
                        }}>
                            <h3>Pesquisar:</h3>
                            <input type="text" placeholder="Nome e sobrenome exato do aluno" />
                            <button>Buscar</button>
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #ddd',
                            borderRadius: '15px',
                            height: '100%', 
                            width: '300px',
                        }}>
                            {alunoSelecionado ? (
                                <>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1e3a8a' }}>
                                        📌 {alunoSelecionado.nome}
                                    </h3>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#666', fontWeight: 'bold' }}>
                                        Datas das {alunoSelecionado.quantidadeFaltas} falta(s) no filtro:
                                    </p>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' , }}>
                                        {alunoSelecionado.datasFaltas && alunoSelecionado.datasFaltas.length > 0 ? (
                                            alunoSelecionado.datasFaltas.map((dataStr, idx) => (
                                                <span key={idx} style={{ fontSize: '16px', color: '#c0392b', fontWeight: '500', backgroundColor: '#fdf2f2', padding: '4px 8px', borderRadius: '6px', borderLeft: '3px solid #e74c3c' }}>
                                                    📅 {formatarNovaData(dataStr)}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '15px', color: '#27ae60', fontWeight: '500' }}>
                                                ✓ Nenhuma falta registrada.
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p style={{ margin: 'auto', textAlign: 'center', color: '#999', fontSize: '15px' }}>
                                    Clique em um aluno para ver as datas das faltas aqui.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                

                {/* PAINEL LATERAL DE OPÇÕES DE ANÁLISE ESTILIZADO */}
                <div style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '10px'}}>
                    <h2>Opções de Análise</h2>
                    <div style={style.containerOpcoes}>

                        {/* NOVO: Botão Opção 4: Data Específica */}
                        <button 
                            onClick={() => setModoAnalise("data-especifica")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "data-especifica" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "data-especifica" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📆 Analisar por Data
                        </button>

                        {modoAnalise === "data-especifica" && (
                            <div style={{...style.boxConfigInternoInput, display:'flex', flexDirection:'column', gap:'4px'}}>
                                <label style={{fontSize:'13px', fontWeight:'bold', color:'#555'}}>Selecione o dia:</label>
                                <input 
                                    type="date" 
                                    value={dataEspecifica} 
                                    onChange={(e) => setDataEspecifica(e.target.value)} 
                                    style={style.inputDataPeriodoFiltro}
                                />
                            </div>
                        )}

                        
                        {/* Botão Opção 1: Mês Específico */}
                        <button 
                            onClick={() => setModoAnalise("mes")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "mes" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "mes" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📊 Histórico Mensal
                        </button>

                        {modoAnalise === "mes" && (
                            <div style={style.boxConfigInternoInput}>
                                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }} className='button-padrao'>
                                    <input 
                                        type="month" 
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
                                    <div style={{ ...style.visualizadorDataEstilizado, border: '1px solid #d1d5db', color: '#374151', fontSize: '15px', fontWeight: '500', fontFamily: 'inherit', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {(() => {
                                            if (!dataChamada) return "Selecione o mês";
                                            const [ano, mes] = dataChamada.split('-');
                                            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                            return `${meses[parseInt(mes, 10) - 1]} / ${ano}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botão Opção 2: Média Total Histórica */}
                        <button 
                            onClick={() => setModoAnalise("media")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "media" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "media" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📊 Histórico Anual
                        </button>

                        {modoAnalise === "media" && (
                            <div style={style.boxConfigInternoInput}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Escolha o Ano Letivo:</label>
                                    <select
                                        value={anoSelecionado}
                                        onChange={(e) => setAnoSelecionado(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            border: '1px solid #ccc',
                                            fontSize: '14px',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Botão Opção 3: Entre Datas */}
                        <button 
                            onClick={() => setModoAnalise("periodo")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "periodo" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "periodo" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📆 Intervalo de Período
                        </button>

                        {modoAnalise === "periodo" && (
                            <div style={{...style.boxConfigInternoInput, display:'flex', flexDirection:'column', gap:'8px'}}>
                                <label style={{fontSize:'13px', fontWeight:'bold', color:'#555'}}>De:</label>
                                <input 
                                    type="date" 
                                    value={dataInicio} 
                                    onChange={(e) => setDataInicio(e.target.value)} 
                                    style={style.inputDataPeriodoFiltro}
                                />
                                <label style={{fontSize:'13px', fontWeight:'bold', color:'#555'}}>Até:</label>
                                <input 
                                    type="date" 
                                    value={dataFim} 
                                    onChange={(e) => setDataFim(e.target.value)} 
                                    style={style.inputDataPeriodoFiltro}
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const style = {
    // Mantive os seus mesmos estilos sem nenhuma alteração estrutural
    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '1300px',
        height: '700px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '4px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    containerTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '592px', 
        width: '100%',
        gap: '8px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden'
    },
    containerOpcoes: {
        display: 'flex',
        flexDirection: 'column', 
        height: '592px', 
        width: '100%',
        gap: '8px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: '10px'
    },
    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '331px', 
        width: '100%', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
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
    btnFiltroOpcao: {
        width: '100%',
        padding: '14px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#2c3e50',
        border: '1px solid #dcdde1',
        borderRadius: '10px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    boxConfigInternoInput: {
        backgroundColor: '#fff',
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid #e1e8ed',
        marginTop: '-4px',
        marginBottom: '4px',
        position: 'relative', 
        zIndex: 1
    },
    inputOcultoData: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
        zIndex: 2
    },
    visualizadorDataEstilizado: {
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        color: '#333',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'center'
    },
    inputDataPeriodoFiltro: {
        width: '100%',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        fontSize: '14px',
        boxSizing: 'border-box'
    }
};

export default Metricas;