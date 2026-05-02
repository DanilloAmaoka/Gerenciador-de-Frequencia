import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mensagem, setMensagem] = useState("");

    const versao = "v0.1.0-beta"

    const handleLogin = (e) => {
        if (e) e.preventDefault();
        const EMAIL_MESTRE = "oi@gmail.com";
        const SENHA_MESTRE = "123";

        if (email === EMAIL_MESTRE && senha === SENHA_MESTRE) {
            localStorage.setItem("logado", "true");
            setMensagem("sucesso")
            setTimeout(() => {
                navigate('/inicio'); 
            }, 1500);
        } else {
            setMensagem("Email ou Senha incorretos!")
        }
    }


    return (
        <form onSubmit={handleLogin} className='card-projeto' style={{gap: '8px'}}>
            <h1>Gerenciador de Frequência</h1>
            <h3>Login</h3>
            <input 
                type='email'
                placeholder='E-mail de Autenticação'
                required
                style={inputStyle}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
            ></input>

            <input 
                type='password'
                placeholder='Senha'
                required
                style={inputStyle}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
            ></input>

            {mensagem && (
                <p className={`mensagem ${mensagem.includes("sucesso") ? "sucesso" : "erro"}`}>
                    {mensagem === "sucesso" ? "Login realizado! Entrando..." : mensagem}
                </p>
            )}

            <button 
                type='submit' 
                style={buttonStyle}
                className='button-padrao'
                >
                Entrar
            </button>

            {versao}
        </form>

    );
}

const inputStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px'
};

const buttonStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)',
};

export default Login;