import { Shield, Bell, Lock, Eye, Globe, Save, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{t('settings.title')}</h1>
        <p className="text-slate-500 font-bold mt-1 text-xs uppercase tracking-widest">{t('settings.desc')}</p>
      </header>

      <div className="space-y-6">
        <section className="bg-black-card border border-black-border rounded-2xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('settings.general')}</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-black-bg rounded-xl border border-black-border">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">{t('settings.language')}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Select your preferred interface language.</p>
              </div>
              <select className="bg-black-card border border-black-border rounded-lg px-4 py-2 text-white text-xs font-black uppercase tracking-widest focus:ring-1 focus:ring-gold outline-none">
                <option value="zh">中文 (Chinese)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-black-bg rounded-xl border border-black-border">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">{t('settings.timezone')}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Used for battle log timestamps.</p>
              </div>
              <select className="bg-black-card border border-black-border rounded-lg px-4 py-2 text-white text-xs font-black uppercase tracking-widest focus:ring-1 focus:ring-gold outline-none">
                <option value="UTC">UTC</option>
                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-black-card border border-black-border rounded-2xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('settings.notifications')}</h2>
          </div>

          <div className="space-y-4">
            {[
              { id: 'regear_status', title: 'Regear Status Updates', desc: 'Notify when your regear request is approved or rejected.' },
              { id: 'new_session', title: 'New Regear Sessions', desc: 'Notify when a new guild regear session is created.' },
              { id: 'guild_announcement', title: 'Guild Announcements', desc: 'Important updates from your guild administrators.' }
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-black-bg rounded-xl border border-black-border">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">{item.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-black-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black peer-checked:after:border-black"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-black-card border border-black-border rounded-2xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('settings.privacy')}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black-bg rounded-xl border border-black-border">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Public Profile</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Allow other guild members to see your linked characters.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-black-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:after:bg-black peer-checked:after:border-black"></div>
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gold hover:bg-gold-hover text-black font-black py-3 px-10 rounded-xl shadow-lg shadow-gold/10 transition-all active:scale-[0.98] flex items-center gap-2 uppercase tracking-widest text-sm"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
