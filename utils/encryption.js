const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || "12345678901234567890123456789012", "utf8");

/**
 * Encrypt a message
 * @param {string} text - Plain text message
 * @returns {{ encryptedContent: string, iv: string }}
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encryptedContent: encrypted,
    iv: iv.toString("hex"),
  };
};

/**
 * Decrypt a message
 * @param {string} encryptedContent
 * @param {string} iv
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedContent, iv) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encryptedContent, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "[Message could not be decrypted]";
  }
};

module.exports = { encrypt, decrypt };