'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/app/lib/utils';

interface SpotlightProps {
  children?: React.ReactNode;
  className?: string;
  fill?: string;
}

export function Spotlight({
  children,
  className = '',
  fill = 'white',
}: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!divRef.current) return;

    // Set initial size based on parent element
    const { width, height } = divRef.current.getBoundingClientRect();
    const largerDimension = Math.max(width, height);
    setSize(largerDimension * 2); // Make the spotlight 2 times larger than the parent
    
    // Set initial position to center
    setPosition({ x: width / 2, y: height / 2 });
    
    // Fade in the spotlight
    setTimeout(() => {
      setOpacity(0.9);
    }, 100);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!divRef.current) return;
      
      const div = divRef.current;
      const rect = div.getBoundingClientRect();
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setPosition({ x, y });
    };
    
    const handleMouseEnter = () => {
      setOpacity(1);
    };
    
    const handleMouseLeave = () => {
      if (!divRef.current) return;
      
      const { width, height } = divRef.current.getBoundingClientRect();
      
      // Return to center position with reduced opacity
      setPosition({ x: width / 2, y: height / 2 });
      setOpacity(0.9);
    };
    
    const element = divRef.current;
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <motion.div
      ref={divRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: 'transparent',
        opacity: 1,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute -inset-20 opacity-0"
        style={{
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${fill} 0%, rgba(120, 120, 240, 0.3) 35%, transparent 70%)`,
          opacity,
          width: size,
          height: size,
          left: position.x - size / 2,
          top: position.y - size / 2,
        }}
        transition={{ type: "spring", damping: 15, stiffness: 150 }}
      />
      {children}
    </motion.div>
  );
} 