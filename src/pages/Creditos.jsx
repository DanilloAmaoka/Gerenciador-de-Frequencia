import { useNavigate } from 'react-router-dom';

function Creditos() {
  const navigate = useNavigate();

  return (
    <div className="card-projeto">
      <h1>Créditos dos Ícones usado no site:</h1>
      <h3>ícone de Educação apresentação palestra estudante by Icogenix on <a href="https://icon-icons.com/pt/authors/1377-icogenix">Icon-Icons.com</a></h3>
      <h3>Edit user student staff Icon by Alfredo Creates on <a href="https://icon-icons.com/authors/244-alfredo-creates">Icon-Icons.com</a></h3>
      <h3>Tool configuration option service Icon by graficon on <a href="https://icon-icons.com/authors/1124-graficon">Icon-Icons.com</a></h3>
      <h3>Garbage bin delete remove Icon by Nice and Serious on <a href="https://icon-icons.com/authors/747-nice-and-serious">Icon-Icons.com</a></h3>
      <h3>Plus Icon by Taras Shypka on <a href="https://icon-icons.com/authors/207-taras-shypka">Icon-Icons.com</a></h3>
      <h3>Sound alert speaker Icon by Arash Bal on <a href="https://icon-icons.com/authors/564-arash-bal">Icon-Icons.com</a></h3>
      <h3>Back button Icon by Rami McMin on <a href="https://icon-icons.com/authors/605-rami-mcmin">Icon-Icons.com</a></h3>
    </div>
  );
}

export default Creditos;