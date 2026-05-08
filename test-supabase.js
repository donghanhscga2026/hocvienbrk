const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testUpload() {
    console.log("Testing Supabase Storage Connection...");
    console.log("URL:", supabaseUrl);
    console.log("Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("❌ Missing Supabase credentials in .env");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const testBuffer = Buffer.from('test image content');
    const { data, error } = await supabase.storage
        .from('uploads')
        .upload('test.txt', testBuffer, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error("❌ Upload failed:", error.message);
        if (error.message.includes("not found")) {
            console.log("💡 Suggestion: Ensure you have created a bucket named 'uploads' in Supabase Storage.");
        } else if (error.message.includes("policy")) {
            console.log("💡 Suggestion: Ensure the 'uploads' bucket has public access policies for insertion.");
        }
    } else {
        console.log("✅ Upload successful!", data);
        const { data: publicUrl } = supabase.storage.from('uploads').getPublicUrl('test.txt');
        console.log("🔗 Public URL:", publicUrl.publicUrl);
    }
}

testUpload();
