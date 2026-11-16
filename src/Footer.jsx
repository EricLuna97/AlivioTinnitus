export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-disclaimer-card">
        <div className="footer-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <p className="footer-disclaimer-text">
          Herramienta utilitaria de generación acústica en tiempo real para el enmascaramiento de frecuencias. No reemplaza el diagnóstico o tratamiento médico profesional.
        </p>
      </div>
      
      <p className="footer-author">
        Desarrollado por <span className="author-name">Eric Luna</span>
      </p>
    </footer>
  );
}
