import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface AboutModalProps {
    onClose: () => void;
    text: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose, text }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#1a1a1a] w-full max-w-md p-8 rounded-3xl shadow-2xl border border-white/10"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <span className="text-sm font-bold tracking-widest uppercase border-b border-white/20 pb-1 text-white">关于我们</span>
                </div>

                <p className="text-gray-400 leading-relaxed text-[15px] mb-6 whitespace-pre-wrap">
                    {text || '暂无关于信息。'}
                </p>
            </motion.div>
        </div>
    );
};
