import React, { useState, useEffect } from 'react';
import { Save, Loader2, Info, Mail } from 'lucide-react';
import { SiteSettings } from '../types';
import { supabase } from '../utils/supabaseClient';

interface AdminSettingsProps {
    settings: SiteSettings | null;
    onUpdate: (newSettings: SiteSettings) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdate }) => {
    const [aboutText, setAboutText] = useState('');
    const [contactText, setContactText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (settings) {
            setAboutText(settings.about_text);
            setContactText(settings.contact_text);
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .upsert({ id: 1, about_text: aboutText, contact_text: contactText })
                .select()
                .single();

            if (error) throw error;

            onUpdate(data);
            setMessage({ type: 'success', text: '保存成功！' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setMessage({ type: 'error', text: '保存失败：' + err.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    保存设置
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-8">

                {/* About Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg border-b pb-2">
                        <Info size={20} className="text-gray-400" />
                        <h3>关于我们 (About)</h3>
                    </div>
                    <p className="text-sm text-gray-500">这段文字将显示在前台点击“关于”时弹出的窗口中。支持换行。</p>
                    <textarea
                        value={aboutText}
                        onChange={(e) => setAboutText(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors resize-y"
                        placeholder="请输入公司介绍、愿景等信息..."
                    />
                </div>

                {/* Contact Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg border-b pb-2">
                        <Mail size={20} className="text-gray-400" />
                        <h3>联系方式 (Contact)</h3>
                    </div>
                    <p className="text-sm text-gray-500">这段文字将显示在前台点击“联系”时弹出的窗口中。支持换行。</p>
                    <textarea
                        value={contactText}
                        onChange={(e) => setContactText(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors resize-y"
                        placeholder="请输入邮箱、电话、地址等联系方式..."
                    />
                </div>

            </div>
        </div>
    );
};
