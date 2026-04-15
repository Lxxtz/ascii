import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [simData, setSimData] = useState([]);
  const navigate = useNavigate();

  const login = (userData) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const logout = () => {
    setUser(null);
    setSimData([]);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, simData, setSimData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
