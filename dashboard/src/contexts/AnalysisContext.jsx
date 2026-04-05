import React, { createContext, useContext, useState } from 'react';

const AnalysisContext = createContext();

export const useAnalysis = () => useContext(AnalysisContext);

export const AnalysisProvider = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  return (
    <AnalysisContext.Provider value={{ currentSessionId, setCurrentSessionId }}>
      {children}
    </AnalysisContext.Provider>
  );
};
