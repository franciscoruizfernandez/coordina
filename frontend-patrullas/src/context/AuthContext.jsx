// frontend-patrulles/src/context/AuthContext.jsx

import { createContext, useReducer, useEffect } from 'react'

export const AuthContext = createContext()

// ─── Estat inicial ──────────────────────────────────────────
const initialState = {
  token: null,
  usuari: null,
  indicatiu: null, // Dades de l'indicatiu associat a la patrulla
}

// ─── Reducer ────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        token: action.payload.token,
        usuari: action.payload.usuari,
        indicatiu: action.payload.indicatiu,
      }
    case 'SET_INDICATIU':
      return {
        ...state,
        indicatiu: action.payload,
      }
    case 'LOGOUT':
      return {
        token: null,
        usuari: null,
        indicatiu: null,
      }
    default:
      return state
  }
}

// ─── Provider ───────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Al carregar l'app, recuperem la sessió de localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    const usuari = localStorage.getItem('usuari')
    const indicatiu = localStorage.getItem('indicatiu')

    if (token && usuari) {
      dispatch({
        type: 'LOGIN',
        payload: {
          token,
          usuari: JSON.parse(usuari),
          indicatiu: indicatiu ? JSON.parse(indicatiu) : null,
        },
      })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}