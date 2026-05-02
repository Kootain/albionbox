import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

type Translations = Record<string, Record<Language, string>>;

const translations: Translations = {
  'app.title': { en: 'Albion Replay', zh: 'Albion 复盘' },
  'app.storageStatus': { en: 'Storage Status', zh: '存储状态' },
  'app.vodsCached': { en: 'VODs Cached', zh: '个本地缓存' },
  'app.uploadBtn': { en: 'Upload VOD', zh: '上传视频' },
  'app.localOnly': { en: 'Local IndexedDB Only', zh: '仅储存于本地 IndexedDB' },
  'dash.noRecords': { en: 'No Records', zh: '暂无记录' },
  'dash.uploadBegin': { en: 'Upload a VOD to begin your review.', zh: '请上传或者使用初始化的测试视频开始复盘。' },
  'dash.deleteConfirm': { en: 'Delete this record?', zh: '确认删除该记录？' },
  'dash.edit': { en: 'EDIT', zh: '编辑' },
  'dash.delete': { en: 'DEL', zh: '删除' },
  'edit.title': { en: 'Edit Video', zh: '编辑视频' },
  'edit.videoTitle': { en: 'Video Title', zh: '视频标题' },
  'dash.marks': { en: 'Comments', zh: '条评论' },
  'upload.title': { en: 'Upload VOD', zh: '上传游戏录像' },
  'upload.videoFile': { en: 'Video File', zh: '视频文件' },
  'upload.uploadFile': { en: 'Upload a file', zh: '点击选择文件' },
  'upload.dragDrop': { en: 'or drag and drop', zh: '或者直接拖拽到此处' },
  'upload.filesSelected': { en: '{count} files selected', zh: '已选择 {count} 个文件' },
  'upload.queueCompleted': { en: 'Upload Completed', zh: '全部上传完成' },
  'upload.queueUploading': { en: 'Uploading ({count} remaining)', zh: '上传中 (剩余 {count} 个)' },
  'upload.username': { en: 'Player ID', zh: '游戏 ID / 玩家名' },
  'upload.role': { en: 'Role', zh: '小队定位' },
  'upload.date': { en: 'Battle Date', zh: '战斗日期' },
  'upload.saving': { en: 'Saving...', zh: '保存中...' },
  'upload.uploading': { en: 'Uploading...', zh: '上传中...' },
  'upload.saveFallback': { en: 'Failed to save video. It might be too large for local caching.', zh: '保存失败。可能是因为存储配额不足。' },
  'upload.missingConfig': { en: 'Missing Volcengine configuration. Ensure VITE_VOLC_APP_ID and VITE_VOLC_SPACE_NAME are set in .env', zh: '缺少火山引擎配置，请确保已在 .env 中设置 VITE_VOLC_APP_ID 和 VITE_VOLC_SPACE_NAME' },
  'upload.confirmCancel': { en: 'Uploading in progress. Are you sure you want to cancel?', zh: '正在上传中，您确定要取消吗？' },
  'player.not_found': { en: 'Video play URL not found.', zh: '未找到视频播放地址。' },
  'player.newHighlight': { en: 'New Comment', zh: '新增评论' },
  'player.highlightAt': { en: 'Comment @ ', zh: '评论 @ ' },
  'player.play': { en: 'Play', zh: '播放' },
  'player.pause': { en: 'Pause', zh: '暂停' },
  'player.mute': { en: 'Mute', zh: '静音' },
  'player.vol': { en: 'Vol', zh: '音量' },
  'player.addHighlight': { en: '+ Add Comment (C)', zh: '+ 评论 (C)' },
  'player.fullScreen': { en: 'Full', zh: '全屏' },
  'player.placeholder': { en: 'Write your comment...', zh: '写下你的复盘分析内容...' },
  'player.saveHighlight': { en: 'Save Comment', zh: '保存评论' },
  'player.reply': { en: 'Reply', zh: '回复' },
  'player.close': { en: 'Close', zh: '关闭' },
  'player.syncTime': { en: 'UTC Align', zh: 'UTC 对齐' },
  'player.syncTitle': { en: 'Sync Albion Time (UTC)', zh: '校准服务器时间 (UTC)' },
  'player.syncDesc': { en: 'Set the UTC time of the current video frame.', zh: '将当前静止帧对齐到游戏内发生时的真实 UTC 时间。' },
  'player.syncSave': { en: 'Set Timeline', zh: '确认对准' },
  'player.realTime': { en: 'UTC', zh: '真实UTC' },
  'player.multiPov': { en: 'Multi-POV', zh: '其他视角' },
  'player.noOtherPov': { en: 'No other POV available', zh: '无其他视角' },
  'player.bindTimeFirst': { en: 'Please bind time first', zh: '请先绑定时间' },
  'player.deleteHighlight': { en: 'Are you sure you want to delete this comment?', zh: '您确定要删除此评论吗？' },
  'player.deleteComment': { en: 'Are you sure you want to delete this reply?', zh: '您确定要删除此回复吗？' },
  'player.deleteHighlightError': { en: 'Failed to delete comment.', zh: '删除评论失败。' },
  'player.deleteCommentError': { en: 'Failed to delete comment.', zh: '删除回复失败。' },
  'player.updateCommentError': { en: 'Failed to update comment.', zh: '更新回复失败。' },
  'player.syncError': { en: 'Failed to sync video time', zh: '校准时间失败' },
  'player.saveError': { en: 'Failed to save. Please try again.', zh: '保存失败，请重试。' },
  'player.cancel': { en: 'Cancel', zh: '取消' },
  'player.save': { en: 'Save', zh: '保存' },
  'role.dps': { en: 'DPS', zh: '输出 DPS' },
  'role.tank': { en: 'TANK', zh: '坦克 TANK' },
  'role.healer': { en: 'HEALER', zh: '治疗 HEALER' },
  'role.support': { en: 'SUPPORT', zh: '辅助 SUPPORT' },
  'bind.title': { en: 'Bind Your Account', zh: '绑定游戏账号' },
  'bind.desc': { en: 'Please bind your Albion Online character to continue using Replay.', zh: '请绑定您的阿尔比恩在线角色以继续使用复盘功能。' },
  'bind.server': { en: 'Select Server', zh: '选择服务器' },
  'bind.charName': { en: 'Character Name', zh: '角色名称' },
  'bind.search': { en: 'Search character...', zh: '搜索角色...' },
  'bind.noGuild': { en: 'No Guild', zh: '无公会' },
  'bind.btn': { en: 'Bind', zh: '绑定' },
  'bind.notFound': { en: 'No characters found', zh: '未找到相关角色' },
  'bind.minChars': { en: 'Type at least 2 characters', zh: '请至少输入2个字符' },
  'app.cancel': { en: 'Cancel', zh: '取消' },
};

interface LanguageContextProps {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('preferredLang') as Language) || 'zh';
  });

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'zh' : 'en';
      localStorage.setItem('preferredLang', next);
      return next;
    });
  };

  const t = (key: string) => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};