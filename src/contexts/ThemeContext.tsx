import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Check for saved preference or system preference
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('cleanvee-theme');
        if (saved !== null) {
            return saved === 'dark';
        }
        // Otherwise check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Update document class and localStorage when theme changes
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('cleanvee-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('cleanvee-theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev);
    };

    const setDarkMode = (value: boolean) => {
        setIsDarkMode(value);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
