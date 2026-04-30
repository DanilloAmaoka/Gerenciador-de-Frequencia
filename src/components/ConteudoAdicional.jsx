export default function AreaAdicional({ visible, children }) {
  const estiloAnimado = {
    transition: 'all 0.4s ease-in-out',
    opacity: visible ? 1 : 0,
    maxHeight: visible ? '200px' : '0px',
    overflow: 'hidden',
    padding: visible ? '15px' : '0 15px',
    border: visible ? '1px solid #ddd' : '0px solid transparent',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  };

  return (
    <div style={estiloAnimado}>
      {children}
    </div>
  );
}