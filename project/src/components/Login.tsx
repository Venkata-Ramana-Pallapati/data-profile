import React, { useState } from 'react';
import { BarChart2, Database, Shield, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:30px_30px]" />
        
        {/* Animated circles */}
        <div className="absolute top-1/4 left-1/4 animate-pulse">
          <div className="h-64 w-64 bg-purple-500 rounded-full blur-3xl opacity-20" />
        </div>
        <div className="absolute bottom-1/3 right-1/4 animate-pulse" style={{animationDelay: "1s"}}>
          <div className="h-96 w-96 bg-teal-400 rounded-full blur-3xl opacity-20" />
        </div>
        <div className="absolute top-2/3 left-1/3 animate-pulse" style={{animationDelay: "2s"}}>
          <div className="h-72 w-72 bg-pink-400 rounded-full blur-3xl opacity-20" />
        </div>
      </div>
      
      <div className="relative grid md:grid-cols-2 gap-8 max-w-4xl w-full mx-4">
        <div className="hidden md:flex flex-col justify-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl text-white">
          <div className="mb-8 space-y-4">
            <Database className="w-16 h-16 text-white" />
            <h2 className="text-3xl font-bold">Data Profiling Platform</h2>
            <p className="text-white/80">
              Advanced data quality assessment and profiling tools for your enterprise data needs
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-5 h-5" />
              <span>Comprehensive Data Analysis</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5" />
              <span>Enterprise-Grade Security</span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5" />
              <span>Protected Data Environment</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center mb-6">
            <BarChart2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-2xl font-bold ml-2 text-gray-800">Sigma DQ</h1>
          </div>
          
          <h2 className="text-center text-xl font-medium mb-6">
            Sign in to your account
          </h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-6">            
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </span>
              ) : (
                <>
                  <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                    </g>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">
              By signing in, you agree to our 
            </span>
            <a href="#" className="ml-1 text-blue-600 hover:text-blue-800 font-medium">
              Terms of Service
            </a>
            <span className="mx-1 text-gray-600">and</span>
            <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}