import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';

interface MagneticButtonProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    intensity?: number;
    title?: string;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
    children,
    onClick,
    className = '',
    intensity = 0.5,
    title
}) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Use springs for smooth physics-based animation
    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const x = useSpring(0, springConfig);
    const y = useSpring(0, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();

        // Calculate center of the element
        const xCenter = left + width / 2;
        const yCenter = top + height / 2;

        // Calculate relative distance from center
        const xMove = (clientX - xCenter) * intensity;
        const yMove = (clientY - yCenter) * intensity;

        x.set(xMove);
        y.set(yMove);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    // Clean up springs on unmount
    useEffect(() => {
        return () => {
            x.destroy();
            y.destroy();
        };
    }, [x, y]);

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={className}
            title={title}
            style={{ x, y }}
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* We also optionally animate the inner children slightly more for a parallax effect */}
            <motion.div style={{ x: useSpring(x.get() * 0.5, springConfig), y: useSpring(y.get() * 0.5, springConfig) }}>
                {children}
            </motion.div>
        </motion.button>
    );
};
