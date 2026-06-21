import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect, useRef } from 'react';

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
    const [modoAnalise, setModoAnalise] = useState("mes"); // "mes" | "media" | "periodo" | "data-especifica" | "semana"
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    
    // NOVO ESTADO: Guarda a data específica selecionada (padrão: hoje no formato AAAA-MM-DD)
    const [dataEspecifica, setDataEspecifica] = useState(new Date().toISOString().substring(0, 10));
    
    // NOVO ESTADO: Guarda o dia de referência para o cálculo da semana (segunda a sexta)
    const [semanaReferencia, setSemanaReferencia] = useState(new Date().toISOString().substring(0, 10));
    
    const [totalDiasLetivos, setTotalDiasLetivos] = useState(0); // Conta quantos dias de aula existiram no filtro

    const [alunoSelecionado, setAlunoSelecionado] = useState(null);

    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

    // --- ESTADOS PARA A PESQUISA ---
    const [termoPesquisa, setTermoPesquisa] = useState("");
    const [pesquisaCarregando, setPesquisaCarregando] = useState(false);
    
    // Modificado para guardar um objeto com o texto e o tipo ('sucesso' ou 'erro')
    const [statusPesquisa, setStatusPesquisa] = useState({ texto: "", tipo: "" }); 
    
    // --- ESTADOS PARA DETALHES INDIVIDUAIS DO ALUNO ---
    const [verTodasAsFaltas, setVerTodasAsFaltas] = useState(false);
    const [historicoCompletoAluno, setHistoricoCompletoAluno] = useState([]);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);

    // Ref para selecionar o aluno na lista assim que a turma terminar de carregar
    const nomeAlunoPendenteRef = useRef(null);

    const formatarNovaData = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // Função que busca o histórico de faltas completo (sem filtros) de um aluno específico
    const buscarHistoricoCompleto = async (nomeAluno) => {
        if (!turmaAtiva || !nomeAluno) return;
        setCarregandoHistorico(true);
        try {
            const turmasRef = collection(db, "turmas");
            const q = query(turmasRef, where("nome", "==", turmaAtiva));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const idTurma = querySnapshot.docs[0].id;
                const chamadasRef = collection(db, "turmas", idTurma, "chamadas");
                const chamadasSnapshot = await getDocs(chamadasRef);

                let todasAsDatas = [];
                chamadasSnapshot.forEach(docSnap => {
                    const dadosChamada = docSnap.data();
                    const dataDoc = dadosChamada.data;
                    const faltasDoDia = dadosChamada.faltas || [];

                    if (faltasDoDia.includes(nomeAluno) && dataDoc) {
                        todasAsDatas.push(dataDoc);
                    }
                });
                setHistoricoCompletoAluno(todasAsDatas.sort());
            }
        } catch (error) {
            console.error("Erro ao buscar histórico completo:", error);
        } finally {
            setCarregandoHistorico(false);
        }
    };

    // Reseta o modo de visualização detalhada ao trocar de aluno ou desmarcar
    useEffect(() => {
        setVerTodasAsFaltas(false);
        setHistoricoCompletoAluno([]);
    }, [alunoSelecionado?.nome]);

    // Dispara a busca completa caso o usuário clique no botão discreto de "Ver Tudo"
    useEffect(() => {
        if (verTodasAsFaltas && alunoSelecionado) {
            buscarHistoricoCompleto(alunoSelecionado.nome);
        }
    }, [verTodasAsFaltas]);

    // Função que lida com a busca global do aluno
    const lidarComPesquisa = async (e) => {
        e.preventDefault();
        if (!termoPesquisa.trim()) return;

        setPesquisaCarregando(true);
        setStatusPesquisa({ texto: "", tipo: "" }); // Limpa o status anterior
        
        try {
            const turmasRef = collection(db, "turmas");
            const querySnapshot = await getDocs(turmasRef);
            
            let alunoEncontrado = false;
            let nomeTurmaEncontrada = "";
            let nomeExatoAluno = "";

            // Varre todas as turmas do banco procurando o termo digitado no array de alunos
            querySnapshot.forEach((doc) => {
                const dados = doc.data();
                const listaAlunos = dados.alunos || [];
                
                // Procura insensível a maiúsculas/minúsculas para facilitar a busca
                const correspondencia = listaAlunos.find(
                    (nome) => nome.toLowerCase().trim() === termoPesquisa.toLowerCase().trim()
                );

                if (correspondencia) {
                    alunoEncontrado = true;
                    nomeTurmaEncontrada = dados.nome;
                    nomeExatoAluno = correspondencia;
                }
            });

            if (alunoEncontrado) {
                // Seta a mensagem de sucesso dinâmica
                setStatusPesquisa({ 
                    texto: `✅ Aluno encontrado na turma ${nomeTurmaEncontrada}!`, 
                    tipo: "sucesso" 
                });

                // Guarda o nome exato para o useEffect selecioná-lo logo após carregar a turma
                nomeAlunoPendenteRef.current = nomeExatoAluno;
                setTurmaAtiva(nomeTurmaEncontrada);

                // Limpa o texto de sucesso após 3 segundos para manter o visual limpo
                setTimeout(() => {
                    setStatusPesquisa({ texto: "", tipo: "" });
                }, 3000);

            } else {
                // Seta a mensagem de erro dinâmica
                setStatusPesquisa({ 
                    texto: "⚠️ Aluno não encontrado. Verifique a grafia exata.", 
                    tipo: "erro" 
                });
            }
        } catch (error) {
            console.error("Erro ao pesquisar aluno:", error);
            setStatusPesquisa({ 
                texto: "❌ Ocorreu um erro ao buscar. Tente novamente.", 
                tipo: "erro" 
            });
        } finally {
            setPesquisaCarregando(false);
        }
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

                    // 3. Prepara o mapa contendo as datas de falta detalhadas de cada aluno
                    const registroDatasFaltas = {};
                    listaNomesAlunos.forEach(nome => {
                        registroDatasFaltas[nome] = [];
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
                            if (dataDoc && dataDoc.startsWith(anoSelecionado)) {
                                correspondeAoFiltro = true;
                            }
                        } else if (modoAnalise === "periodo") {
                            if (dataDoc && dataInicio && dataFim) {
                                correspondeAoFiltro = dataDoc >= dataInicio && dataDoc <= dataFim;
                            }
                        } else if (modoAnalise === "data-especifica") {
                            if (dataDoc && dataEspecifica && dataDoc === dataEspecifica) {
                                correspondeAoFiltro = true;
                            }
                        } else if (modoAnalise === "semana") {
                            if (dataDoc && semanaReferencia) {
                                const dataRef = new Date(semanaReferencia + "T12:00:00");
                                const diaDaSemana = dataRef.getDay();
                                
                                // Se for Domingo (0), recua para a segunda anterior (-6). Caso contrário, calcula a distância para a Segunda (1)
                                const distanciaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
                                const segunda = new Date(dataRef);
                                segunda.setDate(dataRef.getDate() + distanciaParaSegunda);
                                
                                // Sexta-feira = Segunda + 4 dias
                                const sexta = new Date(segunda);
                                sexta.setDate(segunda.getDate() + 4);
                                
                                const inicioSemana = segunda.toISOString().substring(0, 10);
                                const fimSemana = sexta.toISOString().substring(0, 10);
                                
                                correspondeAoFiltro = dataDoc >= inicioSemana && dataDoc <= fimSemana;
                            }
                        }

                        if (correspondeAoFiltro) {
                            diasContados += 1; 
                            faltasDoDia.forEach(nomeAluno => {
                                if (registroDatasFaltas[nomeAluno] !== undefined) {
                                    registroDatasFaltas[nomeAluno].push(dataDoc);
                                }
                            });
                        }
                    });

                    setTotalDiasLetivos(diasContados);

                    // 5. Estrutura o array final de alunos com o total de faltas e datas ordenadas
                    const alunosEstruturados = listaNomesAlunos.map(nome => {
                        const datasOrdenadas = registroDatasFaltas[nome].sort();
                        return {
                            nome: nome,
                            quantidadeFaltas: datasOrdenadas.length,
                            datasFaltas: datasOrdenadas
                        };
                    });

                    // 6. Ranking
                    alunosEstruturados.sort((a, b) => b.quantidadeFaltas - a.quantidadeFaltas);
                    
                    setAlunos(alunosEstruturados);

                    if (nomeAlunoPendenteRef.current) {
                        const encontrarAluno = alunosEstruturados.find(a => a.nome === nomeAlunoPendenteRef.current);
                        if (encontrarAluno) {
                            setAlunoSelecionado(encontrarAluno);
                        }
                        nomeAlunoPendenteRef.current = null; 
                    } else if (alunoSelecionado) {
                        // Sincroniza o aluno selecionado se a lista sofrer atualizações estruturais
                        const recarregarSelecionado = alunosEstruturados.find(a => a.nome === alunoSelecionado.nome);
                        if (recarregarSelecionado) {
                            setAlunoSelecionado(recarregarSelecionado);
                        }
                    } else {
                        setAlunoSelecionado(null); 
                    }
                } 
                
            } catch (error) {
                console.error("Erro ao buscar dados do banco:", error);
            } finally {
                setCarregando(false);
            }
        };

        buscarMetricasFaltas();
    }, [turmaAtiva, dataChamada, modoAnalise, dataInicio, dataFim, anoSelecionado, dataEspecifica, semanaReferencia]);

    // Define qual lista de dados o painelzinho lateral de detalhes vai ler
    const datasExibidasNoBloco = verTodasAsFaltas ? historicoCompletoAluno : (alunoSelecionado?.datasFaltas || []);

    return (
        <div style={style.containerPrincipal}>
            <div style={{display: 'flex', flexDirection: 'row', gap: '15px'}}>
                <button className='button-padrao' style={style.buttonVoltar} onClick={()=> navigate(-1)}>
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }}/>
                </button>
                <h1>Métricas de Frequência</h1>
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

                {/* LISTA DE ALUNOS */}
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
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', overflowX: 'hidden'}}>
                                        {alunos.map((aluno, index) => {
                                            const faltasDoAluno = aluno.quantidadeFaltas || 0; 
                                            const totalFaltasTurma = alunos.reduce((acumulador, item) => acumulador + item.quantidadeFaltas, 0);
                                            const porcentagem = totalFaltasTurma > 0 ? (faltasDoAluno / totalFaltasTurma) * 100 : 0;

                                            let corPreenchimento = '#e8f5e9';
                                            let backgroundStyle = '#ffffff';

                                            if (modoAnalise === "data-especifica") {
                                                if (faltasDoAluno > 0) {
                                                    corPreenchimento = '#ffebee';
                                                    backgroundStyle = '#ffebee';
                                                }
                                            } else {
                                                if (faltasDoAluno > 0) {
                                                    if (porcentagem < 25) corPreenchimento = '#e8f5e9';
                                                    else if (porcentagem >= 25 && porcentagem <= 50) corPreenchimento = '#fff9c4';
                                                    else corPreenchimento = '#ffebee';
                                                }
                                                backgroundStyle = faltasDoAluno > 0
                                                    ? `linear-gradient(to right, ${corPreenchimento} ${porcentagem}%, #ffffff ${porcentagem}%)`
                                                    : '#ffffff';
                                            }

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
                                                            color: modoAnalise === "data-especifica"
                                                                ? (faltasDoAluno > 0 ? '#d32f2f' : '#2e7d32')
                                                                : (faltasDoAluno > 0 ? (porcentagem > 50 ? '#d32f2f' : '#b7950b') : '#2e7d32'),
                                                            backgroundColor: 'rgba(255,255,255,0.8)',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            border: '1px solid #e5e7eb'
                                                        }}
                                                    >
                                                        {modoAnalise === "data-especifica" 
                                                            ? (faltasDoAluno > 0 ? 'Faltou' : 'Presente')
                                                            : `${faltasDoAluno} ${faltasDoAluno === 1 ? 'falta' : 'faltas'}`
                                                        }
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
                    
                    {/* SEÇÃO INFERIOR */}
                    <div style={{display: 'flex', flexDirection: 'row', gap: '5px', marginTop: '5px', height: '218px', width: '700px', justifyContent: 'space-between'}}>
                        <form onSubmit={lidarComPesquisa} style={style.containerPesquisa}>
                            <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>🔍 Pesquisar Aluno:</h3>
                            <input 
                                type="text" 
                                placeholder="Nome completo ou parte do nome" 
                                value={termoPesquisa}
                                onChange={(e) => {
                                    setTermoPesquisa(e.target.value);
                                    if(statusPesquisa.texto) setStatusPesquisa({ texto: "", tipo: "" });
                                }}
                                style={style.inputPesquisa}
                            />
                            <button 
                                type="submit" 
                                className='button-padrao' 
                                disabled={pesquisaCarregando}
                                style={{
                                    ...style.botaoPesquisa,
                                    backgroundColor: pesquisaCarregando ? '#bdc3c7' : '#1e3a8a'
                                }}
                            >
                                {pesquisaCarregando ? 'Buscando...' : 'Buscar Aluno'}
                            </button>

                            {statusPesquisa.texto && (
                                <p style={{
                                    ...style.textoStatusPesquisa,
                                    backgroundColor: statusPesquisa.tipo === "sucesso" ? "#e8f5e9" : "#fdf2f2",
                                    color: statusPesquisa.tipo === "sucesso" ? "#2e7d32" : "#c0392b",
                                    borderLeft: statusPesquisa.tipo === "sucesso" ? "4px solid #4caf50" : "4px solid #e74c3c"
                                }}>
                                    {statusPesquisa.texto}
                                </p>
                            )}
                        </form>

                        {/* BLOCO DE INFORMAÇÕES DO ALUNO SELECIONADO (CANTO INFERIOR DIREITO) */}
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
                                    <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                        📌 {alunoSelecionado.nome}
                                    </h3>
                                    
                                    {/* BOTÃO MOVIDO PARA BAIXO DO NOME - DISCRETO E NÃO ENCOBRE TEXTO */}
                                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#555', fontWeight: 'bold', width: '100%' }}>
                                        {verTodasAsFaltas ? `Total de faltas registradas: ${datasExibidasNoBloco.length}` : `Faltas no filtro atual: ${alunoSelecionado.quantidadeFaltas}`}
                                    </p>

                                    {/* BOTÃO DISCRETO ALINHADO À DIREITA */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px', width: '100%' }}>
                                        <button 
                                            type="button"
                                            onClick={() => setVerTodasAsFaltas(!verTodasAsFaltas)}
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                padding: '2px 0',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                color: verTodasAsFaltas ? '#c0392b' : '#1e3a8a',
                                                textDecoration: 'underline',
                                                transition: 'color 0.15s ease',
                                            }}
                                        >
                                            {verTodasAsFaltas ? "Voltar aos Filtros" : "Ver todo o histórico"}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', overflowX: 'hidden' }}>
                                        {carregandoHistorico ? (
                                            <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Carregando histórico...</span>
                                        ) : datasExibidasNoBloco.length > 0 ? (
                                            datasExibidasNoBloco.map((dataStr, idx) => (
                                                <span key={idx} style={{ fontSize: '15px', color: '#c0392b', fontWeight: '500', backgroundColor: '#fdf2f2', padding: '4px 8px', borderRadius: '6px', borderLeft: '3px solid #e74c3c' }}>
                                                    📅 {formatarNovaData(dataStr)}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '14px', color: '#27ae60', fontWeight: '500' }}>
                                                ✓ Nenhuma falta encontrada.
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p style={{ margin: 'auto', textAlign: 'center', color: '#999', fontSize: '15px' }}>
                                    Clique em um aluno ou faça uma pesquisa para ver as faltas aqui.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* PAINEL LATERAL DE OPÇÕES DE ANÁLISE */}
                <div style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '10px'}}>
                    <h2>Opções de Análise</h2>
                    <div style={style.containerOpcoes}>

                        {/* Botão Data Específica */}
                        <button 
                            onClick={() => setModoAnalise("data-especifica")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "data-especifica" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "data-especifica" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📅 Analisar por Data
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

                        {/* NOVO FILTRO SELECIONADO: Analisar Semanalmente */}
                        <button 
                            onClick={() => setModoAnalise("semana")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "semana" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "semana" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📅 Analisar Semanalmente
                        </button>

                        {modoAnalise === "semana" && (
                            <div style={{...style.boxConfigInternoInput, display:'flex', flexDirection:'column', gap:'4px'}}>
                                <label style={{fontSize:'15px', fontWeight:'bold', color:'#555'}}>Escolha qualquer dia da semana:</label>
                                <input 
                                    type="date" 
                                    value={semanaReferencia} 
                                    onChange={(e) => setSemanaReferencia(e.target.value)} 
                                    style={style.inputDataPeriodoFiltro}
                                />
                                <span style={{fontSize:'14px', color:'#777', marginTop:'2px'}}>
                                    O sistema filtrará de segunda a sexta-feira correspondente à data escolhida.
                                </span>
                            </div>
                        )}
                        
                        {/* Botão Mês Específico */}
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

                        {/* Botão Média Total Histórica */}
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

                        {/* Botão Entre Datas */}
                        <button 
                            onClick={() => setModoAnalise("periodo")}
                            style={{
                                ...style.btnFiltroOpcao,
                                borderLeft: modoAnalise === "periodo" ? "5px solid #1e3a8a" : "5px solid transparent",
                                backgroundColor: modoAnalise === "periodo" ? "#e0d6ff" : "#f8f9fa"
                            }}
                        >
                            📅 Intervalo de Período
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
    // Mantive os seus estilos originais intactos...
    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '1300px',
        height: '710px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '4px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    containerTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '630px', 
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
        height: '630px', 
        width: '100%',
        gap: '8px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
        overflowY: 'auto', 
        overflowX: 'hidden',
    },
    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '370px', 
        width: '100%', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
    },
    containerPesquisa: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #ddd',
        borderRadius: '15px',
        height: '100%', 
        width: '390px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
    },
    inputPesquisa: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '18px',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'inherit'
    },
    botaoPesquisa: {
        width: '100%',
        padding: '12px',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    textoStatusPesquisa: {
        margin: '5px 0 0 0',
        fontSize: '14px',
        fontWeight: '600',
        padding: '8px 12px',
        borderRadius: '8px',
        textAlign: 'center',
        transition: 'all 0.2s ease-in-out'
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