// --- Sheet Names ---
var SHEET_GROWTH = "growth_logs";
var SHEET_COORD = "trees_profile";
var SHEET_IMAGES = "plot_images";
var SHEET_USERS = "users";
var SHEET_SPACING = "spacing_logs";

var DEFAULT_ROLE = "pending";

// --- Entry Points ---
function doGet(e) {
  var sheetName = e && e.parameter ? e.parameter.sheet : null;
  if (sheetName) {
    return getSheetData(sheetName);
  }
  return responseJSON({ status: "ready" });
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    var data = JSON.parse(body);

    // รองรับทั้งแบบส่ง payload เป็น string และส่งตรงเป็น object
    var payload = data && data.payload
      ? (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload)
      : data;

    var action = payload.action;

    switch (action) {
      case "login":
        return loginUser(payload);

      case "register":
        return registerUser(payload);

      case "approveUser":
        return approveUser(payload);

      case "updateUser":
        return updateUser(payload);

      // backward-compat alias used by older frontend builds
      case "updateProfile":
        return updateUser(payload);

      case "getUser":
        return getUser(payload);

      case "addGrowthLog":
        return addGrowthLog(payload);

      case "addTreeProfile":
        return addTreeProfile(payload);

      case "deleteRow":
        return deleteRow(payload);

      case "uploadImage":
        return saveImageToSheet(payload);

      case "updateImage":
        return updateImageInSheet(payload);

      case "deleteImage":
        return deleteRow({ sheet: SHEET_IMAGES, key_col: "id", key_val: payload.id, delete_all: false });

      case "addSpacingLog":
        return addSpacingLog(payload);

      default:
        return responseJSON({ success: false, error: "Unknown action: " + action });
    }
  } catch (error) {
    return responseJSON({ success: false, error: error.toString() });
  }
}

function loginUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureUsersSheet_(ss);
  if (!sheet) return responseJSON({ success: false, error: "User sheet not found" });

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return responseJSON({ success: false, error: "User sheet is empty" });
  }

  var headers = values[0].map(function (h) { return String(h).trim(); });

  var headerIndex = {};
  headers.forEach(function (h, i) { headerIndex[h] = i; });

  function col_(name) {
    return headerIndex[name] !== undefined ? headerIndex[name] : -1;
  }

  var emailIdx       = col_("email");
  var fullnameIdx    = col_("fullname");
  var passwordIdx    = col_("password_hash");
  var approvedIdx    = col_("approved");
  var roleIdx        = col_("role");
  var positionIdx    = col_("position");
  var organizationIdx = col_("organization");

  if (emailIdx === -1 || passwordIdx === -1) {
    return responseJSON({
      success: false,
      error: "Required columns not found (need: email, password_hash)"
    });
  }

  var identifier = (data && (data.username || data.email)) ? String(data.username || data.email).trim() : "";
  var password   = data && data.password ? String(data.password) : "";

  if (!identifier || !password) {
    return responseJSON({ success: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" });
  }

  var passwordHashed = hashPassword(password);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowEmail = row[emailIdx] != null ? String(row[emailIdx]).trim() : "";
    if (!rowEmail) continue;

    if (rowEmail.toLowerCase() === identifier.toLowerCase()) {
      if (String(row[passwordIdx]) !== passwordHashed) {
        return responseJSON({ success: false, error: "รหัสผ่านไม่ถูกต้อง" });
      }

      if (approvedIdx !== -1) {
        var approved = row[approvedIdx];
        var ok = (approved === true) || (String(approved).toUpperCase() === "TRUE");
        if (!ok) return responseJSON({ success: false, error: "บัญชียังไม่ได้รับการอนุมัติ" });
      }

      return responseJSON({
        success: true,
        user: {
          username: rowEmail.split("@")[0],
          email: rowEmail,
          role: roleIdx !== -1 ? (row[roleIdx] || DEFAULT_ROLE) : DEFAULT_ROLE,
          fullName: fullnameIdx    !== -1 ? (row[fullnameIdx]    || "") : "",
          position: positionIdx    !== -1 ? (row[positionIdx]    || "") : "",
          affiliation: organizationIdx !== -1 ? (row[organizationIdx] || "") : ""
        }
      });
    }
  }

  return responseJSON({ success: false, error: "ไม่พบชื่อผู้ใช้" });
}

function registerUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureUsersSheet_(ss);

  var range  = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });

  var headerIndex = {};
  headers.forEach(function (h, i) { headerIndex[h] = i; });

  function colIndex_(names) {
    for (var i = 0; i < names.length; i++) {
      if (headerIndex[names[i]] !== undefined) return headerIndex[names[i]];
    }
    return -1;
  }

  var emailCol = colIndex_(["email"]);
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (emailCol !== -1 && data.email && String(row[emailCol]).toLowerCase() === String(data.email).toLowerCase()) {
      return responseJSON({ success: false, error: "อีเมลนี้ถูกใช้แล้ว" });
    }
  }

  var passwordHash = data.password_hash || (data.password ? hashPassword(data.password) : "");
  var createdAtISO = new Date().toISOString();
  var id = "USR_" + Date.now();

  var newRow = new Array(headers.length).fill("");

  function setIfExists_(names, value) {
    var idx = colIndex_(names);
    if (idx !== -1) newRow[idx] = value;
  }

  setIfExists_(["id"],                                        id);
  setIfExists_(["fullname"],                                  data.fullname || data.fullName || "");
  setIfExists_(["email"],                                     data.email || "");
  setIfExists_(["password_hash"],                             passwordHash);
  setIfExists_(["position"],                                  data.position || "");
  setIfExists_(["organization"],                              data.organization || data.affiliation || "");
  setIfExists_(["role"],                                      data.role || DEFAULT_ROLE);
  setIfExists_(["approved"],                                  false);
  setIfExists_(["created_at"],                                createdAtISO);

  sheet.appendRow(newRow);

  return responseJSON({ success: true });
}

// Fix: look up by email (the sheet has no "username" column), also set role if provided
function approveUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return responseJSON({ success: false, error: "User sheet not found" });

  var values  = sheet.getDataRange().getValues();
  var headers = values[0];
  var emailIdx    = headers.indexOf("email");
  var approvedIdx = headers.indexOf("approved");
  var roleIdx     = headers.indexOf("role");

  if (emailIdx === -1 || approvedIdx === -1) {
    return responseJSON({ success: false, error: "Required columns not found (need: email, approved)" });
  }

  // accept either 'email' or legacy 'username' key from the client
  var email = (data.email || data.username || "").toString().trim();
  if (!email) return responseJSON({ success: false, error: "Email is required" });

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][emailIdx]).toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, approvedIdx + 1).setValue(true);
      // optionally update role when approving (e.g. pending → researcher)
      if (roleIdx !== -1 && data.role) {
        sheet.getRange(i + 1, roleIdx + 1).setValue(data.role);
      }
      return responseJSON({ success: true, message: "อนุมัติบัญชีสำเร็จ" });
    }
  }
  return responseJSON({ success: false, error: "ไม่พบผู้ใช้" });
}

// Fix: use correct sheet column names (fullname / organization), add role & approved update
function updateUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return responseJSON({ success: false, error: "User sheet not found" });

  var values  = sheet.getDataRange().getValues();
  var headers = values[0];

  var emailIdx       = headers.indexOf("email");
  var fullnameIdx    = headers.indexOf("fullname");
  var positionIdx    = headers.indexOf("position");
  var organizationIdx = headers.indexOf("organization");
  var roleIdx        = headers.indexOf("role");
  var approvedIdx    = headers.indexOf("approved");

  // accept email or legacy username key
  var email = (data.email || data.username || "").toString().trim();
  if (!email) return responseJSON({ success: false, error: "Email is required" });

  for (var i = 1; i < values.length; i++) {
    if (emailIdx !== -1 && String(values[i][emailIdx]).toLowerCase() === email.toLowerCase()) {
      if (fullnameIdx !== -1 && (data.fullName !== undefined || data.fullname !== undefined)) {
        var fullnameValue = data.fullName !== undefined ? data.fullName : data.fullname;
        sheet.getRange(i + 1, fullnameIdx + 1).setValue(fullnameValue);
      }
      if (positionIdx !== -1 && data.position !== undefined) {
        sheet.getRange(i + 1, positionIdx + 1).setValue(data.position);
      }
      if (organizationIdx !== -1 && (data.affiliation !== undefined || data.organization !== undefined)) {
        var orgValue = data.affiliation !== undefined ? data.affiliation : data.organization;
        sheet.getRange(i + 1, organizationIdx + 1).setValue(orgValue);
      }
      if (roleIdx !== -1 && data.role !== undefined) {
        sheet.getRange(i + 1, roleIdx + 1).setValue(data.role);
      }
      if (approvedIdx !== -1 && data.approved !== undefined) {
        sheet.getRange(i + 1, approvedIdx + 1).setValue(data.approved);
      }
      return responseJSON({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
    }
  }
  return responseJSON({ success: false, error: "ไม่พบผู้ใช้" });
}

function getUser(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return responseJSON({ success: false, error: "User sheet not found" });

  var values  = sheet.getDataRange().getValues();
  var headers = values[0];
  var emailIdx    = headers.indexOf("email");

  var email = (data.email || data.username || "").toString().trim();

  for (var i = 1; i < values.length; i++) {
    if (emailIdx !== -1 && String(values[i][emailIdx]).toLowerCase() === email.toLowerCase()) {
      var userObj = {};
      headers.forEach(function (header, idx) {
        userObj[header] = values[i][idx];
      });
      return responseJSON({ success: true, user: userObj });
    }
  }
  return responseJSON({ success: false, error: "ไม่พบผู้ใช้" });
}

// --- Password Hash (SHA-256) ---
function hashPassword(password) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw
    .map(function (b) {
      var hex = (b < 0 ? b + 256 : b).toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    })
    .join("");
}

