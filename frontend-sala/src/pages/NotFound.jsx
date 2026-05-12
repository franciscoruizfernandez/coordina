// src/pages/NotFound.jsx

import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center px-6">
        <p className="text-8xl mb-4">🔍</p>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-500 mb-6">
          La pàgina que busques no existeix o ha estat moguda.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium
                     px-6 py-3 rounded-lg transition-colors"
        >
          Tornar al dashboard
        </button>
      </div>
    </div>
  );
}

export default NotFound;