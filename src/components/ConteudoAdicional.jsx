export default function AreaAdicional({ visible, children }) {
  if (!visible) return null;

  return (
    <div style={{
      padding: '15px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      {children}
    </div>
  );
}