// --- Sheet Data ---
function getSheetData(sheetName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    if (sheetName === SHEET_IMAGES) return responseJSON({ success: true, data: [] });
    return responseJSON({ success: false, error: "Sheet not found: " + sheetName });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return responseJSON({ success: true, data: [] });

  var headers = data[0];
  var rows    = data.slice(1);

  var result = rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, i) {
      obj[header] = row[i];
    });
    return obj;
  });

  return responseJSON({ success: true, data: result });
}

// --- Growth Log ---
function addGrowthLog(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_GROWTH);
  if (!sheet) return responseJSON({ success: false, error: "Sheet not found: " + SHEET_GROWTH });

  var timestamp = new Date();
  var log_id    = data.log_id || "LOG_" + Date.now();

  if (data.log_id) {
    var values    = sheet.getDataRange().getValues();
    var header    = values[0];
    var logIdIndex = header.indexOf("log_id");

    for (var i = 1; i < values.length; i++) {
      if (values[i][logIdIndex] == data.log_id) {
        var rowData = [];
        header.forEach(function (key) {
          if (key === "timestamp") rowData.push(timestamp);
          else if (data[key] !== undefined) rowData.push(data[key]);
          else rowData.push(values[i][header.indexOf(key)]);
        });
        sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
        return responseJSON({ success: true, action: "updated" });
      }
    }
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow  = headers.map(function (header) {
    if (header === "timestamp") return timestamp;
    if (header === "log_id")    return log_id;
    return data[header] || "";
  });

  sheet.appendRow(newRow);
  return responseJSON({ success: true, action: "appended" });
}

// --- Tree Profile ---
function addTreeProfile(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_COORD);
  if (!sheet) return responseJSON({ success: false, error: "Sheet not found: " + SHEET_COORD });

  var values       = sheet.getDataRange().getValues();
  var treeCodeIndex = values[0].indexOf("tree_code");
  if (treeCodeIndex === -1) return responseJSON({ success: false, error: "Column not found: tree_code" });

  for (var i = 1; i < values.length; i++) {
    if (values[i][treeCodeIndex] == data.tree_code) {
      var headers = values[0];
      headers.forEach(function (h, colIdx) {
        if (data[h] !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data[h]);
      });
      return responseJSON({ success: true, action: "updated" });
    }
  }

  var headers2 = values[0];
  var newRow   = headers2.map(function (h) { return data[h] || ""; });
  sheet.appendRow(newRow);

  return responseJSON({ success: true, action: "appended" });
}

// --- Delete Row ---
function deleteRow(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheet);
  if (!sheet) return responseJSON({ success: false, error: "Sheet not found" });

  var headerRow = sheet.getDataRange().getValues()[0];
  var colIndex  = headerRow.indexOf(data.key_col);
  if (colIndex === -1) return responseJSON({ success: false, error: "Key column not found" });

  var values  = sheet.getDataRange().getValues();
  var deleted = false;

  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][colIndex] == data.key_val) {
      sheet.deleteRow(i + 1);
      deleted = true;
      if (!data.delete_all) break;
    }
  }

  return responseJSON({ success: deleted });
}

// --- Save Image ---
function saveImageToSheet(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_IMAGES);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_IMAGES);
    sheet.appendRow(["id", "plot_code", "image_type", "url", "description", "uploader", "date", "timestamp"]);
  }

  var timestamp = new Date();
  var id        = "IMG_" + Date.now();
  var imageUrl  = data.image_base64 || data.url;

  if (!imageUrl) {
    return responseJSON({ success: false, error: "No image URL provided" });
  }

  sheet.appendRow([id, data.plot_code, data.image_type, imageUrl, data.description, data.uploader, data.date, timestamp]);

  return responseJSON({ success: true, id: id, url: imageUrl });
}

// --- Update Image Description ---
function updateImageInSheet(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_IMAGES);
  if (!sheet) return responseJSON({ success: false, error: "Sheet not found" });

  var headerRow    = sheet.getDataRange().getValues()[0];
  var idColIndex   = headerRow.indexOf("id");
  var descColIndex = headerRow.indexOf("description");

  if (idColIndex === -1 || descColIndex === -1)
    return responseJSON({ success: false, error: "Column not found" });

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][idColIndex] === data.id) {
      sheet.getRange(i + 1, descColIndex + 1).setValue(data.description);
      return responseJSON({ success: true });
    }
  }
  return responseJSON({ success: false, error: "Image not found" });
}

// --- Spacing Log ---
function addSpacingLog(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SPACING);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SPACING);
    sheet.appendRow(["id", "plot_code", "avg_spacing", "min_spacing", "max_spacing", "tree_count", "note", "date", "timestamp"]);
  }

  var timestamp = new Date();
  var id        = "SPC_" + Date.now();

  sheet.appendRow([id, data.plot_code, data.avg_spacing, data.min_spacing, data.max_spacing, data.tree_count, data.note, data.date, timestamp]);

  return responseJSON({ success: true, id: id });
}

// --- Helper ---
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureUsersSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) sheet = ss.insertSheet(SHEET_USERS);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "fullname",
      "email",
      "password_hash",
      "position",
      "organization",
      "role",
      "approved",
      "created_at"
    ]);
  }

  return sheet;
}
