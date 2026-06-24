import { useNavigate } from 'react-router-dom';
import { getInfoData } from '../utils/data';
import { useState, useEffect, useRef } from 'react';

import { db } from '../firebase/config';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

import icone08 from '../assets/icon8.png';

function Metricas() {
    const { dataFormatada } = getInfoData();
    const navigate = useNavigate();
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaFaltas') || "");
    localStorage.setItem('turmaAtivaTurmas', turmaAtiva);
    
    const [alunos, setAlunos] = useState([]); 
    const [carregando, setCarregando] = useState(false);
    const [dataChamada, setDataChamada] = useState(new Date().toISOString().substring(0, 7)); // Formato: AAAA-MM
    
    const [modoAnalise, setModoAnalise] = useState("mes"); 
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [dataEspecifica, setDataEspecifica] = useState(new Date().toISOString().substring(0, 10));
    const [semanaReferencia, setSemanaReferencia] = useState(new Date().toISOString().substring(0, 10));
    
    const [totalDiasLetivos, setTotalDiasLetivos] = useState(0); 

    const [alunoSelecionado, setAlunoSelecionado] = useState(null);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

    // --- ESTADOS PARA A PESQUISA COM COR DE INPUT ---
    const [termoPesquisa, setTermoPesquisa] = useState("");
    const [pesquisaCarregando, setPesquisaCarregando] = useState(false);
    const [corTextoPesquisa, setCorTextoPesquisa] = useState("#333"); // Guarda a cor dinâmica do texto do input

    // --- ESTADOS PARA DETALHES INDIVIDUAIS DO ALUNO SELECIONADO ---
    const [verTodasAsFaltas, setVerTodasAsFaltas] = useState(false);
    const [historicoCompletoAluno, setHistoricoCompletoAluno] = useState([]); // [{ data, tipo }]
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);
    
    // MODO EDIÇÃO DO BLOCO DE DETALHES
    const [modoEdicao, setModoEdicao] = useState(false);
    const [historicoEdicaoTemporario, setHistoricoEdicaoTemporario] = useState([]); // Rastreia as mudanças antes de salvar
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);

    const nomeAlunoPendenteRef = useRef(null);

    const formatarNovaData = (dataISO) => {
        if (!dataISO) return "";
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // Busca o histórico completo contendo objetos estruturados [{ data, tipo }]
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

                let todasAsFaltas = [];
                chamadasSnapshot.forEach(docSnap => {
                    const dadosChamada = docSnap.data();
                    const dataDoc = dadosChamada.data;
                    const faltasDoDia = dadosChamada.faltas || [];

                    // Encontra se o aluno está na lista deste dia (seja string ou objeto)
                    const registroFalta = faltasDoDia.find(f => f === nomeAluno || f.nome === nomeAluno);
                    
                    if (registroFalta && dataDoc) {
                        todasAsFaltas.push({
                            data: dataDoc,
                            tipo: registroFalta.tipo || 'regular' // fallback para retrocompatibilidade
                        });
                    }
                });
                
                // Ordena por data
                todasAsFaltas.sort((a, b) => a.data.localeCompare(b.data));
                setHistoricoCompletoAluno(todasAsFaltas);
                setHistoricoEdicaoTemporario(todasAsFaltas);
            }
        } catch (error) {
            console.error("Erro ao buscar histórico completo:", error);
        } finally {
            setCarregandoHistorico(false);
        }
    };

    // Dispara a atualização do bloco ao selecionar um aluno ou mudar filtros locais
    useEffect(() => {
        setVerTodasAsFaltas(false);
        setModoEdicao(false);
        if (alunoSelecionado) {
            buscarHistoricoCompleto(alunoSelecionado.nome);
        } else {
            setHistoricoCompletoAluno([]);
            setHistoricoEdicaoTemporario([]);
        }
    }, [alunoSelecionado?.nome]);

    useEffect(() => {
        if (verTodasAsFaltas && alunoSelecionado) {
            buscarHistoricoCompleto(alunoSelecionado.nome);
        }
    }, [verTodasAsFaltas]);

    // Função de alteração retroativa do status no Firebase
    const handleSalvarEdicaoFirebase = async () => {
        if (!alunoSelecionado || !turmaAtiva) return;
        setSalvandoEdicao(true);
        try {
            const turmasRef = collection(db, "turmas");
            const q = query(turmasRef, where("nome", "==", turmaAtiva));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const idTurma = querySnapshot.docs[0].id;
                
                // Varre cada dia modificado e atualiza seu respectivo documento de chamada no Firebase
                for (const itemModificado of historicoEdicaoTemporario) {
                    const chamadaDocRef = doc(db, "turmas", idTurma, "chamadas", itemModificado.data);
                    const chamadasSnapshot = await getDocs(query(collection(db, "turmas", idTurma, "chamadas"), where("data", "==", itemModificado.data)));
                    
                    if(!chamadasSnapshot.empty) {
                        const dadosChamada = chamadasSnapshot.docs[0].data();
                        let listaFaltasAtualizada = dadosChamada.faltas || [];

                        listaFaltasAtualizada = listaFaltasAtualizada.map(f => {
                            const nomeFalta = typeof f === 'string' ? f : f.nome;
                            if (nomeFalta === alunoSelecionado.nome) {
                                return { nome: nomeFalta, tipo: itemModificado.tipo };
                            }
                            return f;
                        });

                        await setDoc(chamadaDocRef, { faltas: listaFaltasAtualizada }, { merge: true });
                    }
                }

                // CORREÇÃO AQUI: Aplica as mudanças da edição temporária diretamente na tela na mesma hora
                setHistoricoCompletoAluno(historicoEdicaoTemporario);
                setModoEdicao(false);

                // Isso força o useEffect geral a atualizar o ranking de alunos e remover a falta justificada da contagem
                const turmaTemporaria = turmaAtiva;
                setTurmaAtiva(""); 
                setTimeout(() => setTurmaAtiva(turmaTemporaria), 50);
            }
        } catch (error) {
            console.error("Erro ao salvar edições retroativas:", error);
            alert("Erro ao salvar atualizações.");
        } finally {
            setSalvandoEdicao(false);
        }
    };

    const alternarTipoFaltaTemporaria = (dataFalta) => {
        if (!modoEdicao) return;
        setHistoricoEdicaoTemporario(prev => 
            prev.map(item => item.data === dataFalta ? { ...item, tipo: item.tipo === 'regular' ? 'justificada' : 'regular' } : item)
        );
    };

    // Pesquisa global mudando apenas a cor do texto do input
    const lidarComPesquisa = async (e) => {
        e.preventDefault();
        if (!termoPesquisa.trim()) return;

        setPesquisaCarregando(true);
        setCorTextoPesquisa("#333");
        
        try {
            const turmasRef = collection(db, "turmas");
            const querySnapshot = await getDocs(turmasRef);
            
            let alunoEncontrado = false;
            let nomeTurmaEncontrada = "";
            let nomeExatoAluno = "";

            querySnapshot.forEach((doc) => {
                const dados = doc.data();
                const listaAlunos = dados.alunos || [];
                
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
                setCorTextoPesquisa("#2e7d32"); // VERDE caso encontre
                nomeAlunoPendenteRef.current = nomeExatoAluno;
                setTurmaAtiva(nomeTurmaEncontrada);
            } else {
                setCorTextoPesquisa("#d32f2f"); // VERMELHO caso não encontre
            }
        } catch (error) {
            console.error(error);
            setCorTextoPesquisa("#d32f2f");
        } finally {
            setPesquisaCarregando(false);
        }
    };

    useEffect(() => {
        const buscarMetricasFaltas = async () => {
            if (!turmaAtiva) return;
            
            setCarregando(true);
            try {
                const turmasRef = collection(db, "turmas");
                const q = query(turmasRef, where("nome", "==", turmaAtiva));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const idTurma = querySnapshot.docs[0].id;
                    const dadosTurma = querySnapshot.docs[0].data();
                    const listaNomesAlunos = dadosTurma.alunos || [];

                    const chamadasRef = collection(db, "turmas", idTurma, "chamadas");
                    const chamadasSnapshot = await getDocs(chamadasRef);

                    const registroDatasFaltas = {};
                    listaNomesAlunos.forEach(nome => {
                        registroDatasFaltas[nome] = [];
                    });

                    let diasContados = 0;

                    chamadasSnapshot.forEach(docSnap => {
                        const dadosChamada = docSnap.data();
                        const dataDoc = dadosChamada.data;
                        const faltasDoDia = dadosChamada.faltas || [];

                        let correspondeAoFiltro = false;

                        if (modoAnalise === "mes" && dataDoc?.startsWith(dataChamada)) correspondeAoFiltro = true;
                        else if (modoAnalise === "media" && dataDoc?.startsWith(anoSelecionado)) correspondeAoFiltro = true;
                        else if (modoAnalise === "periodo" && dataDoc && dataInicio && dataFim) correspondeAoFiltro = dataDoc >= dataInicio && dataDoc <= dataFim;
                        else if (modoAnalise === "data-especifica" && dataDoc === dataEspecifica) correspondeAoFiltro = true;
                        else if (modoAnalise === "semana" && dataDoc && semanaReferencia) {
                            const dataRef = new Date(semanaReferencia + "T12:00:00");
                            const diaDaSemana = dataRef.getDay();
                            const distanciaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
                            const segunda = new Date(dataRef);
                            segunda.setDate(dataRef.getDate() + distanciaParaSegunda);
                            const sexta = new Date(segunda);
                            sexta.setDate(segunda.getDate() + 4);
                            correspondeAoFiltro = dataDoc >= segunda.toISOString().substring(0, 10) && dataDoc <= sexta.toISOString().substring(0, 10);
                        }

                        if (correspondeAoFiltro) {
                            diasContados += 1; 
                            faltasDoDia.forEach(f => {
                                const nomeAluno = typeof f === 'string' ? f : f.nome;
                                const tipoFalta = typeof f === 'string' ? 'regular' : f.tipo;

                                // REGRA SOLICITADA: Faltas justificadas não entram na contagem dos filtros
                                if (registroDatasFaltas[nomeAluno] !== undefined && tipoFalta !== 'justificada') {
                                    registroDatasFaltas[nomeAluno].push({ data: dataDoc, tipo: tipoFalta });
                                }
                            });
                        }
                    });

                    setTotalDiasLetivos(diasContados);

                    const alunosEstruturados = listaNomesAlunos.map(nome => {
                        const datasOrdenadas = registroDatasFaltas[nome].sort((a,b)=> a.data.localeCompare(b.data));
                        return {
                            nome: nome,
                            quantidadeFaltas: datasOrdenadas.length, // Contagem sem as justificadas
                            datasFaltas: datasOrdenadas.map(item => item.data)
                        };
                    });

                    alunosEstruturados.sort((a, b) => b.quantidadeFaltas - a.quantidadeFaltas);
                    setAlunos(alunosEstruturados);

                    if (nomeAlunoPendenteRef.current) {
                        const encontrarAluno = alunosEstruturados.find(a => a.nome === nomeAlunoPendenteRef.current);
                        if (encontrarAluno) setAlunoSelecionado(encontrarAluno);
                        nomeAlunoPendenteRef.current = null; 
                    } else if (alunoSelecionado) {
                        const recarregarSelecionado = alunosEstruturados.find(a => a.nome === alunoSelecionado.nome);
                        if (recarregarSelecionado) setAlunoSelecionado(recarregarSelecionado);
                    }
                } 
            } catch (error) {
                console.error(error);
            } finally {
                setCarregando(false);
            }
        };

        buscarMetricasFaltas();
    }, [turmaAtiva, dataChamada, modoAnalise, dataInicio, dataFim, anoSelecionado, dataEspecifica, semanaReferencia]);

    // Define quais dados exibir na listagem rolável direita do bloco inferior
    const dadosFaltasExibidasBloco = verTodasAsFaltas ? historicoCompletoAluno : historicoCompletoAluno.filter(item => alunoSelecionado?.datasFaltas.includes(item.data));

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
                    <div style={{display: 'flex', flexDirection: 'row', width: '100%', gap: '5px', alignItems: 'center'}}>
                        <h2>Alunos</h2>
                    </div>
                    
                    <div style={style.containerConteudoTurmas}>
                        {turmaAtiva ? (
                            <>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '5px'}}>
                                    <span style={{fontSize:'14px', color:'#666', fontWeight:'600'}}>
                                        Dias letivos no filtro: {totalDiasLetivos} (Justificadas ocultadas)
                                    </span>
                                    <form onSubmit={lidarComPesquisa} style={{display: 'flex', flexDirection: 'row', gap: '5px', marginLeft: 'auto'}}>
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Pesquisar aluno..." 
                                            value={termoPesquisa}
                                            onChange={(e) => {
                                                setTermoPesquisa(e.target.value);
                                                setCorTextoPesquisa("#333"); // Reseta para cor padrão ao digitar
                                            }}
                                            // MODIFICADO: Cor do texto muda dinamicamente para vermelho ou verde
                                            style={{ ...style.inputPesquisa, color: corTextoPesquisa, borderColor: corTextoPesquisa !== "#333" ? corTextoPesquisa : '#ccc' }}
                                        />
                                        <button 
                                            type="submit" 
                                            className='button-padrao' 
                                            disabled={pesquisaCarregando}
                                            style={{ ...style.botaoPesquisa, backgroundColor: '#1e3a8a' }}
                                        >
                                            {pesquisaCarregando ? '...' : 'Buscar'}
                                        </button>
                                    </form>
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
                                                if (faltasDoAluno > 0) { corPreenchimento = '#ffebee'; backgroundStyle = '#ffebee'; }
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
                                                    onClick={() => setAlunoSelecionado(estaSelecionado ? null : aluno)}
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

                                                    <span style={{
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            color: faltasDoAluno > 0 ? '#d32f2f' : '#2e7d32',
                                                            backgroundColor: 'rgba(255,255,255,0.8)',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            border: '1px solid #e5e7eb'
                                                    }}>
                                                        {modoAnalise === "data-especifica" ? (faltasDoAluno > 0 ? 'Faltou' : 'Presente') : `${faltasDoAluno} faltas`}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </>
                        ) : (
                            <p>Selecione uma turma para ver os alunos.</p>
                        )}
                    </div>
                    
                    {/* SEÇÃO INFERIOR REESTRUTURADA E DIVIDIDA EM DOIS LADOS */}
                    <div style={{display: 'flex', flexDirection: 'row', gap: '5px', marginTop: '5px', height: '260px', width: '700px', justifyContent: 'space-between'}}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: '15px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #ddd',
                            borderRadius: '15px',
                            height: '100%', 
                            width: '100%',
                            gap: '15px'
                        }}>
                            {alunoSelecionado ? (
                                <>
                                    {/* METADE ESQUERDA: CONTROLES E BOTÕES DE AÇÃO */}
                                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #eee', paddingRight: '10px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                📌 {alunoSelecionado.nome}
                                            </h3>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555', fontWeight: '500' }}>
                                                {verTodasAsFaltas ? "Visualizando Histórico Completo Geral" : "Visualizando Faltas no Filtro Atual"}
                                            </p>
                                        </div>

                                        {/* GRUPO DE BOTÕES SOLICITADOS */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <button 
                                                onClick={() => setVerTodasAsFaltas(!verTodasAsFaltas)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #1e3a8a', backgroundColor: verTodasAsFaltas ? '#e0d6ff' : 'transparent', color: '#1e3a8a', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                {verTodasAsFaltas ? "✓ Vendo Histórico Total" : "Mostrar Todas as Faltas"}
                                            </button>

                                            {!modoEdicao ? (
                                                <button 
                                                    onClick={() => { setModoEdicao(true); setVerTodasAsFaltas(true); }} // Abre em modo completo para melhor edição
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Alterar Status das Faltas
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                                                    <button 
                                                        onClick={() => { setModoEdicao(false); setHistoricoEdicaoTemporario(historicoCompletoAluno); }}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #757575', backgroundColor: '#fff', color: '#757575', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button 
                                                        onClick={handleSalvarEdicaoFirebase}
                                                        disabled={salvandoEdicao}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', cursor: salvandoEdicao ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        {salvandoEdicao ? 'Aguarde...' : 'Gravar'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* METADE DIREITA: LISTAGEM DE DATA E TIPOS COM SELEÇÃO */}
                                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>
                                            {modoEdicao ? "👉 Escolha os dias para Justificar:" : "Lista de Faltas Registradas:"}
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                                            {carregandoHistorico ? (
                                                <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Carregando dados...</span>
                                            ) : dadosFaltasExibidasBloco.length > 0 ? (
                                                (modoEdicao ? historicoEdicaoTemporario : dadosFaltasExibidasBloco).map((item, idx) => {
                                                    const ehJustificada = item.tipo === 'justificada';
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => alternarTipoFaltaTemporaria(item.data)}
                                                            style={{ 
                                                                fontSize: '14px', 
                                                                color: ehJustificada ? '#2e7d32' : '#c0392b', 
                                                                fontWeight: '500', 
                                                                backgroundColor: ehJustificada ? '#e8f5e9' : '#fdf2f2', 
                                                                padding: '6px 10px', 
                                                                borderRadius: '6px', 
                                                                borderLeft: ehJustificada ? '4px solid #4caf50' : '4px solid #e74c3c',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                cursor: modoEdicao ? 'pointer' : 'default',
                                                                userSelect: 'none',
                                                                boxShadow: modoEdicao ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                                            }}
                                                        >
                                                            <span>📅 {formatarNovaData(item.data)}</span>
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                                {ehJustificada ? 'Justificada ✓' : 'Regular'}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span style={{ fontSize: '14px', color: '#27ae60', fontWeight: '500', margin: 'auto' }}>
                                                    ✓ Nenhuma falta neste período.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p style={{ margin: 'auto', textAlign: 'center', color: '#999', fontSize: '15px' }}>
                                    Selecione um aluno da listagem para analisar seu painel detalhado de justificativas.
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
                            style={{ ...style.btnFiltroOpcao, borderLeft: modoAnalise === "data-especifica" ? "5px solid #1e3a8a" : "5px solid transparent", backgroundColor: modoAnalise === "data-especifica" ? "#e0d6ff" : "#f8f9fa" }}
                        >
                            📅 Analisar por Data
                        </button>
                        {modoAnalise === "data-especifica" && (
                            <div style={style.boxConfigInternoInput}>
                                <input type="date" value={dataEspecifica} onChange={(e) => setDataEspecifica(e.target.value)} style={style.inputDataPeriodoFiltro}/>
                            </div>
                        )}

                        {/* Analisar Semanalmente */}
                        <button 
                            onClick={() => setModoAnalise("semana")}
                            style={{ ...style.btnFiltroOpcao, borderLeft: modoAnalise === "semana" ? "5px solid #1e3a8a" : "5px solid transparent", backgroundColor: modoAnalise === "semana" ? "#e0d6ff" : "#f8f9fa" }}
                        >
                            📅 Analisar Semanalmente
                        </button>
                        {modoAnalise === "semana" && (
                            <div style={style.boxConfigInternoInput}>
                                <input type="date" value={semanaReferencia} onChange={(e) => setSemanaReferencia(e.target.value)} style={style.inputDataPeriodoFiltro}/>
                            </div>
                        )}
                        
                        {/* Botão Mês Específico */}
                        <button 
                            onClick={() => setModoAnalise("mes")}
                            style={{ ...style.btnFiltroOpcao, borderLeft: modoAnalise === "mes" ? "5px solid #1e3a8a" : "5px solid transparent", backgroundColor: modoAnalise === "mes" ? "#e0d6ff" : "#f8f9fa" }}
                        >
                            📊 Histórico Mensal
                        </button>
                        {modoAnalise === "mes" && (
                            <div style={style.boxConfigInternoInput}>
                                <input type="month" value={dataChamada} onChange={(e) => setDataChamada(e.target.value)} style={style.inputDataPeriodoFiltro}/>
                            </div>
                        )}

                        {/* Botão Média Total Histórica */}
                        <button 
                            onClick={() => setModoAnalise("media")}
                            style={{ ...style.btnFiltroOpcao, borderLeft: modoAnalise === "media" ? "5px solid #1e3a8a" : "5px solid transparent", backgroundColor: modoAnalise === "media" ? "#e0d6ff" : "#f8f9fa" }}
                        >
                            📊 Histórico Anual
                        </button>
                        {modoAnalise === "media" && (
                            <div style={style.boxConfigInternoInput}>
                                <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)} style={style.inputDataPeriodoFiltro}>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                </select>
                            </div>
                        )}

                        {/* Botão Entre Datas */}
                        <button 
                            onClick={() => setModoAnalise("periodo")}
                            style={{ ...style.btnFiltroOpcao, borderLeft: modoAnalise === "periodo" ? "5px solid #1e3a8a" : "5px solid transparent", backgroundColor: modoAnalise === "periodo" ? "#e0d6ff" : "#f8f9fa" }}
                        >
                            📅 Intervalo de Período
                        </button>
                        {modoAnalise === "periodo" && (
                            <div style={{...style.boxConfigInternoInput, display:'flex', flexDirection:'column', gap:'4px'}}>
                                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={style.inputDataPeriodoFiltro}/>
                                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={style.inputDataPeriodoFiltro}/>
                            </div>
                        )}
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
        width: '1300px',
        height: '710px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '4px',
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
    },
    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column', 
        height: '340px', 
        width: '100%', 
        gap: '5px', 
        padding: '10px', 
        border: '1px solid #ddd',
        borderRadius: '15px',
    },
    inputPesquisa: {
        width: '240px',
        height: '32px',
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '15px',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        fontWeight: '500'
    },
    botaoPesquisa: {
        width: '70px',
        height: '32px',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '30px',
        height: '30px',
        cursor: 'pointer',
        border: 'none',
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
    },
    boxConfigInternoInput: {
        backgroundColor: '#fff',
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid #e1e8ed',
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