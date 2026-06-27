import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../firebase/config';

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [usuarioAtual, setUsuarioAtual] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(true);
    const [entrando, setEntrando] = useState(false);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (usuario) => {
            setUsuarioAtual(usuario);
            setCarregandoSessao(false);
        });

        return () => unsubscribe();
    }, []);

    const mostrarErro = (mensagem) => {
        setFeedback({ tipo: 'erro', mensagem });
    };

    const tratarErroLogin = (erro) => {
        const codigo = erro?.code || '';

        if (codigo.includes('invalid-credential') || codigo.includes('wrong-password') || codigo.includes('user-not-found')) {
            return 'E-mail ou senha inválidos. Verifique os dados e tente novamente.';
        }

        if (codigo.includes('too-many-requests')) {
            return 'Muitas tentativas em sequência. Aguarde um pouco antes de tentar novamente.';
        }

        if (codigo.includes('network-request-failed')) {
            return 'Não foi possível conectar agora. Verifique a internet e tente novamente.';
        }

        return 'Não foi possível entrar no sistema. Tente novamente.';
    };

    const entrar = async (event) => {
        event.preventDefault();
        setFeedback(null);

        if (!email.trim() || !senha.trim()) {
            mostrarErro('Informe o e-mail e a senha para acessar o sistema.');
            return;
        }

        try {
            setEntrando(true);
            await signInWithEmailAndPassword(auth, email.trim(), senha);
            navigate('/inicio');
        } catch (erro) {
            console.error('Erro ao fazer login:', erro);
            mostrarErro(tratarErroLogin(erro));
        } finally {
            setEntrando(false);
        }
    };

    const continuarSessao = () => {
        navigate('/inicio');
    };

    return (
        <main style={style.containerPrincipal}>
            <section style={style.painelInstitucional}>
                <div style={style.marcaLinha}>
                    <div style={style.emblema}>PI</div>

                    <div>
                        <span style={style.rotuloEscola}>Sistema Escolar</span>
                        <h1 style={style.nomeEscola}>Princesa Izabel</h1>
                    </div>
                </div>

                <div style={style.textoInstitucional}>
                    <span style={style.nomeCompleto}>Escola Municipal Cívico Militar Princesa Izabel</span>
                    <h2 style={style.tituloSistema}>Gerenciador de Frequência Escolar</h2>
                    <p style={style.descricaoSistema}>
                        Acesso da equipe autorizada para acompanhamento de chamadas, turmas, métricas e alertas pedagógicos.
                    </p>
                </div>

                <div style={style.gradeIndicadores}>
                    <div style={style.indicadorCard}>
                        <strong>Frequência</strong>
                        <span>Registro diário</span>
                    </div>

                    <div style={style.indicadorCard}>
                        <strong>Alertas</strong>
                        <span>Acompanhamento</span>
                    </div>

                    <div style={style.indicadorCard}>
                        <strong>Gestão</strong>
                        <span>Turmas e alunos</span>
                    </div>
                </div>
            </section>

            <section style={style.painelLogin}>
                <div style={style.cabecalhoLogin}>
                    <span style={style.tagAcesso}>Acesso restrito</span>
                    <h2 style={style.tituloLogin}>Entrar no sistema</h2>
                    <p style={style.subtituloLogin}>
                        Use suas credenciais institucionais para continuar.
                    </p>
                </div>

                {usuarioAtual && !carregandoSessao && (
                    <div style={style.sessaoAtiva}>
                        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'left'}}>
                            <strong>Sessão ativa</strong>
                            <span>{usuarioAtual.email}</span>
                        </div>

                        <button
                            type="button"
                            className="button-padrao"
                            style={style.botaoContinuar}
                            onClick={continuarSessao}
                            disabled={entrando}
                        >
                            Continuar
                        </button>
                    </div>
                )}

                <form style={style.formulario} onSubmit={entrar}>
                    <label style={style.campoGrupo}>
                        <span style={style.labelCampo}>E-mail</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="seu.email@escola.com"
                            autoComplete="email"
                            style={style.inputCampo}
                            disabled={entrando}
                        />
                    </label>

                    <label style={style.campoGrupo}>
                        <span style={style.labelCampo}>Senha</span>
                        <input
                            type="password"
                            value={senha}
                            onChange={(event) => setSenha(event.target.value)}
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            style={style.inputCampo}
                            disabled={entrando}
                        />
                    </label>

                    {feedback && (
                        <div style={style.feedbackErro}>
                            <strong>Acesso não realizado</strong>
                            <span>{feedback.mensagem}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="button-padrao"
                        style={{
                            ...style.botaoEntrar,
                            opacity: entrando ? 0.78 : 1,
                            cursor: entrando ? 'wait' : 'pointer'
                        }}
                        disabled={entrando}
                    >
                        {entrando ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <footer style={style.rodapeLogin}>
                    <span>Uso exclusivo da Escola Municipal Cívico Militar Princesa Izabel.</span>
                </footer>
            </section>
        </main>
    );
}

const style = {
    containerPrincipal: {
        width: 'min(980px, calc(100vw - 32px))',
        minHeight: 'min(620px, calc(100vh - 32px))',
        display: 'flex',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 22px 55px rgba(15, 23, 42, 0.22)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: 'border-box'
    },

    painelInstitucional: {
        flex: '1 1 420px',
        minHeight: '560px',
        padding: '34px',
        background: 'linear-gradient(145deg, #0f3d3e 0%, #1f5d46 52%, #c79318 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '28px',
        boxSizing: 'border-box'
    },

    marcaLinha: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
    },

    emblema: {
        width: '62px',
        height: '62px',
        borderRadius: '18px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        color: '#164e42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '23px',
        fontWeight: '900',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)'
    },

    rotuloEscola: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '800',
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.78)'
    },

    nomeEscola: {
        margin: '2px 0 0 0',
        fontSize: '30px',
        fontWeight: '900',
        lineHeight: 1.05
    },

    textoInstitucional: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    nomeCompleto: {
        alignSelf: 'flex-start',
        padding: '8px 12px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        fontSize: '13px',
        fontWeight: '800'
    },

    tituloSistema: {
        margin: 0,
        maxWidth: '420px',
        fontSize: '42px',
        lineHeight: 1.05,
        fontWeight: '900'
    },

    descricaoSistema: {
        margin: 0,
        maxWidth: '430px',
        fontSize: '16px',
        lineHeight: 1.6,
        color: 'rgba(255, 255, 255, 0.86)'
    },

    gradeIndicadores: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '10px'
    },

    indicadorCard: {
        minHeight: '74px',
        padding: '12px',
        borderRadius: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '4px',
        boxSizing: 'border-box'
    },

    painelLogin: {
        flex: '1 1 360px',
        padding: '38px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '24px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff'
    },

    cabecalhoLogin: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    tagAcesso: {
        alignSelf: 'flex-start',
        padding: '7px 10px',
        borderRadius: '999px',
        backgroundColor: '#eef6f3',
        color: '#14614f',
        fontSize: '12px',
        fontWeight: '900',
        textTransform: 'uppercase'
    },

    tituloLogin: {
        margin: 0,
        color: '#102a43',
        fontSize: '32px',
        fontWeight: '900'
    },

    subtituloLogin: {
        margin: 0,
        color: '#64748b',
        fontSize: '15px',
        lineHeight: 1.5
    },

    sessaoAtiva: {
        padding: '14px',
        borderRadius: '16px',
        border: '1px solid #bbf7d0',
        backgroundColor: '#f0fdf4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#166534'
    },

    botaoContinuar: {
        border: 'none',
        borderRadius: '12px',
        padding: '10px 14px',
        backgroundColor: '#166534',
        color: '#ffffff',
        fontWeight: '800',
        cursor: 'pointer'
    },

    formulario: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },

    campoGrupo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },

    labelCampo: {
        color: '#334155',
        fontSize: '14px',
        fontWeight: '800'
    },

    inputCampo: {
        width: '100%',
        height: '50px',
        padding: '0 14px',
        borderRadius: '14px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box'
    },

    feedbackErro: {
        padding: '12px 14px',
        borderRadius: '14px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        fontSize: '14px'
    },

    botaoEntrar: {
        width: '100%',
        height: '52px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: '#1f5d46',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '900',
        boxShadow: '0 12px 24px rgba(31, 93, 70, 0.24)'
    },

    rodapeLogin: {
        paddingTop: '4px',
        color: '#94a3b8',
        fontSize: '13px',
        lineHeight: 1.5
    }
};

export default Login;
