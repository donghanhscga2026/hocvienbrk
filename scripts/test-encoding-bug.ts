import { Buffer } from "buffer";

function testEncoding() {
  const fromName = 'Học Viện BRK';
  const subject = '🎥 Bài học mới vừa được cập nhật!';

  const encodeHeader = (str: string) => {
    if (!str) return "";
    const cleanStr = str.replace(/[\r\n]/g, " ").trim();
    
    // Sử dụng Array.from để tách chuỗi an toàn, không làm vỡ các ký tự Emoji (surrogate pairs)
    const chars = Array.from(cleanStr);
    const CHUNK_SIZE = 15; // 15 ký tự (khoảng 15-60 bytes), sau khi base64 sẽ luôn an toàn dưới 75 ký tự của RFC 2047
    const chunks = [];
    
    for (let i = 0; i < chars.length; i += CHUNK_SIZE) {
      const chunkStr = chars.slice(i, i + CHUNK_SIZE).join('');
      const base64 = Buffer.from(chunkStr, "utf-8").toString("base64");
      chunks.push(`=?utf-8?B?${base64}?=`);
    }
    
    // Các khối encoded-word phải được nối với nhau bằng dấu CRLF và Space (hoặc chỉ Space nếu trên cùng một dòng)
    return chunks.join("\r\n ");
  };

  console.log("FROM NAME ENCODED:");
  console.log(encodeHeader(fromName));

  console.log("SUBJECT ENCODED:");
  console.log(encodeHeader(subject));

  // Build raw MIME message theo chuẩn RFC 2822
  const messageParts = [
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Content-Transfer-Encoding: base64`,
    `From: ${encodeHeader(fromName)} <sender@test.com>`,
    `To: to@test.com`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    ``,
    Buffer.from("Nội dung HTML", 'utf-8').toString("base64"),
  ];

  const rawMessage = messageParts.join('\r\n');
  console.log("RAW MESSAGE:\n", rawMessage);

  const encodedMessage = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  console.log("FINAL GMAIL PAYLOAD:\n", encodedMessage);
}

testEncoding();
