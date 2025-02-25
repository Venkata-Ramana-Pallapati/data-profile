import React, { useState } from 'react';
import { LogIn, Shield, Lock, UserCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      onLogin(email);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:30px_30px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] bg-blue-500 rounded-full blur-[120px] opacity-20" />
        </div>
      </div>
      
      <div className="relative grid md:grid-cols-2 gap-8 max-w-4xl w-full mx-4">
        <div className="hidden md:flex flex-col justify-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl text-white">
          <div className="mb-8 space-y-4">
            <Shield className="w-16 h-16 text-white" />
            <h2 className="text-3xl font-bold">Data Security First</h2>
            <p className="text-white/80">
              SigmaDQ provides enterprise-grade security for your data profiling needs
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5" />
              <span>Advanced Encryption</span>
            </div>
            <div className="flex items-center space-x-3">
              <UserCheck className="w-5 h-5" />
              <span>Secure Authentication</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center mb-8">
            <LogIn className="w-12 h-12 text-blue-600" />
            <h1 className="text-3xl font-bold ml-2 text-gray-800">SigmaDQ</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 relative overflow-hidden"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}