import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'glass';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white border border-red-400/30 shadow-red-900/50",
    secondary: "bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white border border-emerald-400/30",
    danger: "bg-slate-700/50 hover:bg-red-900/50 text-slate-200 border border-slate-600",
    gold: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-red-950 border-2 border-amber-300 shadow-amber-900/20",
    glass: "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-500 transition-colors backdrop-blur-sm"
    {...props}
  />
);

export const Label: React.FC<{children: React.ReactNode}> = ({children}) => (
  <label className="block text-amber-400 text-xs font-bold mb-1 uppercase tracking-widest opacity-80">
    {children}
  </label>
);

export const Card: React.FC<{children: React.ReactNode, className?: string, noPadding?: boolean}> = ({children, className = '', noPadding = false}) => (
  <div className={`glass-card rounded-2xl shadow-2xl overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{children: React.ReactNode, color?: 'green' | 'yellow' | 'red'}> = ({children, color = 'green'}) => {
  const colors = {
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    yellow: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30"
  };
  
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${colors[color]} inline-flex items-center gap-1`}>
      {children}
    </span>
  );
};