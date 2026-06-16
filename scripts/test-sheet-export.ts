import { google } from "googleapis";

async function main() {
  const keyJson = process.env.GOOGLE_SHEETS_SERVICE_KEY;
  if (!keyJson) {
    console.error("❌ GOOGLE_SHEETS_SERVICE_KEY not set");
    process.exit(1);
  }

  let key: any;
  try {
    key = JSON.parse(keyJson);
  } catch {
    console.error("❌ Cannot parse GOOGLE_SHEETS_SERVICE_KEY JSON");
    process.exit(1);
  }

  console.log("=== Testing Service Account Auth ===");
  console.log("Client Email:", key.client_email);
  console.log("Project ID:", key.project_id);

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  try {
    const tokens = await auth.authorize();
    console.log("✅ Auth successful, token type:", tokens.token_type);
  } catch (e: any) {
    console.error("❌ Auth failed:", e.message);
    process.exit(1);
  }

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const folderId = process.env.GOOGLE_SHEETS_FOLDER_ID;
  console.log("\n=== GOOGLE_SHEETS_FOLDER_ID ===", folderId || "(not set)");

  // Test 1: Check Drive quota
  console.log("\n=== Test 1: Drive about.get (quota) ===");
  try {
    const about = await drive.about.get({ fields: "storageQuota" });
    const q = about.data.storageQuota;
    console.log("Storage Quota:");
    console.log("  Limit:", q?.limit ? `${(Number(q.limit) / 1024 / 1024).toFixed(2)} MB` : "N/A");
    console.log("  Usage:", q?.usage ? `${(Number(q.usage) / 1024 / 1024).toFixed(2)} MB` : "N/A");
    console.log("  UsageInDrive:", q?.usageInDrive ? `${(Number(q.usageInDrive) / 1024 / 1024).toFixed(2)} MB` : "N/A");
  } catch (e: any) {
    console.error("❌ drive.about.get failed:", e.message, JSON.stringify(e.response?.data?.error || {}));
  }

  // Test 1b: List Drive files
  console.log("\n=== Test 1b: Drive files.list ===");
  try {
    const res = await drive.files.list({
      q: "trashed=false",
      fields: "files(id, name, size, mimeType, parents)",
      pageSize: 10,
    });
    console.log(`Found ${res.data.files?.length || 0} files`);
    for (const f of res.data.files || []) {
      console.log(`  - ${f.name} (${f.mimeType}) size=${f.size || 0} parent=${f.parents?.[0] || 'root'}`);
    }
  } catch (e: any) {
    console.error("❌ drive.files.list failed:", e.message, JSON.stringify(e.response?.data?.error || {}));
  }

  // Test 1c: Check folder access
  console.log("\n=== Test 1c: Check shared folder access ===");
  if (folderId) {
    try {
      const folder = await drive.files.get({ fileId: folderId, fields: "id, name, owners, mimeType" });
      console.log("Folder:", folder.data.name, "type:", folder.data.mimeType);
      console.log("Owners:", JSON.stringify(folder.data.owners?.map((o: any) => o.emailAddress)));
    } catch (e: any) {
      console.error("❌ Cannot access folder:", e.message, JSON.stringify(e.response?.data?.error || {}));
    }
  }

  // Test 2: Try sheets.spreadsheets.create
  console.log("\n=== Test 2: sheets.spreadsheets.create ===");
  try {
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `[TEST] Export Test - ${Date.now()}` },
      },
    });
    const ssId = res.data.spreadsheetId;
    console.log(`✅ Created via Sheets API: ${ssId}`);

    // Try sharing
    await drive.permissions.create({
      fileId: ssId!,
      requestBody: { type: "user", role: "writer", emailAddress: "hocvienbrk@gmail.com" },
    });
    console.log("✅ Shared with hocvienbrk@gmail.com");

    // Write data
    await sheets.spreadsheets.values.update({
      spreadsheetId: ssId!,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [["STT", "Name"], ["1", "Test"]] },
    });
    console.log("✅ Data written");

    console.log(`🔗 https://docs.google.com/spreadsheets/d/${ssId}`);
    process.exit(0);
  } catch (e: any) {
    console.error("❌ sheets.spreadsheets.create failed:", e.message);
    const detail = e.response?.data?.error;
    if (detail) console.error("   Detail:", JSON.stringify(detail, null, 2));
  }

  // Test 3: Try drive.files.create
  console.log("\n=== Test 3: drive.files.create ===");
  try {
    const body: any = {
      name: `[TEST] Export Test - ${Date.now()}`,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };
    if (folderId) {
      body.parents = [folderId];
      console.log("Using parent folder:", folderId);
    }
    const res = await drive.files.create({ requestBody: body });
    const ssId = res.data.id;
    console.log(`✅ Created via Drive API: ${ssId}`);

    // Try sharing
    await drive.permissions.create({
      fileId: ssId!,
      requestBody: { type: "user", role: "writer", emailAddress: "hocvienbrk@gmail.com" },
    });
    console.log("✅ Shared with hocvienbrk@gmail.com");

    console.log(`🔗 https://docs.google.com/spreadsheets/d/${ssId}`);
  } catch (e: any) {
    console.error("❌ drive.files.create failed:", e.message);
    const detail = e.response?.data?.error;
    if (detail) console.error("   Detail:", JSON.stringify(detail, null, 2));
  }

  console.log("\n=== All tests completed ===");
}

main().catch(console.error);
