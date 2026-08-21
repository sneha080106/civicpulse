import { createContext, useContext, useState } from 'react';

// Lightweight context, no new dependency. Defaults to India ('IN') so every
// existing page behaves exactly as before if it never reads this context.
const CountryContext = createContext({ country: 'IN', setCountry: () => {} });

export const CountryProvider = ({ children }) => {
  const [country, setCountry] = useState('IN');
  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => useContext(CountryContext);