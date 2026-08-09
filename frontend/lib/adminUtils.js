import * as XLSX from 'xlsx';

export async function getAdminEmails() {
  try {
    const response = await fetch('/AdminUserID.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert the worksheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Extract emails from the 'Email' column
    const adminEmails = data.map(row => row.Email).filter(Boolean);
    
    return adminEmails;
  } catch (error) {
    console.error('Error reading admin emails:', error);
    return [];
  }
}
