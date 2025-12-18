import { supabase } from '../config/supabase';

export const getUploadUrl = async (userId: string, fileName: string) => {
    const filePath = `${userId}/${Date.now()}_${fileName}`;
    const { data, error } = await supabase
        .storage
        .from('photos')
        .createSignedUploadUrl(filePath);

    if (error) throw error;
    return { ...data, filePath };
};

export const getDownloadUrl = async (filePath: string) => {
    const { data } = supabase
        .storage
        .from('photos')
        .getPublicUrl(filePath); // Using public URL for now, change to createSignedUrl if bucket is private

    return data.publicUrl;
};
