import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const { token, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ Si ja està autenticat, redirigir
  useEffect(() => {
    if (token) {
      navigate("/");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        { username, password }
      );

      if (!response.data.exit) {
        setError("Credencials incorrectes");
        return;
      }

      const { token, usuari } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("usuari", JSON.stringify(usuari));

      dispatch({
        type: "LOGIN",
        payload: { token, usuari },
      });

      navigate("/");
    } catch (err) {
      setError("Error de connexió o credencials incorrectes");
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-xl mb-4 font-semibold">Login Sala</h2>

        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;