import * as XLSX from 'xlsx';

// Function to load and process Excel data
export const loadTeacherData = async (roomId) => {
  try {
    // Fetch the Excel file for the specific room from the public directory
    const response = await fetch(`/${roomId}.xlsx`);
    if (!response.ok) {
      console.error(`Failed to fetch Excel file for room ${roomId}`);
      throw new Error(`Failed to fetch Excel file for room ${roomId}`);
    }

    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Format the data as HTML with compact styling
    let teacherHTML = "<div class='space-y-2'>";
    jsonData.forEach((teacher) => {
      teacherHTML += `
        <div class='p-2 bg-gray-50 rounded'>
          <h4 class='text-base font-semibold text-blue-600 mb-1'>${teacher.Name}</h4>
          <div class='space-y-0.5 text-sm text-gray-600'>
            <p><span class='font-medium'>Cabin:</span> ${teacher.Cabin}</p>
            <p><span class='font-medium'>Mobile:</span> ${teacher.MobileNo || 'Not Available'}</p>
          </div>
        </div>`;
    });
    teacherHTML += "</div>";

    return teacherHTML;
  } catch (error) {
    console.error('Error loading teacher data:', error);
    return `<p class='text-red-500 text-sm'>Error loading teacher details: ${error.message}</p>`;
  }
};

// Function to get teacher details for a specific room
export async function getTeacherDetails(roomId) {
  try {
    const response = await fetch(`/api/teacher-details?roomId=${roomId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch teacher details');
    }
    let html = await response.text();
    
    // Sanitize HTML by removing html, head, and body tags
    html = html.replace(/<\/?html[^>]*>/g, '')
               .replace(/<\/?head[^>]*>/g, '')
               .replace(/<\/?body[^>]*>/g, '')
               .trim();
    
    return html;
  } catch (error) {
    console.error('Error fetching teacher details:', error);
    throw error;
  }
} 