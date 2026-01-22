/**
 * RFS Scenario Tracking - Google Apps Script
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Go to https://script.google.com and create a new project
 * 2. Go to https://sheets.google.com and create a new spreadsheet
 * 3. Copy the SHEET ID from the URL (the long string between /d/ and /edit)
 * 4. Paste the Sheet ID below where it says YOUR_SHEET_ID_HERE
 * 5. In your spreadsheet, add these headers in row 1:
 *    A: Timestamp | B: Date | C: SessionID | D: Round | E: OptionA_ID | F: OptionA_Text | G: OptionB_ID | H: OptionB_Text | I: Chosen | J: ChosenScenarioID | K: Language
 * 
 * 6. In Apps Script: Click the disk icon to save (or Ctrl+S)
 * 7. Click "Deploy" > "New deployment"
 * 8. Click the gear icon next to "Select type" and choose "Web app"
 * 9. Set:
 *    - Description: "RFS Tracking API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 10. Click "Deploy"
 * 11. Click "Authorize access" and follow the prompts
 * 12. Copy the Web App URL (looks like https://script.google.com/macros/s/XXXXX/exec)
 * 13. Paste this URL in your index.html file where it says:
 *     const GOOGLE_SHEETS_API_URL = '';
 */

// ⚠️ PASTE YOUR GOOGLE SHEET ID HERE (from the spreadsheet URL)
const SHEET_ID = '1I6GKSEVKUAtBEar5_FJSfg0P3mxJ25XDxLN2NobTpYo';

// Get the spreadsheet by ID
function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
}

// Handle POST requests (receiving tracking data)
function doPost(e) {
  try {
    const sheet = getSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Append row with tracking data
    sheet.appendRow([
      data.timestamp,
      data.date,
      data.sessionId,
      data.round,
      data.optionA_id,
      data.optionA_textDE,
      data.optionB_id,
      data.optionB_textDE,
      data.chosen,
      data.chosenScenarioId,
      data.language
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (fetching top scenarios)
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback; // For JSONP support
    
    let responseData;
    
    if (action === 'getTop') {
      responseData = getTopScenariosData();
    } else {
      responseData = { status: 'ok', message: 'RFS Tracking API' };
    }
    
    // If callback parameter exists, return JSONP
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(responseData) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // Otherwise return regular JSON
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorResponse = { success: false, error: error.toString() };
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get today's date as YYYY-MM-DD string
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get top selected scenarios for TODAY only (returns data object)
function getTopScenariosData() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const todayStr = getTodayString();
  
  // Skip header row, count scenario selections from TODAY only
  const counts = {};
  let todaySelections = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let rowDate = row[1]; // Column B (Date)
    const chosenScenarioId = row[9]; // Column J (0-indexed = 9)
    
    // Convert date to string and trim, handle Date objects too
    if (rowDate instanceof Date) {
      const y = rowDate.getFullYear();
      const m = String(rowDate.getMonth() + 1).padStart(2, '0');
      const d = String(rowDate.getDate()).padStart(2, '0');
      rowDate = `${y}-${m}-${d}`;
    } else {
      rowDate = String(rowDate).trim().substring(0, 10); // Take first 10 chars (YYYY-MM-DD)
    }
    
    // Only count if date matches today
    if (rowDate === todayStr && chosenScenarioId) {
      const id = String(chosenScenarioId);
      counts[id] = (counts[id] || 0) + 1;
      todaySelections++;
    }
  }
  
  // Sort by count descending
  const sorted = Object.entries(counts)
    .map(([scenarioId, count]) => ({ scenarioId, count }))
    .sort((a, b) => b.count - a.count);
  
  // Return top scenarios data
  return {
    success: true,
    date: todayStr,
    totalSelections: todaySelections,
    topScenarios: sorted.slice(0, 10) // Return top 10
  };
}

// Optional: Get daily statistics
function getDailyStats() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  const dailyCounts = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = row[1]; // Column B (Date)
    
    if (date) {
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      success: true, 
      dailyStats: dailyCounts 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
