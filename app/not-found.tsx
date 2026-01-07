'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Random counter animation for fun
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="not-found-container">
      <div className="background-elements">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
        <div className="bg-circle circle-4"></div>
      </div>
      
      <div className="content">
        <div className="error-code">
          <span className="digit digit-1">4</span>
          <div className="zero-container">
            <div className="zero-circle">
              <div className="inner-circle"></div>
            </div>
            <span className="counter">{count}%</span>
          </div>
          <span className="digit digit-2">4</span>
        </div>
        
        <h1 className="title">Page Not Found</h1>
        
        <p className="description">
          Oops! The page you're looking for seems to have wandered off into the digital void. 
          It might have been moved, deleted, or never existed in the first place.
        </p>
        
        <div className="suggestions">
          <p className="suggestions-title">Here are some helpful links:</p>
          <div className="links">
            <Link href="/" className="link-button primary bg-slate-500/20 hover:bg-slate-500/30 transition px-4 py-2 rounded-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/>
              </svg>
              Back to Home
            </Link>
          
          </div>
        </div>
        
     
      </div>
      
   
      
      <style jsx>{`
        .not-found-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          position: relative;
          overflow: hidden;
        }
        
        .background-elements {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        
        .bg-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }
        
        .circle-1 {
          width: 300px;
          height: 300px;
          top: -100px;
          left: -100px;
          background: rgba(147, 112, 219, 0.1);
        }
        
        .circle-2 {
          width: 200px;
          height: 200px;
          bottom: -50px;
          right: -50px;
          background: rgba(255, 182, 193, 0.1);
        }
        
        .circle-3 {
          width: 150px;
          height: 150px;
          top: 30%;
          right: 10%;
          background: rgba(100, 149, 237, 0.1);
        }
        
        .circle-4 {
          width: 100px;
          height: 100px;
          bottom: 20%;
          left: 10%;
          background: rgba(60, 179, 113, 0.1);
        }
        
        .content {
          max-width: 800px;
          text-align: center;
          z-index: 1;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          padding: 3rem;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: fadeIn 0.8s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .error-code {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2rem;
          position: relative;
        }
        
        .digit {
          font-size: 10rem;
          font-weight: 800;
          color: #4f46e5;
          text-shadow: 4px 4px 0px rgba(79, 70, 229, 0.2);
          animation: float 3s ease-in-out infinite;
        }
        
        .digit-1 {
          animation-delay: 0.1s;
        }
        
        .digit-2 {
          animation-delay: 0.2s;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .zero-container {
          position: relative;
          margin: 0 2rem;
        }
        
        .zero-circle {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 10px 30px rgba(79, 70, 229, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .inner-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: white;
        }
        
        .counter {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.8rem;
          font-weight: 700;
          color: #4f46e5;
        }
        
        .title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
        }
        
        .description {
          font-size: 1.2rem;
          color: #6b7280;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto 2.5rem;
        }
        
        .suggestions {
          background: #f8fafc;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid #e5e7eb;
        }
        
        .suggestions-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 1rem;
        }
        
        .links {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .link-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
        }
        
        .link-button.primary {
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }
        
        .link-button.primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }
        
        .link-button.secondary {
          background: white;
          color: #4f46e5;
          border: 2px solid #e5e7eb;
        }
        
        .link-button.secondary:hover {
          border-color: #4f46e5;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .search-section {
          margin-bottom: 2rem;
        }
        
        .search-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 1rem;
        }
        
        .search-bar {
          display: flex;
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 0.5rem;
          border: 2px solid #e5e7eb;
          transition: border-color 0.3s;
        }
        
        .search-bar:focus-within {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        
        .search-bar svg {
          margin: 0.75rem;
        }
        
        .search-bar input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 1rem;
          padding: 0.5rem;
          background: transparent;
        }
        
        .search-button {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .search-button:hover {
          background: #4338ca;
        }
        
        .footer-note {
          margin-top: 2rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.9rem;
          z-index: 1;
        }
        
        .footer-note a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }
        
        .footer-note a:hover {
          text-decoration: underline;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .content {
            padding: 2rem 1.5rem;
            margin: 1rem;
          }
          
          .digit {
            font-size: 7rem;
          }
          
          .zero-circle {
            width: 140px;
            height: 140px;
          }
          
          .inner-circle {
            width: 90px;
            height: 90px;
          }
          
          .title {
            font-size: 2rem;
          }
          
          .description {
            font-size: 1.1rem;
          }
          
          .links {
            flex-direction: column;
            align-items: center;
          }
          
          .link-button {
            width: 100%;
            max-width: 300px;
          }
        }
        
        @media (max-width: 480px) {
          .digit {
            font-size: 5rem;
          }
          
          .zero-circle {
            width: 100px;
            height: 100px;
          }
          
          .inner-circle {
            width: 60px;
            height: 60px;
          }
          
          .counter {
            font-size: 1.3rem;
          }
          
          .error-code {
            margin-bottom: 1.5rem;
          }
          
          .title {
            font-size: 1.75rem;
          }
          
          .description {
            font-size: 1rem;
          }
          
          .search-bar {
            flex-direction: column;
            background: transparent;
            border: none;
            gap: 1rem;
          }
          
          .search-bar input {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 0.875rem;
            width: 100%;
          }
          
          .search-button {
            width: 100%;
            padding: 0.875rem;
          }
        }
      `}</style>
    </main>
  );
}