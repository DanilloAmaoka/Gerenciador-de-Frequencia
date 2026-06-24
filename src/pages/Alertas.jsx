import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

import icone08 from '../assets/icon8.png';
import icone04 from '../assets/icon4.png';

function Alertas() {
    const navigate = useNavigate();
    
    // --- CONTROLE DE TELAS ---
    const [telaAtual, setTelaAtual] = useState("listagem"); 

    // --- BANCO DE DADOS (TURMAS, ALUNOS E OCORRÊNCIAS REAIS) ---
    const [listaTurmasBD, setListaTurmasBD] = useState([]); 
    const [mapaAlunosPorTurma, setMapaAlunosPorTurma] = useState({}); 
    const [carregandoDados, setCarregandoDados] = useState(false);
    const [alertasDisparados, setAlertasDisparados] = useState([]); // Guarda as ocorrências ativas do banco

    // Controle de qual regra está clicada/expandida para mostrar o causador
    const [alertaExpandido, setAlertaExpandido] = useState(null);

    // --- ESTADOS DA LISTAGEM (ALERTAS EXISTENTES) ---
    const [alertasCriados, setAlertasCriados] = useState([]);

    // --- ESTADOS DO FORMULÁRIO DE CRIAÇÃO ---
    const [tipoAlvo, setTipoAlvo] = useState("Turma"); 
    const [escopo, setEscopo] = useState("Todos"); 
    const [turmaSelecionada, setTurmaSelecionada] = useState(""); 
    const [alunoSelecionado, setAlunoSelecionado] = useState(""); 
    const [quantidadeFaltas, setQuantidadeFaltas] = useState("");
    const [tipoPeriodo, setTipoPeriodo] = useState("Mensal"); 

    // --- EFFECT 1: RESETAR CAMPOS AO ENTRAR NA TELA DE CRIAÇÃO ---
    useEffect(() => {
        if (telaAtual === "criacao") {
            setTipoAlvo("Turma");
            setEscopo("Todos");
            setTurmaSelecionada("");
            setAlunoSelecionado("");
            setQuantidadeFaltas("");
            setTipoPeriodo("Mensal");
        }
    }, [telaAtual]);

    // --- EFFECT 2: CARREGAR REGRAS, OCORRÊNCIAS, TURMAS E ALUNOS ---
    const carregarDadosIniciais = async () => {
        setCarregandoDados(true);
        try {
            // 1. Busca as Regras de Alerta Criadas
            const regrasSnapshot = await getDocs(collection(db, "config_alertas"));
            const regrasCarregadas = [];
            regrasSnapshot.forEach(docSnap => {
                regrasCarregadas.push({ id: docSnap.id, ...docSnap.data() });
            });
            setAlertasCriados(regrasCarregadas);

            // 2. Busca as Ocorrências Disparadas (Não lidas)
            const disparadosSnapshot = await getDocs(collection(db, "alertas_disparados"));
            const disparosCarregados = [];
            disparadosSnapshot.forEach(docSnap => {
                const dados = docSnap.data();
                if (dados.lido === false) {
                    disparosCarregados.push({ id: docSnap.id, ...dados });
                }
            });
            setAlertasDisparados(disparosCarregados);

            // 3. Busca as Turmas e Alunos para o formulário
            const turmasRef = collection(db, "turmas");
            const querySnapshot = await getDocs(turmasRef);
            const nomesTurmas = [];
            const vinculoAlunos = {};

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                if (dados.nome) {
                    nomesTurmas.push(dados.nome);
                    vinculoAlunos[dados.nome] = dados.alunos || [];
                }
            });

            nomesTurmas.sort();
            setListaTurmasBD(nomesTurmas);
            setMapaAlunosPorTurma(vinculoAlunos);

        } catch (error) {
            console.error("Erro ao carregar dados do banco:", error);
        } finally {
            setCarregandoDados(false);
        }
    };

    useEffect(() => {
        carregarDadosIniciais();
    }, [telaAtual]);

    // Limpa seleções internas se mudar o tipo ou escopo no meio do preenchimento
    useEffect(() => {
        setTurmaSelecionada("");
        setAlunoSelecionado("");
    }, [tipoAlvo, escopo]);

    // Limpa o aluno selecionado se a turma mudar
    useEffect(() => {
        setAlunoSelecionado("");
    }, [turmaSelecionada]);

    // --- MONTAGEM DA STRING DE TEXTO ---
    const gerarTextoLogica = () => {
        let quem = "";

        if (escopo === "Todos") {
            quem = tipoAlvo === "Aluno" ? "qualquer aluno" : "qualquer turma";
        } else {
            if (tipoAlvo === "Turma") {
                quem = `a turma ${turmaSelecionada || "___"}`;
            } else {
                quem = `o aluno ${alunoSelecionado || "___"} (${turmaSelecionada || "___"})`;
            }
        }
        
        const faltas = quantidadeFaltas || "X";
        const periodo = tipoPeriodo === "Seguidas" ? "seguidas" : tipoPeriodo === "Mensal" ? "mensais" : "anuais";

        return `Se ${quem} atingir ${faltas} faltas ${periodo}, gerar alerta.`;
    };

    // --- SALVAR LOGICA ---
    const salvarAlerta = async () => {
        if (!quantidadeFaltas) {
            alert("Insira a quantidade de faltas!");
            return;
        }
        if (escopo === "Especifico") {
            if (!turmaSelecionada) {
                alert("Selecione a turma!");
                return;
            }
            if (tipoAlvo === "Aluno" && !alunoSelecionado) {
                alert("Selecione o aluno!");
                return;
            }
        }

        try {
            const dadosAlerta = {
                texto: gerarTextoLogica(),
                tipoAlvo: tipoAlvo,       
                escopo: escopo,           
                turmaAlvo: escopo === "Especifico" ? turmaSelecionada : "Todas",
                alunoAlvo: escopo === "Especifico" && tipoAlvo === "Aluno" ? alunoSelecionado : "Todos",
                quantidadeFaltas: parseInt(quantidadeFaltas, 10),
                tipoPeriodo: tipoPeriodo, 
                ativo: true,              
                criadoEm: new Date().toISOString()
            };

            const alertasRef = collection(db, "config_alertas");
            const docRef = await addDoc(alertasRef, dadosAlerta);

            const novoAlertaLocal = {
                id: docRef.id,
                texto: dadosAlerta.texto,
                ativo: true 
            };

            setAlertasCriados([...alertasCriados, novoAlertaLocal]);
            setTelaAtual("listagem");
        } catch (error) {
            console.error("Erro ao salvar alerta no Firestore:", error);
            alert("Erro ao salvar o alerta no banco de dados.");
        }
    };

    // --- FUNÇÃO PARA MARCAR OCORRÊNCIA COMO LIDA ---
    const marcarOcorrenciaComoLida = async (idOcorrencia) => {
        try {
            // Apaga o alerta disparado direto do banco de dados de vez
            const docRef = doc(db, "alertas_disparados", idOcorrencia);
            await deleteDoc(docRef);
            
            // Remove da lista local para sumir da tela na hora
            setAlertasDisparados(prev => prev.filter(item => item.id !== idOcorrencia));
            setAlertaExpandido(null);
        } catch (err) {
            console.error("Erro ao deletar ocorrência:", err);
        }
    };

    return (
        <div 
            className={`card-projeto`} 
            style={{
                ...style.containerPrincipal, 
                height: telaAtual === "listagem" ? "610px" : "440px"
            }}
        >
            {/* CABEÇALHO PADRÃO */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'center' }}>
                <button 
                    className='button-padrao' 
                    style={style.buttonVoltar} 
                    onClick={() => telaAtual === "criacao" ? setTelaAtual("listagem") : navigate(-1)}
                >
                    <img src={icone08} alt="Ícone" style={{ width: '30px', height: '30px' }} />
                </button>
                <h1 style={style.titleStyle}>
                    {telaAtual === "listagem" ? "Painel de Alertas" : "Criar Nova Lógica de Alerta"}
                </h1>
            </div>
            <hr />

            {/* CONTEÚDO DINÂMICO */}
            {telaAtual === "listagem" ? (
                /* ================= TELA 1: LISTAGEM DE ALERTAS ================= */
                <div style={{ display: 'flex', flexDirection: 'column', height: '540px', width: '100%', gap: '8px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h2 style={{ margin: 0, color: '#333', fontSize: '22px' }}>Regras Salvas</h2>
                        <button 
                            className='button-padrao' 
                            style={style.btnAdicionar}
                            onClick={() => setTelaAtual("criacao")}
                            disabled={carregandoDados}
                        >
                            {carregandoDados ? "Carregando dados..." : "➕ Adicionar Novo Alerta"}
                        </button>
                    </div>

                    <div style={style.containerCards}>
                        {alertasCriados.map((alerta) => {
                            const ehAluno = alerta.texto ? alerta.texto.includes("aluno") : false;
                            
                            // Procura se essa regra específica gerou alguma ocorrência pendente no banco
                            const ocorrenciasDestaRegra = alertasDisparados.filter(item => item.id_regra === alerta.id);
                            const temOcorrencia = ocorrenciasDestaRegra.length > 0;

                            // Define a cor de fundo baseado no tipo ou se estourou a regra (Vermelho Alerta)
                            let corFundo = ehAluno ? '#ffe8dd' : '#fccccc';
                            if (temOcorrencia) corFundo = '#fee2e2'; // Vermelho pastel de emergência
                            
                            const opacidadeCard = alerta.ativo ? 1 : 0.6;
                            const estaExpandido = alertaExpandido === alerta.id;

                            return (
                                <div key={alerta.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div 
                                        style={{ 
                                            ...style.cardAlertaReal, 
                                            backgroundColor: corFundo, 
                                            opacity: opacidadeCard,
                                            border: temOcorrencia ? '2px solid #ef4444' : '1px solid rgba(0,0,0,0.05)',
                                            cursor: temOcorrencia ? 'pointer' : 'default'
                                        }}
                                        onClick={() => temOcorrencia && setAlertaExpandido(estaExpandido ? null : alerta.id)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                            <span style={{ fontSize: '24px' }}>
                                                {temOcorrencia ? "🚨" : (alerta.ativo ? "🔔" : "🔕")}
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <p style={{ fontSize: '17px', margin: 0, fontWeight: 'bold', color: '#1e3a8a' }}>
                                                    {alerta.texto}
                                                </p>
                                                {temOcorrencia && (
                                                    <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold', marginTop: '2px' }}>
                                                        ⚠️ {ocorrenciasDestaRegra.length} estouro(s) detectado(s). Clique para ver quem foi.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ÁREA DOS BOTÕES */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className='button-padrao'
                                                onClick={async () => {
                                                    try {
                                                        const docRef = doc(db, "config_alertas", alerta.id);
                                                        await updateDoc(docRef, { ativo: !alerta.ativo });
                                                        setAlertasCriados(prev => prev.map(item => 
                                                            item.id === alerta.id ? { ...item, ativo: !item.ativo } : item
                                                        ));
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                style={{
                                                    ...style.btnStatusToggle,
                                                    backgroundColor: alerta.ativo ? '#2e7d32' : '#78909c'
                                                }}
                                            >
                                                {alerta.ativo ? "Ligado" : "Desligado"}
                                            </button>

                                            <button
                                                className='button-padrao'
                                                onClick={async () => {
                                                    if (!window.confirm("Tem certeza que deseja remover esta regra? Todos os alertas disparados por ela também serão apagados.")) return;
                                                    try {
                                                        // 1. Limpa em cascata todos os alertas disparados por essa regra no banco
                                                        const disparadosRef = collection(db, "alertas_disparados");
                                                        const disparadosSnapshot = await getDocs(disparadosRef);
                                                        
                                                        disparadosSnapshot.forEach(async (docSnap) => {
                                                            if (docSnap.data().id_regra === alerta.id) {
                                                                await deleteDoc(doc(db, "alertas_disparados", docSnap.id));
                                                            }
                                                        });

                                                        // 2. Deleta a regra de configuração principal
                                                        const docRef = doc(db, "config_alertas", alerta.id);
                                                        await deleteDoc(docRef);
                                                        
                                                        // 3. Atualiza os estados locais
                                                        setAlertasCriados(prev => prev.filter(item => item.id !== alerta.id));
                                                        setAlertasDisparados(prev => prev.filter(item => item.id_regra !== alerta.id));
                                                        setAlertaExpandido(null);
                                                        
                                                        alert("Regra e seus respectivos alertas apagados com sucesso!");
                                                    } catch (err) {
                                                        console.error("Erro ao deletar regra e alertas em cascata:", err);
                                                    }
                                                }}
                                                style={style.btnDeletarAlerta}
                                            >
                                                <img src={icone04} alt="Excluir" style={{ width: '18px', height: '18px' }} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* PAINEL EXPANSÍVEL: MOSTRA QUEM CAUSOU O ALERTA */}
                                    {estaExpandido && temOcorrencia && (
                                        <div style={style.painelCausadores}>
                                            <h4 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '14px' }}>Causadores do Alerta:</h4>
                                            {ocorrenciasDestaRegra.map((oc) => (
                                                <div key={oc.id} style={style.linhaCausador}>
                                                    <p style={{ margin: 0, fontSize: '15px', color: '#333' }}>
                                                        📌 <strong>{oc.causador}</strong> ({oc.turma}) atingiu o limite crítico com <strong>{oc.quantidadeFaltasAtual} faltas</strong>.
                                                    </p>
                                                    <button 
                                                        className='button-padrao' 
                                                        style={style.btnMarcarLido}
                                                        onClick={() => marcarOcorrenciaComoLida(oc.id)}
                                                    >
                                                        Marcar como Visto ✓
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {alertasCriados.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>Nenhuma regra criada.</p>
                        )}
                    </div>
                </div>
            ) : (
                /* ================= TELA 2: FORMULÁRIO DE CRIAÇÃO ================= */
                <div style={{ display: 'flex', flexDirection: 'column', height: '370px', width: '100%', gap: '15px', paddingTop: '5px' }}>
                    <div style={style.linhaConstrutor}>
                        <div style={style.blocoFluxo}>
                            <span style={style.textoFixoFrase}>Se...</span>
                            <select value={tipoAlvo} onChange={(e) => setTipoAlvo(e.target.value)} style={style.selectFrase}>
                                <option value="Aluno">Aluno</option>
                                <option value="Turma">Turma</option>
                            </select>
                            <select value={escopo} onChange={(e) => setEscopo(e.target.value)} style={style.selectFrase}>
                                <option value="Todos">Todos</option>
                                <option value="Especifico">Especifico</option>
                            </select>
                            {escopo === "Especifico" && tipoAlvo === "Turma" && (
                                <select value={turmaSelecionada} onChange={(e) => setTurmaSelecionada(e.target.value)} style={style.selectFrase}>
                                    <option value="">Selecione a Turma...</option>
                                    {listaTurmasBD.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            )}
                            {escopo === "Especifico" && tipoAlvo === "Aluno" && (
                                <>
                                    <select value={turmaSelecionada} onChange={(e) => setTurmaSelecionada(e.target.value)} style={style.selectFrase}>
                                        <option value="">Selecione a Turma...</option>
                                        {listaTurmasBD.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    {turmaSelecionada && (
                                        <select value={alunoSelecionado} onChange={(e) => setAlunoSelecionado(e.target.value)} style={style.selectFrase}>
                                            <option value="">Selecione o Aluno...</option>
                                            {(mapaAlunosPorTurma[turmaSelecionada] || []).map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    )}
                                </>
                            )}
                        </div>
                        <span style={style.flechaIndicativa}>➔</span>
                        <div style={style.blocoFluxo2}>
                            <span style={style.textoFixoFrase}>atingir</span>
                            <input type="number" min="1" placeholder="Ex: 30" value={quantidadeFaltas} onChange={(e) => setQuantidadeFaltas(e.target.value)} style={style.inputNumeroFrase} />
                            <span style={style.textoFixoFrase}>de faltas</span>
                            <select value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value)} style={style.selectFrase}>
                                <option value="Seguidas">Seguidas</option>
                                <option value="Mensal">Mensal</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>
                        <span style={style.flechaIndicativa}>➔</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={style.tagGerarAlerta}>gerar alerta 🔔</span>
                        </div>
                    </div>

                    <div style={style.containerPreview}>
                        <h2 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '17px' }}>Visualização do Alerta:</h2>
                        <p style={style.styleTextoPreview}>{gerarTextoLogica()}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                        <button className='button-padrao' style={style.btnSalvar} onClick={salvarAlerta}>Salvar Alerta</button>
                        <button className='button-padrao' style={style.btnCancelar} onClick={() => setTelaAtual("listagem")}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const style = {
    titleStyle: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' },
    containerPrincipal: { backgroundColor: 'rgb(245, 245, 245)', padding: '15px', borderRadius: '12px', boxShadow: '0 10px 25 rgba(0, 0, 0, 0.3)', width: '1400px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '4px', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
    buttonVoltar: { borderRadius: '80px', backgroundColor: 'transparent', width: '30px', height: '30px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    btnAdicionar: { backgroundColor: '#1e3a8a', color: '#fff', padding: '12px 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '30px', display: 'flex', alignItems: 'center' },
    textoFixoFrase: { fontSize: '17px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #ffeeba', display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '5px' },
    selectFrase: { padding: '8px 12px', borderRadius: '8px', border: '2px solid #e0d6ff', fontSize: '17px', fontFamily: 'inherit', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f4f1ff', cursor: 'pointer' },
    inputNumeroFrase: { width: '100px', padding: '8px 10px', borderRadius: '8px', border: '2px solid #e0d6ff', fontSize: '17px', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' },
    containerPreview: { padding: '20px', backgroundColor: '#e0d6ff', borderRadius: '12px', borderLeft: '6px solid #1e3a8a' },
    styleTextoPreview: { fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 },
    btnSalvar: { backgroundColor: '#2e7d32', color: '#fff', padding: '12px 25px', borderRadius: '10px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancelar: { backgroundColor: '#cfd8dc', color: '#374151', padding: '12px 25px', borderRadius: '10px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
    tagGerarAlerta: { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#fffdfd', padding: '6px 14px', borderRadius: '20px', border: '3px solid #ff8181', display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '5px' },
    linhaConstrutor: { display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '15px' },
    blocoFluxo: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', backgroundColor: '#ffe8dd', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e9ecef' },
    blocoFluxo2: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', backgroundColor: '#fccccc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e9ecef' },
    flechaIndicativa: { fontSize: '18px', color: '#a0aec0', fontWeight: 'bold', userSelect: 'none', padding: '0 4px' },
    containerCards: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px', border: '1px solid #ddd', borderRadius: '15px', backgroundColor: '#fff', height: '100%', overflowY: 'auto' },
    cardAlertaReal: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.04)', transition: 'all 0.3s ease' },
    btnStatusToggle: { border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', transition: 'all 0.2s ease-in-out' },
    btnDeletarAlerta: { height: '35px', width: '35px', border: '1px solid #ffcdd2', backgroundColor: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' },
    
    // ESTILOS DO PAINEL EXPANSÍVEL DO CAUSADOR:
    painelCausadores: {
        backgroundColor: '#fff5f5',
        borderLeft: '4px solid #ef4444',
        padding: '12px 18px',
        borderRadius: '12px',
        marginTop: '1px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
    },
    linhaCausador: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #fee2e2'
    },
    btnMarcarLido: {
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    }
};

export default Alertas;