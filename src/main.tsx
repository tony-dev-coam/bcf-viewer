import { createRoot } from 'react-dom/client';
import { StyleProvider } from '@ant-design/cssinjs';
import App from './ui/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StyleProvider layer>
    <App />
  </StyleProvider>,
);
