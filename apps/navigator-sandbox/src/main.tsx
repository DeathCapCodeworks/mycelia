import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Background } from '@mycelia/ui-components';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Background />
    <App />
  </React.StrictMode>
);
