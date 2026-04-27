import { createContext, useReducer, useEffect } from "react";

export const AuthContext = createContext();

const initialState = {
  usuari: null,
  token: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return {
        usuari: action.payload.usuari,
        token: action.payload.token,
      };
    case "LOGOUT":
      return {
        usuari: null,
        token: null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const usuari = localStorage.getItem("usuari");

    if (token && usuari) {
      dispatch({
        type: "LOGIN",
        payload: {
          token,
          usuari: JSON.parse(usuari),
        },
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}