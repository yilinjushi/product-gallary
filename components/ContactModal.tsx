import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ContactModalProps {
    onClose: () => void;
    text: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, text }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <span className="text-sm font-bold tracking-widest uppercase border-b border-black pb-1">联系我们</span>
                </div>

                <p className="text-gray-500 leading-relaxed text-[15px] mb-2 whitespace-pre-wrap">
                    {text || '暂无联系信息。'}
                </p>
            </motion.div>
        </div>
    );
};
