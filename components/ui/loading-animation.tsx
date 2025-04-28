import React from "react";

export function LoadingAnimation({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black z-50">
      {/* Background animation elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Moving gradient orbs */}
        <div className="absolute top-1/4 left-1/4 h-[40vh] w-[40vh] rounded-full bg-purple-600/20 blur-[80px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/3 h-[35vh] w-[35vh] rounded-full bg-cyan-500/20 blur-[80px] animate-float-delay"></div>
        <div className="absolute top-1/3 right-1/4 h-[30vh] w-[30vh] rounded-full bg-pink-500/20 blur-[80px] animate-float-reverse"></div>
        <div className="absolute bottom-1/3 left-1/3 h-[45vh] w-[45vh] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse-slow"></div>
        
        {/* Particles */}
        <div className="particle-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-80"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`
              }}
            />
          ))}
        </div>
        
        {/* Light rays */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 animate-spin-slow [animation-duration:40s]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 h-[100vh] w-[1px] bg-gradient-to-b from-transparent via-blue-400/30 to-transparent"
                style={{
                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main animation */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Enhanced 3D sphere with holographic effects */}
        <div className="relative w-64 h-64">
          {/* Outer energy field */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-xl animate-pulse-soft [animation-duration:4s]"></div>
          
          {/* Multiple rotating rings with dynamic effects */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i}
              className={`absolute rounded-full border-t-2 border-l-[1px] border-r-[1px] ${
                ['border-blue-500/60', 'border-purple-500/60', 'border-cyan-500/60', 'border-pink-500/60', 'border-indigo-500/60'][i % 5]
              } ${i % 2 === 0 ? 'animate-spin-slow' : 'animate-spin-reverse-slow'}`}
              style={{
                inset: `${i * 6}px`,
                animationDuration: `${12 + i * 2}s`,
                transform: `rotate(${i * 15}deg)`,
                boxShadow: `0 0 15px ${['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'][i % 5]}40`
              }}
            ></div>
          ))}
          
          {/* Inner energy orb */}
          <div className="absolute inset-[30px] rounded-full overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.4)]">
            {/* Animated plasma core */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-spin-slow [animation-duration:15s]"></div>
            
            {/* Holographic overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_40%)] animate-spin-reverse-slow [animation-duration:20s]"></div>
            
            {/* Energy fluctuations */}
            <div className="absolute inset-0 opacity-70">
              <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent animate-ping-slow [animation-duration:2.5s]"></div>
            </div>
            
            {/* Electric pulses */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i}
                className="absolute w-full h-[1px] bg-white/60 blur-[1px]"
                style={{
                  top: '50%',
                  left: 0,
                  transform: `rotate(${i * 45}deg)`,
                  animation: `pulse-soft 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.25}s`
                }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Enhanced loading text with animated highlights */}
        <div className="mt-16 text-center relative">
          {/* Text highlight glow */}
          <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-500/0 via-purple-500/10 to-pink-500/0 animate-gradient-x"></div>
          
          {/* Main text */}
          <p className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 [background-size:200%_auto] animate-gradient-x [animation-duration:3s]">
            {message}
          </p>
          
          {/* Animated highlighting underline */}
          <div className="h-[2px] w-full mt-2 bg-gradient-to-r from-blue-500/0 via-purple-500/50 to-blue-500/0 animate-gradient-x [animation-duration:2s]"></div>
          
          {/* Enhanced animated indicators */}
          <div className="mt-6 flex justify-center items-center gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative">
                {/* Glow effect */}
                <div 
                  className={`absolute inset-0 rounded-full blur-md ${
                    ['bg-blue-500/50', 'bg-purple-500/50', 'bg-pink-500/50', 'bg-cyan-500/50', 'bg-indigo-500/50'][i % 5]
                  } animate-pulse [animation-duration:1.5s]`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
                
                {/* Main dot */}
                <div 
                  className={`relative w-2 h-2 rounded-full ${
                    ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500'][i % 5]
                  } animate-pulse-soft`}
                  style={{ 
                    animationDelay: `${i * 0.15}s`,
                    boxShadow: `0 0 10px ${['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'][i % 5]}`
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 