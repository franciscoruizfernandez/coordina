import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App.jsx'
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);