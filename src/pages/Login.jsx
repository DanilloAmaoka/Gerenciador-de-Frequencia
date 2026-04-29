import { useNavigate } from 'react-router-dom';

function Login() {
    const navigate = useNavigate();

    return (
    <div className="card-projeto">
        <h1>Gerenciador de Frequência</h1>
        <h3>Login</h3>
        <input 
            type='email'
            placeholder='E-mail de Autenticação'
            required
            style={inputStyle}
        ></input>
        <input 
            type='password'
            placeholder='Senha'
            required
            style={inputStyle}
        ></input>
        <button>
            Entrar
        </button>
        
    </div>

    );
}

const inputStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px'
};

export default Login;