import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// StrictMode is intentionally not used: it double-mounts effects in dev, which would open the mic twice.
createRoot(document.getElementById('root')).render(<App />);
