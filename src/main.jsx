import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx' // <--- Fíjate que aquí llame a App.jsx (o srcApp.jsx si no le cambiaste el nombre)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
