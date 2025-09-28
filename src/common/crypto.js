
const reallyreallysecretkey = "b4c56bf03d77024cd2d4da09c6ed1a24";

export const cryptoUtils = {
    encryptData: async (data) => {
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

        // Import key
        const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(reallyreallysecretkey),
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );

        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(JSON.stringify(data))
        );

        // Return iv + ciphertext as base64
        return {
            iv: btoa(String.fromCharCode(...iv)),
            data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        };
    },

    decryptData: async (encryptedObj) => {
        const enc = new TextEncoder();
        const dec = new TextDecoder();

        const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(encryptedObj.data), c => c.charCodeAt(0));

        // Import key
        const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(reallyreallysecretkey),
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );

        return JSON.parse(dec.decode(decrypted));
    }
}