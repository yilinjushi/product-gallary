import React, { useState, useEffect, useRef } from 'react';
import {
    HardDriveDownload,
    Upload,
    Trash2,
    RotateCcw,
    Plus,
    Loader2,
    Download,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';

interface BackupRecord {
    id: number;
    label: string;
    record_count: number;
    created_at: string;
}

export const AdminBackup: React.FC = () => {
    const [backups, setBackups] = useState<BackupRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isRestoring, setIsRestoring] = useState<number | 'upload' | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [label, setLabel] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getToken = () => localStorage.getItem('adminToken') || '';

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    // --- Fetch backup list ---
    const fetchBackups = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin-backup?action=list', {
                headers: { 'x-admin-token': getToken() },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setBackups(data.backups || []);
        } catch (err: any) {
            showMessage('error', '加载备份列表失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    // --- Create backup ---
    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const res = await fetch('/api/admin-backup?action=create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getToken(),
                },
                body: JSON.stringify({ label }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showMessage('success', `备份成功！共 ${data.record_count} 个产品`);
            setLabel('');
            fetchBackups();
        } catch (err: any) {
            showMessage('error', '备份失败: ' + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    // --- Download backup JSON ---
    const handleDownload = async (id?: number) => {
        try {
            const url = id
                ? `/api/admin-backup?action=download&id=${id}`
                : '/api/admin-backup?action=download';
            const res = await fetch(url, {
                headers: { 'x-admin-token': getToken() },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const date = new Date().toISOString().slice(0, 10);
            a.download = `backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            showMessage('success', '下载成功');
        } catch (err: any) {
            showMessage('error', '下载失败: ' + err.message);
        }
    };

    // --- Delete backup ---
    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这条备份吗？')) return;
        setIsDeleting(id);
        try {
            const res = await fetch('/api/admin-backup?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getToken(),
                },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showMessage('success', '已删除');
            fetchBackups();
        } catch (err: any) {
            showMessage('error', '删除失败: ' + err.message);
        } finally {
            setIsDeleting(null);
        }
    };

    // --- Restore from backup record ---
    const handleRestore = async (backupId: number) => {
        if (!confirm('确定要恢复到此备份吗？\n\n系统会在恢复前自动创建一个安全快照，以便回退。')) return;
        setIsRestoring(backupId);
        try {
            const res = await fetch('/api/admin-restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getToken(),
                },
                body: JSON.stringify({ backupId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showMessage('success', `恢复成功！共恢复 ${data.restored_count} 个产品`);
            fetchBackups();
        } catch (err: any) {
            showMessage('error', '恢复失败: ' + err.message);
        } finally {
            setIsRestoring(null);
        }
    };

    // --- Restore from uploaded file ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsRestoring('upload');
        try {
            const text = await file.text();
            let uploadedData;
            try {
                uploadedData = JSON.parse(text);
            } catch {
                throw new Error('文件不是有效的 JSON 格式');
            }

            if (!uploadedData.products || !Array.isArray(uploadedData.products)) {
                throw new Error('JSON 数据缺少 products 字段');
            }

            if (!confirm(`确认上传恢复？文件包含 ${uploadedData.products.length} 个产品。\n\n系统会在恢复前自动创建一个安全快照。`)) {
                setIsRestoring(null);
                return;
            }

            const res = await fetch('/api/admin-restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getToken(),
                },
                body: JSON.stringify({ uploadedData }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showMessage('success', `恢复成功！共恢复 ${data.restored_count} 个产品`);
            fetchBackups();
        } catch (err: any) {
            showMessage('error', '上传恢复失败: ' + err.message);
        } finally {
            setIsRestoring(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">备份与恢复</h2>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-2 p-4 rounded-xl mb-4 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Create Backup Card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg border-b pb-2">
                    <Plus size={20} className="text-gray-400" />
                    <h3>创建备份</h3>
                </div>
                <p className="text-sm text-gray-500">
                    将当前所有产品数据和站点设置保存为一个快照。快照仅保存文字和图片链接，不包含实际图片文件。
                </p>
                <div className="flex gap-3">
                    <input
                        type="text"
                        id="backup-label-input"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="备份标签（可选，如'上线前'）"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors text-sm"
                    />
                    <button
                        id="create-backup-btn"
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {isCreating ? <Loader2 size={18} className="animate-spin" /> : <HardDriveDownload size={18} />}
                        立即备份
                    </button>
                </div>
            </div>

            {/* Download & Upload Card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg border-b pb-2">
                    <ShieldCheck size={20} className="text-gray-400" />
                    <h3>本地备份</h3>
                </div>
                <p className="text-sm text-gray-500">
                    下载当前数据到本地电脑作为终极保险，或上传之前下载的 JSON 文件来恢复数据。
                </p>
                <div className="flex flex-wrap gap-3">
                    <button
                        id="download-current-btn"
                        onClick={() => handleDownload()}
                        className="flex items-center gap-2 bg-gray-100 text-gray-800 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                        <Download size={18} />
                        下载当前数据
                    </button>
                    <label
                        id="upload-restore-label"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors text-sm cursor-pointer ${isRestoring === 'upload'
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            }`}
                    >
                        {isRestoring === 'upload'
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Upload size={18} />
                        }
                        上传恢复
                        <input
                            ref={fileInputRef}
                            id="upload-restore-input"
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            disabled={isRestoring === 'upload'}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Backup History Card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg border-b pb-2">
                    <RotateCcw size={20} className="text-gray-400" />
                    <h3>历史备份</h3>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-gray-300" />
                    </div>
                ) : backups.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        暂无备份记录，点击上方"立即备份"按钮创建第一个备份
                    </div>
                ) : (
                    <div className="space-y-3">
                        {backups.map((b) => (
                            <div
                                key={b.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 text-sm truncate">{b.label}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {formatDate(b.created_at)} · {b.record_count} 个产品
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleDownload(b.id)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="下载"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleRestore(b.id)}
                                        disabled={isRestoring === b.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                        {isRestoring === b.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                        恢复
                                    </button>
                                    <button
                                        onClick={() => handleDelete(b.id)}
                                        disabled={isDeleting === b.id}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="删除"
                                    >
                                        {isDeleting === b.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
