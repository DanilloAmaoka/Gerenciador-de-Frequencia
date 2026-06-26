import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { db } from '../firebase/config';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    arrayRemove,
    arrayUnion
} from 'firebase/firestore';

import icone04 from '../assets/icon4.png';
import icone05 from '../assets/icon5.png';
import icone08 from '../assets/icon8.png';

function Turmas() {
    const navigate = useNavigate();

    const [abaAtual, setAbaAtual] = useState('turmas');

    const [turmas, setTurmas] = useState([]);
    const [turmaAtiva, setTurmaAtiva] = useState(localStorage.getItem('turmaAtivaTurmas') || '');

    const [alunos, setAlunos] = useState([]);
    const [novoAluno, setNovoAluno] = useState('');
    const [novaTurma, setNovaTurma] = useState('');

    const [carregando, setCarregando] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [confirmacao, setConfirmacao] = useState(null);
    const [exibirAvisoNomes, setExibirAvisoNomes] = useState(false);

    const botoesBloqueados = carregando || !!feedback;

    const turmaSelecionada = turmas.find((turma) => turma.nome === turmaAtiva);

    const mostrarFeedback = (tipo, titulo, mensagem) => {
        setFeedback({ tipo, titulo, mensagem });

        setTimeout(() => {
            setFeedback(null);
        }, 2800);
    };

    const normalizarTexto = (texto) => {
        return texto.trim().toLowerCase();
    };

    const carregarTurmas = async () => {
        setCarregando(true);

        try {
            const snapshot = await getDocs(collection(db, 'turmas'));

            const listaTurmas = snapshot.docs
                .map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }))
                .filter((turma) => turma.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome));

            setTurmas(listaTurmas);

            const turmaSalvaExiste = listaTurmas.some((turma) => turma.nome === turmaAtiva);

            if (turmaAtiva && !turmaSalvaExiste) {
                setTurmaAtiva('');
                setAlunos([]);
                localStorage.removeItem('turmaAtivaTurmas');
                localStorage.removeItem('turmaAtivaFaltas');
            }

            if (!turmaAtiva && listaTurmas.length > 0) {
                setTurmaAtiva(listaTurmas[0].nome);
            }
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            mostrarFeedback('erro', 'Erro ao carregar', 'Não foi possível buscar as turmas do banco.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarTurmas();
    }, []);

    useEffect(() => {
        if (!turmaAtiva) {
            setAlunos([]);
            return;
        }

        localStorage.setItem('turmaAtivaTurmas', turmaAtiva);
        localStorage.setItem('turmaAtivaFaltas', turmaAtiva);

        const turma = turmas.find((item) => item.nome === turmaAtiva);

        if (turma) {
            setAlunos(turma.alunos || []);
        } else {
            setAlunos([]);
        }
    }, [turmaAtiva, turmas]);

    const adicionarTurma = async () => {
        const nomeTratado = novaTurma.trim();

        if (!nomeTratado) {
            mostrarFeedback('erro', 'Nome obrigatório', 'Digite o nome da turma antes de salvar.');
            return;
        }

        const turmaJaExiste = turmas.some(
            (turma) => normalizarTexto(turma.nome) === normalizarTexto(nomeTratado)
        );

        if (turmaJaExiste) {
            mostrarFeedback('erro', 'Turma já existe', `Já existe uma turma chamada "${nomeTratado}".`);
            return;
        }

        try {
            setCarregando(true);

            const agora = new Date().toISOString();

            const docRef = await addDoc(collection(db, 'turmas'), {
                nome: nomeTratado,
                alunos: [],
                criadoEm: agora,
                atualizadoEm: agora
            });

            const novaTurmaCriada = {
                id: docRef.id,
                nome: nomeTratado,
                alunos: [],
                criadoEm: agora,
                atualizadoEm: agora
            };

            setTurmas((prev) =>
                [...prev, novaTurmaCriada].sort((a, b) => a.nome.localeCompare(b.nome))
            );

            setTurmaAtiva(nomeTratado);
            setNovaTurma('');
            mostrarFeedback('sucesso', 'Turma criada', `"${nomeTratado}" foi adicionada ao sistema.`);
        } catch (error) {
            console.error('Erro ao adicionar turma:', error);
            mostrarFeedback('erro', 'Erro ao criar turma', 'Não foi possível salvar a turma no banco.');
        } finally {
            setCarregando(false);
        }
    };

    const solicitarExclusaoTurma = (turma) => {
        setConfirmacao({
            tipo: 'turma',
            titulo: 'Excluir turma?',
            mensagem: `A turma "${turma.nome}" será removida do sistema. Os alunos cadastrados nela também deixarão de aparecer nas listas.`,
            item: turma
        });
    };

    const excluirTurma = async (turma) => {
        try {
            setCarregando(true);

            await deleteDoc(doc(db, 'turmas', turma.id));

            setTurmas((prev) => prev.filter((item) => item.id !== turma.id));

            if (turmaAtiva === turma.nome) {
                setTurmaAtiva('');
                setAlunos([]);
                localStorage.removeItem('turmaAtivaTurmas');
                localStorage.removeItem('turmaAtivaFaltas');
            }

            setConfirmacao(null);
            mostrarFeedback('sucesso', 'Turma excluída', `"${turma.nome}" foi removida com sucesso.`);
        } catch (error) {
            console.error('Erro ao excluir turma:', error);
            mostrarFeedback('erro', 'Erro ao excluir', 'Não foi possível excluir essa turma.');
        } finally {
            setCarregando(false);
        }
    };

    const adicionarAluno = async () => {
        const nomeTratado = novoAluno.trim();

        if (!turmaSelecionada) {
            mostrarFeedback('erro', 'Nenhuma turma selecionada', 'Selecione uma turma antes de adicionar alunos.');
            return;
        }

        if (!nomeTratado) {
            mostrarFeedback('erro', 'Nome obrigatório', 'Digite o nome do aluno antes de adicionar.');
            return;
        }

        const nomeJaExiste = alunos.some(
            (aluno) => normalizarTexto(aluno) === normalizarTexto(nomeTratado)
        );

        if (nomeJaExiste) {
            setExibirAvisoNomes(true);

            mostrarFeedback(
                'erro',
                'Aluno já cadastrado',
                `Já existe um aluno chamado "${nomeTratado}" nessa turma. Use um identificador diferente se forem pessoas diferentes.`
            );
            return;
        }

        try {
            setCarregando(true);

            const agora = new Date().toISOString();
            const docRef = doc(db, 'turmas', turmaSelecionada.id);

            await updateDoc(docRef, {
                alunos: arrayUnion(nomeTratado),
                atualizadoEm: agora
            });

            setTurmas((prev) =>
                prev.map((turma) =>
                    turma.id === turmaSelecionada.id
                        ? {
                            ...turma,
                            alunos: [...(turma.alunos || []), nomeTratado],
                            atualizadoEm: agora
                        }
                        : turma
                )
            );

            setNovoAluno('');
            setExibirAvisoNomes(false);
            mostrarFeedback('sucesso', 'Aluno adicionado', `${nomeTratado} foi cadastrado em ${turmaAtiva}.`);
        } catch (error) {
            console.error('Erro ao adicionar aluno:', error);
            mostrarFeedback('erro', 'Erro ao adicionar', 'Não foi possível adicionar o aluno.');
        } finally {
            setCarregando(false);
        }
    };

    const solicitarExclusaoAluno = (aluno) => {
        setConfirmacao({
            tipo: 'aluno',
            titulo: 'Remover aluno?',
            mensagem: `${aluno} será removido da turma ${turmaAtiva}.`,
            item: aluno
        });
    };

    const excluirAluno = async (nomeAluno) => {
        if (!turmaSelecionada) return;

        try {
            setCarregando(true);

            const agora = new Date().toISOString();
            const docRef = doc(db, 'turmas', turmaSelecionada.id);

            await updateDoc(docRef, {
                alunos: arrayRemove(nomeAluno),
                atualizadoEm: agora
            });

            setTurmas((prev) =>
                prev.map((turma) =>
                    turma.id === turmaSelecionada.id
                        ? {
                            ...turma,
                            alunos: (turma.alunos || []).filter((aluno) => aluno !== nomeAluno),
                            atualizadoEm: agora
                        }
                        : turma
                )
            );

            setConfirmacao(null);
            mostrarFeedback('sucesso', 'Aluno removido', `${nomeAluno} foi removido de ${turmaAtiva}.`);
        } catch (error) {
            console.error('Erro ao remover aluno:', error);
            mostrarFeedback('erro', 'Erro ao remover', 'Não foi possível remover o aluno.');
        } finally {
            setCarregando(false);
        }
    };

    const confirmarAcao = () => {
        if (!confirmacao) return;

        if (confirmacao.tipo === 'turma') {
            excluirTurma(confirmacao.item);
            return;
        }

        if (confirmacao.tipo === 'aluno') {
            excluirAluno(confirmacao.item);
        }
    };

    const aplicarModeloTurma = (nomeModelo) => {
        setNovaTurma(nomeModelo);
    };

    const renderizarAbaTurmas = () => {
        return (
            <div style={style.gridConteudo}>
                <section style={style.painelPrincipal}>
                    <div style={style.cabecalhoSecao}>
                        <h2 style={style.tituloSecao}>Turmas cadastradas</h2>
                        <span style={style.contador}>
                            {turmas.length} turma(s)
                        </span>
                    </div>

                    <div style={style.listaTurmasGerenciamento}>
                        {carregando && turmas.length === 0 && (
                            <p style={style.textoVazio}>Carregando turmas...</p>
                        )}

                        {!carregando && turmas.length === 0 && (
                            <div style={style.estadoVazio}>
                                <strong>Nenhuma turma cadastrada ainda.</strong>
                                <span>Crie a primeira turma usando o formulário ao lado.</span>
                            </div>
                        )}

                        {turmas.map((turma) => {
                            const estaSelecionada = turmaAtiva === turma.nome;
                            const totalAlunos = (turma.alunos || []).length;

                            return (
                                <div
                                    key={turma.id}
                                    style={{
                                        ...style.cardTurmaGerenciamento,
                                        borderColor: estaSelecionada ? '#7c3aed' : '#e2e8f0',
                                        backgroundColor: estaSelecionada ? '#f5f3ff' : '#ffffff'
                                    }}
                                >
                                    <button
                                        className="button-padrao"
                                        style={style.areaCliqueTurma}
                                        onClick={() => setTurmaAtiva(turma.nome)}
                                        disabled={botoesBloqueados}
                                    >
                                        <div>
                                            <h3 style={style.nomeTurmaCard}>{turma.nome}</h3>
                                            <p style={style.infoTurmaCard}>
                                                {totalAlunos} aluno(s) cadastrado(s)
                                            </p>
                                        </div>

                                        {estaSelecionada && (
                                            <span style={style.tagSelecionada}>Selecionada</span>
                                        )}
                                    </button>

                                    <button
                                        className="button-padrao"
                                        style={style.btnExcluirPequeno}
                                        onClick={() => solicitarExclusaoTurma(turma)}
                                        disabled={botoesBloqueados}
                                        title="Excluir turma"
                                    >
                                        <img src={icone04} alt="Excluir" style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <aside style={style.painelLateral}>
                    <h2 style={style.tituloSecao}>Adicionar nova turma</h2>

                    <p style={style.textoAjuda}>
                        Use nomes claros, como <strong>1° Ano A</strong>, <strong>2° Ano B</strong> ou <strong>Turma Manhã</strong>.
                    </p>

                    <div style={style.formVertical}>
                        <label style={style.labelCampo}>Nome da turma</label>

                        <input
                            type="text"
                            placeholder="Ex: 1° Ano A"
                            value={novaTurma}
                            onChange={(e) => setNovaTurma(e.target.value)}
                            style={style.inputPadrao}
                            disabled={botoesBloqueados}
                        />

                        <button
                            className="button-padrao"
                            style={style.btnPrimario}
                            onClick={adicionarTurma}
                            disabled={botoesBloqueados}
                        >
                            <img src={icone05} alt="Adicionar" style={{ width: '16px', height: '16px' }} />
                            Criar turma
                        </button>
                    </div>

                    <div style={style.blocoModelos}>
                        <h3 style={style.tituloPequeno}>Pré-montagens rápidas</h3>

                        <div style={style.listaModelos}>
                            {['1° Ano A', '1° Ano B', '2° Ano A', '2° Ano B', '3° Ano A'].map((modelo) => (
                                <button
                                    key={modelo}
                                    className="button-padrao"
                                    style={style.btnModelo}
                                    onClick={() => aplicarModeloTurma(modelo)}
                                    disabled={botoesBloqueados}
                                >
                                    {modelo}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        );
    };

    const renderizarAbaAlunos = () => {
        return (
            <div style={style.gridConteudo}>
                <section style={style.colunaTurmas}>
                    <div style={style.cabecalhoSecaoCompacto}>
                        <h2 style={style.tituloSecao}>Escolha uma turma</h2>
                        <span style={style.contador}>{turmas.length}</span>
                    </div>

                    <div style={style.containerTurmas}>
                        {turmas.length === 0 && (
                            <p style={style.textoVazio}>
                                Nenhuma turma cadastrada.
                            </p>
                        )}

                        {turmas.map((turma) => {
                            const estaSelecionada = turmaAtiva === turma.nome;

                            return (
                                <button
                                    key={turma.id}
                                    style={{
                                        ...style.btnTurmaLista,
                                        backgroundColor: estaSelecionada ? '#e0d6ff' : '#ffffff',
                                        borderColor: estaSelecionada ? '#7c3aed' : '#e5e7eb'
                                    }}
                                    className="button-turma"
                                    onClick={() => setTurmaAtiva(turma.nome)}
                                    disabled={botoesBloqueados}
                                >
                                    <div style={style.conteudoBotaoTurmaAluno}>
                                        <span style={style.emojiTurmaAluno}>🎓</span>

                                        <div style={style.textosTurmaAluno}>
                                            <strong style={style.nomeTurmaAluno}>{turma.nome}</strong>
                                            <span style={style.totalTurmaAluno}>
                                                {(turma.alunos || []).length} aluno(s)
                                            </span>
                                        </div>

                                        {estaSelecionada && (
                                            <span style={style.checkTurmaAluno}>✓</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section style={style.painelPrincipal}>
                    <div style={style.cabecalhoSecao}>
                        <div>
                            <h2 style={style.tituloSecao}>Alunos</h2>
                            <p style={style.subtituloSecao}>
                                {turmaAtiva
                                    ? `Gerenciando alunos da turma ${turmaAtiva}.`
                                    : 'Selecione uma turma para gerenciar os alunos.'
                                }
                            </p>
                        </div>

                        <span style={style.contador}>
                            {alunos.length} aluno(s)
                        </span>
                    </div>

                    <div style={style.containerConteudoTurmas}>
                        {!turmaAtiva && (
                            <div style={style.estadoVazio}>
                                <strong>Nenhuma turma selecionada.</strong>
                                <span>Escolha uma turma na lateral para visualizar os alunos.</span>
                            </div>
                        )}

                        {turmaAtiva && alunos.length === 0 && (
                            <div style={style.estadoVazio}>
                                <strong>Nenhum aluno cadastrado.</strong>
                                <span>Use o formulário abaixo para adicionar o primeiro aluno dessa turma.</span>
                            </div>
                        )}

                        {turmaAtiva && alunos.length > 0 && (
                            <ul style={style.listaAlunos}>
                                {alunos.map((aluno, index) => (
                                    <li key={`${aluno}-${index}`} style={style.itemAluno}>
                                        <div style={style.infoAluno}>
                                            <span style={style.numeroAluno}>{index + 1}</span>
                                            <span style={style.nomeAluno}>{aluno}</span>
                                        </div>

                                        <button
                                            onClick={() => solicitarExclusaoAluno(aluno)}
                                            className="button-deletarAluno"
                                            style={style.btnExcluirAluno}
                                            disabled={botoesBloqueados}
                                        >
                                            <img src={icone04} alt="Excluir" style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={style.cardAdicionarAluno}>
                        <div>
                            <div style={style.headerAdicionarAluno}>
                                <h3 style={style.tituloAdicionarAluno}>
                                    Adicionar aluno {turmaAtiva ? `em ${turmaAtiva}` : ''}
                                </h3>

                                <button
                                    type="button"
                                    className="button-padrao"
                                    style={{
                                        ...style.btnAvisoNomes,
                                        backgroundColor: exibirAvisoNomes ? '#fef3c7' : '#fff7ed',
                                        borderColor: exibirAvisoNomes ? '#f59e0b' : '#fed7aa'
                                    }}
                                    onClick={() => setExibirAvisoNomes((prev) => !prev)}
                                    disabled={botoesBloqueados}
                                    title="Ver cuidado sobre nomes repetidos"
                                >
                                    ⚠️
                                </button>
                            </div>

                            {exibirAvisoNomes && (
                                <p style={style.explicacaoAluno}>
                                    Não é permitido cadastrar nomes iguais dentro da mesma turma, porque o sistema usa o nome para calcular faltas, alertas e métricas. Se existirem dois alunos com o mesmo nome, adicione um identificador, como sobrenome ou número.
                                </p>
                            )}
                        </div>

                        <div style={style.linhaAdicionarAluno}>
                            <input
                                disabled={!turmaAtiva || botoesBloqueados}
                                type="text"
                                placeholder="Nome do aluno"
                                value={novoAluno}
                                onChange={(e) => {
                                    setNovoAluno(e.target.value);

                                    if (exibirAvisoNomes) {
                                        const digitado = normalizarTexto(e.target.value);
                                        const aindaExisteIgual = alunos.some((aluno) => normalizarTexto(aluno) === digitado);

                                        if (!aindaExisteIgual) {
                                            setExibirAvisoNomes(false);
                                        }
                                    }
                                }}
                                style={style.inputAluno}
                            />

                            <button
                                className="button-padrao"
                                style={{
                                    ...style.buttonAdicionarAluno,
                                    opacity: !turmaAtiva || botoesBloqueados ? 0.5 : 1
                                }}
                                onClick={adicionarAluno}
                                disabled={!turmaAtiva || botoesBloqueados}
                            >
                                <img src={icone05} alt="Adicionar" style={{ width: '16px', height: '16px' }} />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    };

    return (
        <div style={style.containerPrincipal}>
            {feedback && (
                <div style={style.feedbackOverlay}>
                    <div
                        style={{
                            ...style.feedbackCard,
                            borderColor:
                                feedback.tipo === 'erro'
                                    ? '#fecaca'
                                    : feedback.tipo === 'carregando'
                                        ? '#bfdbfe'
                                        : '#bbf7d0'
                        }}
                    >
                        <div
                            style={{
                                ...style.feedbackIcone,
                                backgroundColor:
                                    feedback.tipo === 'erro'
                                        ? '#fee2e2'
                                        : feedback.tipo === 'carregando'
                                            ? '#dbeafe'
                                            : '#dcfce7',
                                color:
                                    feedback.tipo === 'erro'
                                        ? '#dc2626'
                                        : feedback.tipo === 'carregando'
                                            ? '#2563eb'
                                            : '#16a34a'
                            }}
                        >
                            {feedback.tipo === 'erro' ? '!' : feedback.tipo === 'carregando' ? '⏳' : '✓'}
                        </div>

                        <div>
                            <h3 style={style.feedbackTitulo}>{feedback.titulo}</h3>
                            <p style={style.feedbackMensagem}>{feedback.mensagem}</p>
                        </div>
                    </div>
                </div>
            )}

            {confirmacao && (
                <div style={style.modalOverlay}>
                    <div style={style.modalConfirmacao}>
                        <h2 style={style.tituloModal}>{confirmacao.titulo}</h2>

                        <p style={style.textoModal}>
                            {confirmacao.mensagem}
                        </p>

                        <div style={style.rodapeModal}>
                            <button
                                className="button-padrao"
                                style={style.btnCancelarModal}
                                onClick={() => setConfirmacao(null)}
                                disabled={botoesBloqueados}
                            >
                                Cancelar
                            </button>

                            <button
                                className="button-padrao"
                                style={style.btnConfirmarExcluir}
                                onClick={confirmarAcao}
                                disabled={botoesBloqueados}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header style={style.header}>
                <div style={style.headerEsquerda}>
                    <button
                        className="button-padrao"
                        style={style.buttonVoltar}
                        onClick={() => navigate(-1)}
                        disabled={botoesBloqueados}
                    >
                        <img src={icone08} alt="Voltar" style={{ width: '30px', height: '30px' }} />
                    </button>

                    <div>
                        <h1 style={style.tituloPagina}>Gerenciar</h1>
                        <p style={style.subtituloPagina}>
                            Organize as turmas e os alunos usados no sistema pedagógico.
                        </p>
                    </div>
                </div>

                <div style={style.abas}>
                    <button
                        className="button-padrao"
                        style={{
                            ...style.btnAba,
                            ...(abaAtual === 'turmas' ? style.btnAbaAtiva : {})
                        }}
                        onClick={() => setAbaAtual('turmas')}
                        disabled={botoesBloqueados}
                    >
                        Gerenciar Turmas
                    </button>

                    <button
                        className="button-padrao"
                        style={{
                            ...style.btnAba,
                            ...(abaAtual === 'alunos' ? style.btnAbaAtiva : {})
                        }}
                        onClick={() => setAbaAtual('alunos')}
                        disabled={botoesBloqueados}
                    >
                        Gerenciar Alunos
                    </button>
                </div>
            </header>

            <hr style={style.linha} />

            <main style={style.conteudo}>
                {abaAtual === 'turmas' ? renderizarAbaTurmas() : renderizarAbaAlunos()}
            </main>
        </div>
    );
}

const style = {
    containerPrincipal: {
        backgroundColor: 'rgb(245, 245, 245)',
        padding: '18px',
        borderRadius: '18px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '1120px',
        height: '660px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '8px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
    },

    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px'
    },

    headerEsquerda: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },

    buttonVoltar: {
        borderRadius: '80px',
        backgroundColor: 'transparent',
        width: '34px',
        height: '34px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    tituloPagina: {
        margin: 0,
        fontSize: '32px',
        color: '#1e293b'
    },

    subtituloPagina: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '15px'
    },

    abas: {
        display: 'flex',
        gap: '8px',
        backgroundColor: '#e2e8f0',
        padding: '5px',
        borderRadius: '999px'
    },

    btnAba: {
        border: 'none',
        padding: '10px 18px',
        borderRadius: '999px',
        backgroundColor: 'transparent',
        color: '#475569',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    btnAbaAtiva: {
        backgroundColor: '#ffffff',
        color: '#1e3a8a',
        boxShadow: '0 3px 10px rgba(15, 23, 42, 0.12)'
    },

    linha: {
        border: 'none',
        borderTop: '1px solid #e2e8f0',
        width: '100%',
        margin: '4px 0'
    },

    conteudo: {
        flex: 1,
        minHeight: 0
    },

    gridConteudo: {
        display: 'grid',
        gridTemplateColumns: '330px 1fr',
        gap: '14px',
        height: '100%'
    },

    painelPrincipal: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0
    },

    painelLateral: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
    },

    colunaTurmas: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0
    },

    cabecalhoSecao: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px'
    },

    cabecalhoSecaoCompacto: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
    },

    tituloSecao: {
        margin: 0,
        color: '#1e293b',
        fontSize: '22px'
    },

    contador: {
        backgroundColor: '#e0d6ff',
        color: '#4c1d95',
        fontWeight: 'bold',
        borderRadius: '999px',
        padding: '6px 12px',
        fontSize: '13px',
        whiteSpace: 'nowrap'
    },

    listaTurmasGerenciamento: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflowY: 'auto',
        paddingRight: '4px'
    },

    cardTurmaGerenciamento: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: '2px solid #e2e8f0',
        borderRadius: '14px',
        padding: '8px',
        transition: 'all 0.2s ease'
    },

    areaCliqueTurma: {
        flex: 1,
        border: 'none',
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'left',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '10px'
    },

    nomeTurmaCard: {
        margin: 0,
        color: '#1e293b',
        fontSize: '19px'
    },

    infoTurmaCard: {
        margin: '3px 0 0 0',
        color: '#64748b',
        fontSize: '14px'
    },

    tagSelecionada: {
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        borderRadius: '999px',
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 'bold'
    },

    btnExcluirPequeno: {
        height: '38px',
        width: '38px',
        border: '1px solid #fecaca',
        backgroundColor: '#fff5f5',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    textoAjuda: {
        margin: 0,
        color: '#475569',
        fontSize: '15px',
        lineHeight: 1.55
    },

    formVertical: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    labelCampo: {
        color: '#334155',
        fontSize: '14px',
        fontWeight: 'bold'
    },

    inputPadrao: {
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        fontSize: '16px',
        outline: 'none'
    },

    btnPrimario: {
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        border: 'none',
        padding: '12px 16px',
        borderRadius: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    },

    blocoModelos: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },

    tituloPequeno: {
        margin: 0,
        fontSize: '16px',
        color: '#1e293b'
    },

    listaModelos: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    },

    btnModelo: {
        border: '1px solid #bfdbfe',
        backgroundColor: '#eff6ff',
        color: '#1e3a8a',
        borderRadius: '999px',
        padding: '7px 10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '13px'
    },

    containerTurmas: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        gap: '8px',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '4px'
    },

    btnTurmaLista: {
        border: '2px solid #e5e7eb',
        borderRadius: '16px',
        padding: '10px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        color: '#1e293b',
        fontSize: '17px',
        transition: 'all 0.2s ease',
        boxShadow: '0 3px 8px rgba(15, 23, 42, 0.05)'
    },

    conteudoBotaoTurmaAluno: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%'
    },

    emojiTurmaAluno: {
        width: '42px',
        height: '42px',
        borderRadius: '14px',
        backgroundColor: '#eef2ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        flexShrink: 0
    },

    textosTurmaAluno: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1
    },

    nomeTurmaAluno: {
        color: '#1e293b',
        fontSize: '17px'
    },

    totalTurmaAluno: {
        color: '#64748b',
        fontSize: '13px',
        fontWeight: '600'
    },

    checkTurmaAluno: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        flexShrink: 0
    },

    containerConteudoTurmas: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        gap: '8px',
        padding: '10px',
        border: '1px solid #e2e8f0',
        borderRadius: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#f8fafc'
    },

    estadoVazio: {
        backgroundColor: '#ffffff',
        border: '1px dashed #cbd5e1',
        borderRadius: '14px',
        padding: '18px',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '15px'
    },

    textoVazio: {
        color: '#64748b',
        fontSize: '15px',
        margin: 0
    },

    listaAlunos: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    itemAluno: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
    },

    infoAluno: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },

    numeroAluno: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#e0d6ff',
        color: '#4c1d95',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px'
    },

    nomeAluno: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b'
    },

    btnExcluirAluno: {
        height: '40px',
        width: '40px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    cardAdicionarAluno: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },

    headerAdicionarAluno: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
    },

    tituloAdicionarAluno: {
        margin: 0,
        color: '#1e293b',
        fontSize: '19px'
    },

    btnAvisoNomes: {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '1px solid #fed7aa',
        backgroundColor: '#fff7ed',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '17px',
        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.18)',
        flexShrink: 0
    },

    explicacaoAluno: {
        margin: '9px 0 0 0',
        color: '#92400e',
        fontSize: '14px',
        lineHeight: 1.45,
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '12px',
        padding: '10px 12px'
    },

    linhaAdicionarAluno: {
        display: 'flex',
        gap: '0'
    },

    inputAluno: {
        flex: 1,
        padding: '12px',
        borderRadius: '12px 0 0 12px',
        border: '1px solid #cbd5e1',
        fontSize: '16px',
        outline: 'none'
    },

    buttonAdicionarAluno: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '8px 16px',
        borderRadius: '0 12px 12px 0',
        width: '170px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#1e3a8a',
        cursor: 'pointer',
        backgroundColor: 'rgba(207, 225, 247, 0.55)',
        border: '1px solid rgba(147, 197, 253, 0.7)',
        boxShadow: '0 4px 14px rgba(0, 110, 188, 0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },

    feedbackOverlay: {
        position: 'absolute',
        top: '18px',
        right: '18px',
        zIndex: 30,
        pointerEvents: 'none'
    },

    feedbackCard: {
        backgroundColor: '#ffffff',
        border: '2px solid #bbf7d0',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 14px 35px rgba(15, 23, 42, 0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '340px',
        maxWidth: '460px'
    },

    feedbackIcone: {
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '22px',
        flexShrink: 0
    },

    feedbackTitulo: {
        margin: 0,
        color: '#1e293b',
        fontSize: '18px'
    },

    feedbackMensagem: {
        margin: '5px 0 0 0',
        color: '#475569',
        fontSize: '14px',
        lineHeight: 1.45
    },

    modalOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        borderRadius: '18px'
    },

    modalConfirmacao: {
        width: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    tituloModal: {
        margin: 0,
        color: '#991b1b'
    },

    textoModal: {
        margin: 0,
        color: '#475569',
        lineHeight: 1.5,
        fontSize: '16px'
    },

    rodapeModal: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '8px'
    },

    btnCancelarModal: {
        backgroundColor: '#e2e8f0',
        color: '#334155',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },

    btnConfirmarExcluir: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
};

export default Turmas;
