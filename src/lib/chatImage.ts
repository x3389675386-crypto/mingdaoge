/**
 * 私聊图片上传
 * 复用 ForumPage 的逻辑：Supabase 配置时上传到 images 桶取公开 URL，
 * 未配置时退化为 FileReader 转 base64（仅本机可见）。
 */
import { supabase, isSupabaseConfigured } from './supabase';

/** 上传聊天图片，返回可访问的 URL 字符串 */
export async function uploadChatImage(file: File): Promise<string> {
  if (isSupabaseConfigured) {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);
    if (uploadError) {
      throw new Error(`图片上传失败：${uploadError.message}`);
    }
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // 本地降级：FileReader 转 base64
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}
