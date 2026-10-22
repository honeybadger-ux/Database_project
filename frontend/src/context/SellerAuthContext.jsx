import React, { createContext, useContext, useState, useEffect } from 'react';
import { sellerService } from '../services/api';

const SellerAuthContext = createContext(null);

export const SellerAuthProvider = ({ children }) => {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('seller_token');
      if (token) {
        try {
          const res = await sellerService.getMe();
          setSeller(res.data);
        } catch (err) {
          console.error('Failed to authenticate stored merchant token', err);
          localStorage.removeItem('seller_token');
          localStorage.removeItem('seller_user');
          setSeller(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (credentials) => {
    const res = await sellerService.login(credentials);
    const { access_token, seller: sellerData } = res.data;
    localStorage.setItem('seller_token', access_token);
    localStorage.setItem('seller_user', JSON.stringify(sellerData));
    setSeller(sellerData);
    return sellerData;
  };

  const logout = () => {
    localStorage.removeItem('seller_token');
    localStorage.removeItem('seller_user');
    setSeller(null);
  };

  return (
    <SellerAuthContext.Provider
      value={{
        seller,
        isAuthenticated: !!seller,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
};

export const useSellerAuth = () => {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider');
  }
  return context;
};
